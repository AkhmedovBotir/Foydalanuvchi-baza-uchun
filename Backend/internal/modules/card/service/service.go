package service

import (
	"context"
	"fmt"
	"image"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/render"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/repository"
	settingService "github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/service"
	"github.com/google/uuid"
)

type Service struct {
	repo     *repository.Repository
	settings *settingService.SettingService
	dataDir  string
}

func NewService(repo *repository.Repository, settings *settingService.SettingService, uploadDir string) *Service {
	return &Service{
		repo:     repo,
		settings: settings,
		dataDir:  filepath.Join(uploadDir, "cards"),
	}
}

func (s *Service) EnsureDirs() error {
	return os.MkdirAll(s.dataDir, 0o755)
}

// ===== Templates (admin) =====

func (s *Service) CreateTemplate(ctx context.Context, name string, imageData []byte, qx, qy, qw, qh int, fields []domain.TextField) (*dto.CardTemplateResponse, error) {
	if len(imageData) == 0 {
		return nil, domain.ErrInvalidInput
	}
	if len(imageData) > domain.MaxImageBytes {
		return nil, domain.ErrImageTooLarge
	}
	img, ct, err := render.DecodeImageBytes(imageData)
	if err != nil {
		return nil, domain.ErrBadImage
	}
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if err := validateQR(w, h, qx, qy, qw, qh); err != nil {
		return nil, err
	}
	fields = normalizeFields(fields, w, h)

	id := uuid.NewString()
	path, err := s.saveImage(id, "template", imageData, ct)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	t := &domain.CardTemplate{
		ID: id, Name: strings.TrimSpace(name), ImagePath: path,
		ImageWidth: w, ImageHeight: h, ImageContentType: ct,
		QRX: qx, QRY: qy, QRWidth: qw, QRHeight: qh,
		TextFields: fields, CreatedAt: now, UpdatedAt: now,
	}
	if t.Name == "" {
		t.Name = "Shablon"
	}
	if err := s.repo.CreateTemplate(ctx, t); err != nil {
		_ = os.Remove(path)
		return nil, err
	}
	return s.templateDTO(t), nil
}

func (s *Service) ListTemplates(ctx context.Context) ([]dto.CardTemplateResponse, error) {
	items, err := s.repo.ListTemplates(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]dto.CardTemplateResponse, 0, len(items))
	for i := range items {
		out = append(out, *s.templateDTO(&items[i]))
	}
	return out, nil
}

func (s *Service) GetTemplate(ctx context.Context, id string) (*dto.CardTemplateResponse, error) {
	t, err := s.repo.GetTemplate(ctx, id)
	if err != nil {
		return nil, err
	}
	return s.templateDTO(t), nil
}

func (s *Service) UpdateTemplate(ctx context.Context, id string, req dto.UpdateTemplateRequest) (*dto.CardTemplateResponse, error) {
	t, err := s.repo.GetTemplate(ctx, id)
	if err != nil {
		return nil, err
	}
	if req.Name != nil {
		t.Name = strings.TrimSpace(*req.Name)
	}
	if req.QRX != nil {
		t.QRX = *req.QRX
	}
	if req.QRY != nil {
		t.QRY = *req.QRY
	}
	if req.QRWidth != nil {
		t.QRWidth = *req.QRWidth
	}
	if req.QRHeight != nil {
		t.QRHeight = *req.QRHeight
	}
	if req.TextFields != nil {
		t.TextFields = normalizeFields(req.TextFields, t.ImageWidth, t.ImageHeight)
	}
	if err := validateQR(t.ImageWidth, t.ImageHeight, t.QRX, t.QRY, t.QRWidth, t.QRHeight); err != nil {
		return nil, err
	}
	t.UpdatedAt = time.Now().UTC()
	if err := s.repo.UpdateTemplate(ctx, t); err != nil {
		return nil, err
	}
	return s.templateDTO(t), nil
}

func (s *Service) DeleteTemplate(ctx context.Context, id string) error {
	t, err := s.repo.GetTemplate(ctx, id)
	if err != nil {
		return err
	}
	if err := s.repo.DeleteTemplate(ctx, id); err != nil {
		return err
	}
	_ = os.Remove(t.ImagePath)
	return nil
}

func (s *Service) TemplateImagePath(ctx context.Context, id string) (string, string, error) {
	t, err := s.repo.GetTemplate(ctx, id)
	if err != nil {
		return "", "", err
	}
	return t.ImagePath, t.ImageContentType, nil
}

// ===== Company cards =====

func (s *Service) CreateFromTemplate(ctx context.Context, companyID string, req dto.CreateFromTemplateRequest) (*dto.CompanyCardResponse, error) {
	t, err := s.repo.GetTemplate(ctx, req.TemplateID)
	if err != nil {
		return nil, err
	}
	// copy image file
	id := uuid.NewString()
	ext := filepath.Ext(t.ImagePath)
	if ext == "" {
		ext = ".png"
	}
	dir := filepath.Join(s.dataDir, id)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	dstPath := filepath.Join(dir, "card"+ext)
	if err := copyFile(t.ImagePath, dstPath); err != nil {
		_ = os.RemoveAll(dir)
		return nil, err
	}

	fields := t.TextFields
	if req.TextFields != nil {
		fields = mergeFields(t.TextFields, req.TextFields)
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = t.Name
	}
	now := time.Now().UTC()
	tplID := t.ID
	c := &domain.CompanyCard{
		ID: id, CompanyID: companyID, TemplateID: &tplID, Source: domain.SourceTemplate,
		Name: name, ImagePath: dstPath, ImageWidth: t.ImageWidth, ImageHeight: t.ImageHeight,
		ImageContentType: t.ImageContentType,
		QRX: t.QRX, QRY: t.QRY, QRWidth: t.QRWidth, QRHeight: t.QRHeight,
		TextFields: fields, MarginMM: domain.DefaultMarginMM, GapMM: domain.DefaultGapMM,
		CreatedAt: now, UpdatedAt: now,
	}
	if err := s.repo.CreateCard(ctx, c); err != nil {
		_ = os.RemoveAll(dir)
		return nil, err
	}
	return s.cardDTO(ctx, c)
}

func (s *Service) CreateCustom(ctx context.Context, companyID, name string, imageData []byte, qx, qy, qw, qh int, fields []domain.TextField) (*dto.CompanyCardResponse, error) {
	if len(imageData) == 0 {
		return nil, domain.ErrInvalidInput
	}
	if len(imageData) > domain.MaxImageBytes {
		return nil, domain.ErrImageTooLarge
	}
	img, ct, err := render.DecodeImageBytes(imageData)
	if err != nil {
		return nil, domain.ErrBadImage
	}
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if err := validateQR(w, h, qx, qy, qw, qh); err != nil {
		return nil, err
	}
	fields = normalizeFields(fields, w, h)
	id := uuid.NewString()
	path, err := s.saveImage(id, "card", imageData, ct)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	nm := strings.TrimSpace(name)
	if nm == "" {
		nm = "Mening vizitkam"
	}
	c := &domain.CompanyCard{
		ID: id, CompanyID: companyID, Source: domain.SourceCustom, Name: nm,
		ImagePath: path, ImageWidth: w, ImageHeight: h, ImageContentType: ct,
		QRX: qx, QRY: qy, QRWidth: qw, QRHeight: qh, TextFields: fields,
		MarginMM: domain.DefaultMarginMM, GapMM: domain.DefaultGapMM,
		CreatedAt: now, UpdatedAt: now,
	}
	if err := s.repo.CreateCard(ctx, c); err != nil {
		_ = os.Remove(path)
		return nil, err
	}
	return s.cardDTO(ctx, c)
}

func (s *Service) ListCards(ctx context.Context, companyID string) ([]dto.CompanyCardResponse, error) {
	items, err := s.repo.ListCards(ctx, companyID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.CompanyCardResponse, 0, len(items))
	for i := range items {
		d, err := s.cardDTO(ctx, &items[i])
		if err != nil {
			return nil, err
		}
		out = append(out, *d)
	}
	return out, nil
}

func (s *Service) GetCard(ctx context.Context, companyID, id string) (*dto.CompanyCardResponse, error) {
	c, err := s.repo.GetCard(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	return s.cardDTO(ctx, c)
}

func (s *Service) UpdateCard(ctx context.Context, companyID, id string, req dto.UpdateCompanyCardRequest) (*dto.CompanyCardResponse, error) {
	c, err := s.repo.GetCard(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if req.Name != nil {
		c.Name = strings.TrimSpace(*req.Name)
	}
	if req.QRX != nil {
		c.QRX = *req.QRX
	}
	if req.QRY != nil {
		c.QRY = *req.QRY
	}
	if req.QRWidth != nil {
		c.QRWidth = *req.QRWidth
	}
	if req.QRHeight != nil {
		c.QRHeight = *req.QRHeight
	}
	if req.TextFields != nil {
		c.TextFields = normalizeFields(req.TextFields, c.ImageWidth, c.ImageHeight)
	}
	if req.Orientation != nil {
		o := strings.TrimSpace(*req.Orientation)
		if o != "" && o != domain.OrientationPortrait && o != domain.OrientationLandscape {
			return nil, domain.ErrInvalidInput
		}
		c.Orientation = o
	}
	if req.Cols != nil {
		if *req.Cols < 0 || *req.Cols > domain.MaxCols {
			return nil, domain.ErrInvalidInput
		}
		c.Cols = *req.Cols
	}
	if req.Rows != nil {
		if *req.Rows < 0 || *req.Rows > domain.MaxRows {
			return nil, domain.ErrInvalidInput
		}
		c.Rows = *req.Rows
	}
	if err := validateQR(c.ImageWidth, c.ImageHeight, c.QRX, c.QRY, c.QRWidth, c.QRHeight); err != nil {
		return nil, err
	}
	c.UpdatedAt = time.Now().UTC()
	if err := s.repo.UpdateCard(ctx, c); err != nil {
		return nil, err
	}
	return s.cardDTO(ctx, c)
}

func (s *Service) DeleteCard(ctx context.Context, companyID, id string) error {
	c, err := s.repo.GetCard(ctx, companyID, id)
	if err != nil {
		return err
	}
	if err := s.repo.DeleteCard(ctx, companyID, id); err != nil {
		return err
	}
	_ = os.RemoveAll(filepath.Dir(c.ImagePath))
	return nil
}

func (s *Service) CardImagePath(ctx context.Context, companyID, id string) (string, string, error) {
	c, err := s.repo.GetCard(ctx, companyID, id)
	if err != nil {
		return "", "", err
	}
	return c.ImagePath, c.ImageContentType, nil
}

func (s *Service) PreviewPNG(ctx context.Context, companyID, id string) ([]byte, error) {
	c, err := s.repo.GetCard(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	qrURL, _ := s.cardQRContent(ctx, companyID, id)
	tpl, err := render.LoadImage(c.ImagePath)
	if err != nil {
		return nil, err
	}
	qrRect := image.Rect(c.QRX, c.QRY, c.QRX+c.QRWidth, c.QRY+c.QRHeight)
	img, err := render.CompositeCard(tpl, c.TextFields, qrRect, qrURL)
	if err != nil {
		return nil, err
	}
	return render.EncodePNG(img)
}

func (s *Service) QRPNG(ctx context.Context, companyID, id string) ([]byte, error) {
	content, err := s.cardQRContent(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if content == "" {
		return nil, domain.ErrNoSurveyURL
	}
	img, err := render.GenerateQR(content, 512)
	if err != nil {
		return nil, err
	}
	return render.EncodePNG(img)
}

func (s *Service) Layout(ctx context.Context, companyID, id string) (*domain.Layout, error) {
	c, err := s.repo.GetCard(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	layout, err := render.ComputeLayout(*c)
	if err != nil {
		return nil, err
	}
	layout.Copies = layout.PerPage
	layout.PagesNeeded = 1
	return &layout, nil
}

func (s *Service) PDF(ctx context.Context, companyID, id string, copies int) ([]byte, error) {
	c, err := s.repo.GetCard(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	content, err := s.cardQRContent(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if content == "" {
		return nil, domain.ErrNoSurveyURL
	}
	if copies < 1 {
		layout, lerr := render.ComputeLayout(*c)
		if lerr == nil {
			copies = layout.PerPage
		} else {
			copies = 1
		}
	}
	return render.BuildPDF(*c, content, copies)
}

func (s *Service) AttachToSurvey(ctx context.Context, companyID, surveyRef, cardID string) (*dto.CompanyCardResponse, error) {
	if _, err := s.repo.AttachCard(ctx, companyID, surveyRef, cardID); err != nil {
		return nil, err
	}
	return s.GetCard(ctx, companyID, cardID)
}

func (s *Service) DetachFromSurvey(ctx context.Context, companyID, surveyRef string) error {
	return s.repo.DetachCard(ctx, companyID, surveyRef)
}

func (s *Service) BriefForSurvey(ctx context.Context, companyID, surveyRef string) (*dto.CardBrief, error) {
	cardID, survey, err := s.repo.SurveyCardID(ctx, companyID, surveyRef)
	if err != nil {
		return nil, err
	}
	if cardID == nil {
		return nil, nil
	}
	c, err := s.repo.GetCard(ctx, companyID, *cardID)
	if err != nil {
		return nil, err
	}
	base, _ := s.settings.GetSurveyLinkBaseURL(ctx)
	respURL := strings.TrimRight(base, "/") + "/surveys/" + survey.Slug
	return &dto.CardBrief{
		ID: c.ID, Name: c.Name, Source: c.Source,
		ImageURL:    "/api/v1/company/cards/" + c.ID + "/image",
		PreviewURL:  "/api/v1/company/cards/" + c.ID + "/preview",
		QRURL:       "/api/v1/company/cards/" + c.ID + "/qr",
		ResponseURL: respURL,
	}, nil
}

func (s *Service) cardQRContent(ctx context.Context, companyID, cardID string) (string, error) {
	base, err := s.settings.GetSurveyLinkBaseURL(ctx)
	if err != nil {
		return "", err
	}
	base = strings.TrimRight(base, "/")

	// Survey biriktirilgan bo‘lsa — so‘rovnoma URL
	link, err := s.repo.SurveyByCard(ctx, companyID, cardID)
	if err != nil {
		return "", err
	}
	if link != nil {
		return base + "/surveys/" + link.Slug, nil
	}

	// Referal vizitkasi — qabul + ref query
	ref, err := s.repo.ReferralByCard(ctx, companyID, cardID)
	if err != nil {
		return "", err
	}
	if ref != nil && ref.ServiceSlug != "" {
		return base + "/book/" + ref.ServiceSlug + "?ref=" + ref.ReferralID, nil
	}

	// Aks holda qabul (appointment) URL
	appt, err := s.repo.AppointmentByCard(ctx, companyID, cardID)
	if err != nil {
		return "", err
	}
	if appt != nil {
		return base + "/book/" + appt.Slug, nil
	}
	return "", nil
}

func (s *Service) templateDTO(t *domain.CardTemplate) *dto.CardTemplateResponse {
	return &dto.CardTemplateResponse{
		ID: t.ID, Name: t.Name,
		ImageURL: "/api/v1/card-templates/" + t.ID + "/image",
		ImageWidth: t.ImageWidth, ImageHeight: t.ImageHeight, ImageContentType: t.ImageContentType,
		QRX: t.QRX, QRY: t.QRY, QRWidth: t.QRWidth, QRHeight: t.QRHeight,
		TextFields: t.TextFields,
		CreatedAt:  t.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:  t.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func (s *Service) cardDTO(ctx context.Context, c *domain.CompanyCard) (*dto.CompanyCardResponse, error) {
	out := &dto.CompanyCardResponse{
		ID: c.ID, CompanyID: c.CompanyID, TemplateID: c.TemplateID, Source: c.Source, Name: c.Name,
		ImageURL: "/api/v1/company/cards/" + c.ID + "/image",
		ImageWidth: c.ImageWidth, ImageHeight: c.ImageHeight, ImageContentType: c.ImageContentType,
		QRX: c.QRX, QRY: c.QRY, QRWidth: c.QRWidth, QRHeight: c.QRHeight,
		TextFields: c.TextFields, Orientation: c.Orientation, Cols: c.Cols, Rows: c.Rows,
		MarginMM: c.MarginMM, GapMM: c.GapMM,
		CreatedAt: c.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt: c.UpdatedAt.UTC().Format(time.RFC3339),
	}
	link, err := s.repo.SurveyByCard(ctx, c.CompanyID, c.ID)
	if err != nil {
		return nil, err
	}
	base, _ := s.settings.GetSurveyLinkBaseURL(ctx)
	base = strings.TrimRight(base, "/")
	if link != nil {
		out.SurveyID = &link.SurveyID
		out.SurveySlug = link.Slug
		out.SurveyTitle = link.Title
		out.ResponseURL = base + "/surveys/" + link.Slug
	}
	ref, err := s.repo.ReferralByCard(ctx, c.CompanyID, c.ID)
	if err != nil {
		return nil, err
	}
	if ref != nil && ref.ServiceSlug != "" {
		rid := ref.ReferralID
		out.ReferralID = &rid
		out.ReferralName = ref.ReferralName
		out.BookingURL = base + "/book/" + ref.ServiceSlug + "?ref=" + ref.ReferralID
		return out, nil
	}
	appt, err := s.repo.AppointmentByCard(ctx, c.CompanyID, c.ID)
	if err != nil {
		return nil, err
	}
	if appt != nil {
		out.AppointmentID = &appt.ServiceID
		out.AppointmentSlug = appt.Slug
		out.AppointmentTitle = appt.Title
		out.BookingURL = base + "/book/" + appt.Slug
	}
	return out, nil
}

func (s *Service) saveImage(id, name string, data []byte, ct string) (string, error) {
	ext := ".png"
	if ct == "image/jpeg" {
		ext = ".jpg"
	}
	dir := filepath.Join(s.dataDir, id)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	path := filepath.Join(dir, name+ext)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		_ = os.RemoveAll(dir)
		return "", err
	}
	return path, nil
}

func validateQR(imgW, imgH, x, y, w, h int) error {
	if w < 8 || h < 8 || x < 0 || y < 0 {
		return fmt.Errorf("%w: QR o'lchami kamida 8×8 px", domain.ErrInvalidInput)
	}
	if x+w > imgW || y+h > imgH {
		return fmt.Errorf("%w: QR rasm chegarasidan chiqib ketgan", domain.ErrInvalidInput)
	}
	return nil
}

func normalizeFields(fields []domain.TextField, imgW, imgH int) []domain.TextField {
	out := make([]domain.TextField, 0, len(fields))
	for _, f := range fields {
		if f.Width < 1 || f.Height < 1 {
			continue
		}
		if f.ID == "" {
			f.ID = uuid.NewString()
		}
		if f.FontSize <= 0 {
			f.FontSize = 16
		}
		if f.FontFamily == "" {
			f.FontFamily = "Arial"
		}
		if f.Color == "" {
			f.Color = "#111827"
		}
		if f.Align == "" {
			f.Align = "left"
		}
		if f.X < 0 {
			f.X = 0
		}
		if f.Y < 0 {
			f.Y = 0
		}
		if f.X+f.Width > imgW {
			f.Width = imgW - f.X
		}
		if f.Y+f.Height > imgH {
			f.Height = imgH - f.Y
		}
		if f.Width < 1 || f.Height < 1 {
			continue
		}
		out = append(out, f)
	}
	return out
}

func mergeFields(base, overrides []domain.TextField) []domain.TextField {
	byID := map[string]domain.TextField{}
	for _, f := range overrides {
		byID[f.ID] = f
	}
	out := make([]domain.TextField, 0, len(base))
	for _, f := range base {
		if o, ok := byID[f.ID]; ok {
			// joylashuv template dan; matn/uslub override
			f.Text = o.Text
			if o.FontSize > 0 {
				f.FontSize = o.FontSize
			}
			if o.FontFamily != "" {
				f.FontFamily = o.FontFamily
			}
			if o.Color != "" {
				f.Color = o.Color
			}
			f.Bold = o.Bold
			if o.Align != "" {
				f.Align = o.Align
			}
			if o.Label != "" {
				f.Label = o.Label
			}
		}
		out = append(out, f)
	}
	// yangi maydonlar (company custom zones) ham qo'shilishi mumkin
	seen := map[string]bool{}
	for _, f := range out {
		seen[f.ID] = true
	}
	for _, o := range overrides {
		if !seen[o.ID] {
			out = append(out, o)
		}
	}
	return out
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}
