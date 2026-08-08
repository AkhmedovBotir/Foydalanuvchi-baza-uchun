package service

import (
	"context"
	"math"
	"strings"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/finance/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/finance/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/finance/repository"
)

type Service struct {
	repo *repository.Repository
}

func NewService(repo *repository.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) RecordPayment(ctx context.Context, companyID, source, sourceID string,
	amount float64, referralID, doctorID, registratorID *string,
	patientName, patientPhone, note string, paidAt time.Time,
) error {
	return s.recordIncome(ctx, domain.IncomeEvent{
		CompanyID: companyID, Source: source, SourceID: sourceID, Amount: amount,
		ReferralID: referralID, DoctorID: doctorID, RegistratorID: registratorID,
		PatientName: patientName, PatientPhone: patientPhone, Note: note, PaidAt: paidAt,
	})
}

func (s *Service) recordIncome(ctx context.Context, ev domain.IncomeEvent) error {
	if ev.Amount <= 0 || ev.CompanyID == "" || ev.SourceID == "" {
		return nil
	}
	exists, err := s.repo.ExistsIncome(ctx, ev.CompanyID, ev.Source, ev.SourceID)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	scheme, err := s.repo.GetActiveScheme(ctx, ev.CompanyID)
	if err != nil {
		if err == domain.ErrNotFound {
			return nil
		}
		return err
	}
	if len(scheme.Lines) == 0 {
		scheme.Lines = legacyToLines(scheme)
	}

	hasRef := ev.ReferralID != nil && *ev.ReferralID != ""
	income := &domain.Income{
		CompanyID: ev.CompanyID, Source: ev.Source, SourceID: ev.SourceID,
		Amount: ev.Amount, HasReferral: hasRef, ReferralID: ev.ReferralID,
		DoctorID: ev.DoctorID, RegistratorID: ev.RegistratorID,
		PatientName: ev.PatientName, PatientPhone: ev.PatientPhone, Note: ev.Note,
		PaidAt: ev.PaidAt,
	}
	sid := scheme.ID
	income.SchemeID = &sid

	if income.DoctorID != nil {
		if n, err := s.repo.DoctorName(ctx, income.CompanyID, *income.DoctorID); err == nil {
			income.DoctorName = n
		}
	}
	if hasRef && income.ReferralID != nil {
		if n, err := s.repo.ReferralName(ctx, income.CompanyID, *income.ReferralID); err == nil {
			income.ReferralName = n
		}
	}

	allocs := s.split(scheme, income)
	return s.repo.CreateIncomeWithAllocations(ctx, income, allocs)
}

func roundMoney(v float64) float64 {
	return math.Round(v*100) / 100
}

func pctOK(sum float64) bool {
	return sum >= 99.99 && sum <= 100.01
}

func (s *Service) split(scheme *domain.Scheme, income *domain.Income) []domain.Allocation {
	out := make([]domain.Allocation, 0, 16)
	lines := scheme.Lines
	if len(lines) == 0 {
		lines = legacyToLines(scheme)
	}

	used := 0.0
	for i, line := range lines {
		if line.Pct <= 0 {
			continue
		}
		// referal ulushi faqat referalli kirimda
		if line.Role == domain.RoleReferral || line.OnlyIfReferral {
			if !income.HasReferral {
				continue
			}
		}
		pool := roundMoney(income.Amount * line.Pct / 100)
		if i == len(lines)-1 {
			// oxirgi qo‘llanadigan qatordan keyin residual qoldiramiz — yig‘indi tekshirmaymiz
		}
		if pool <= 0 {
			continue
		}
		before := len(out)
		s.emitLine(&out, line, pool, income, scheme)
		for j := before; j < len(out); j++ {
			used = roundMoney(used + out[j].Amount)
		}
	}

	residual := roundMoney(income.Amount - used)
	if residual > 0 {
		out = append(out, domain.Allocation{
			Category: domain.CategoryResidual, BeneficiaryType: "company",
			BeneficiaryName: "Qoldiq (referalsiz / rounding)", Amount: residual,
		})
	}
	return out
}

func (s *Service) emitLine(out *[]domain.Allocation, line domain.SchemeLine, pool float64, income *domain.Income, scheme *domain.Scheme) {
	if pool <= 0 {
		return
	}

	switch line.Role {
	case domain.RoleDoctor:
		s.emitDoctor(out, line, pool, income)
		return
	case domain.RoleReferral:
		s.emitReferral(out, line, pool, income)
		return
	case domain.RoleOwner:
		if len(line.Children) > 0 {
			s.emitChildren(out, line.Children, pool, income, scheme)
			return
		}
		// default 50/50 savdo/omonat
		sales := roundMoney(pool * 50 / 100)
		dep := roundMoney(pool - sales)
		if sales > 0 {
			*out = append(*out, domain.Allocation{
				Category: domain.CategoryOwnerSales, BeneficiaryType: "bank",
				BeneficiaryName: "Savdo (bank shot)", Amount: sales,
			})
		}
		if dep > 0 {
			*out = append(*out, domain.Allocation{
				Category: domain.CategoryOwnerDeposit, BeneficiaryType: "deposit",
				BeneficiaryName: "Omonat", Amount: dep,
			})
		}
		return
	}

	if len(line.Children) > 0 {
		s.emitChildren(out, line.Children, pool, income, scheme)
		return
	}

	// Leaf
	*out = append(*out, domain.Allocation{
		Category:        categoryOf(line),
		BeneficiaryType: beneficiaryTypeOf(line),
		BeneficiaryName: lineLabel(line),
		Amount:          pool,
	})
}

func (s *Service) emitChildren(out *[]domain.Allocation, children []domain.SchemeLine, pool float64, income *domain.Income, scheme *domain.Scheme) {
	rem := pool
	active := make([]domain.SchemeLine, 0, len(children))
	for _, c := range children {
		if c.Pct <= 0 {
			continue
		}
		if (c.Role == domain.RoleReferral || c.OnlyIfReferral) && !income.HasReferral {
			continue
		}
		active = append(active, c)
	}
	for i, c := range active {
		var amt float64
		if i == len(active)-1 {
			amt = rem
		} else {
			amt = roundMoney(pool * c.Pct / 100)
			rem = roundMoney(rem - amt)
		}
		if amt <= 0 {
			continue
		}
		// share rollari — alohida
		if c.Role == domain.RoleDoctorShare && c.DoctorID != "" {
			id := c.DoctorID
			name := c.Label
			if name == "" {
				name = "Shifokor"
			}
			*out = append(*out, domain.Allocation{
				Category: domain.CategoryDoctor, BeneficiaryType: "doctor",
				BeneficiaryID: &id, BeneficiaryName: name, Amount: amt,
			})
			continue
		}
		if c.Role == domain.RoleReferralShare && c.ReferralID != "" {
			id := c.ReferralID
			name := c.Label
			if name == "" {
				name = "Referal"
			}
			*out = append(*out, domain.Allocation{
				Category: domain.CategoryReferral, BeneficiaryType: "referral",
				BeneficiaryID: &id, BeneficiaryName: name, Amount: amt,
			})
			continue
		}
		s.emitLine(out, c, amt, income, scheme)
	}
}

func (s *Service) emitDoctor(out *[]domain.Allocation, line domain.SchemeLine, pool float64, income *domain.Income) {
	// Ishlagan shifokor → 100%
	if income.DoctorID != nil && *income.DoctorID != "" {
		id := *income.DoctorID
		name := income.DoctorName
		if name == "" {
			name = "Shifokor"
		}
		*out = append(*out, domain.Allocation{
			Category: domain.CategoryDoctor, BeneficiaryType: "doctor",
			BeneficiaryID: &id, BeneficiaryName: name, Amount: pool,
		})
		return
	}

	shares := doctorShares(line)
	if len(shares) == 0 {
		*out = append(*out, domain.Allocation{
			Category: domain.CategoryDoctor, BeneficiaryType: "pool",
			BeneficiaryName: lineLabel(line), Amount: pool,
		})
		return
	}
	rem := pool
	for i, sh := range shares {
		var amt float64
		if i == len(shares)-1 {
			amt = rem
		} else {
			amt = roundMoney(pool * sh.Pct / 100)
			rem = roundMoney(rem - amt)
		}
		if amt <= 0 {
			continue
		}
		id := sh.DoctorID
		name := sh.Label
		if name == "" {
			name = "Shifokor"
		}
		*out = append(*out, domain.Allocation{
			Category: domain.CategoryDoctor, BeneficiaryType: "doctor",
			BeneficiaryID: &id, BeneficiaryName: name, Amount: amt,
		})
	}
}

func (s *Service) emitReferral(out *[]domain.Allocation, line domain.SchemeLine, pool float64, income *domain.Income) {
	if !income.HasReferral || income.ReferralID == nil {
		return
	}
	// Bron referali → 100% o‘sha referalga (ulushlar faqat fallback)
	id := *income.ReferralID
	name := income.ReferralName
	if name == "" {
		name = lineLabel(line)
	}
	*out = append(*out, domain.Allocation{
		Category: domain.CategoryReferral, BeneficiaryType: "referral",
		BeneficiaryID: &id, BeneficiaryName: name, Amount: pool,
	})
}

type docShare struct {
	DoctorID string
	Label    string
	Pct      float64
}

func doctorShares(line domain.SchemeLine) []docShare {
	out := make([]docShare, 0)
	for _, c := range line.Children {
		if c.Role == domain.RoleDoctorShare || c.DoctorID != "" {
			out = append(out, docShare{DoctorID: c.DoctorID, Label: c.Label, Pct: c.Pct})
		}
	}
	return out
}

func lineLabel(line domain.SchemeLine) string {
	if strings.TrimSpace(line.Label) != "" {
		return strings.TrimSpace(line.Label)
	}
	switch line.Role {
	case domain.RoleWorker:
		return "Ishchi"
	case domain.RoleAds:
		return "Reklama"
	case domain.RoleDoctor:
		return "Shifokor"
	case domain.RoleOwner:
		return "Biznes egasi"
	case domain.RoleReferral:
		return "Referal"
	case domain.RoleOwnerSales:
		return "Savdo (bank shot)"
	case domain.RoleOwnerDeposit:
		return "Omonat"
	default:
		return "Boshqa"
	}
}

func categoryOf(line domain.SchemeLine) string {
	switch line.Role {
	case domain.RoleWorker:
		return domain.CategoryWorker
	case domain.RoleAds:
		return domain.CategoryAds
	case domain.RoleDoctor, domain.RoleDoctorShare:
		return domain.CategoryDoctor
	case domain.RoleOwnerSales:
		return domain.CategoryOwnerSales
	case domain.RoleOwnerDeposit:
		return domain.CategoryOwnerDeposit
	case domain.RoleReferral, domain.RoleReferralShare:
		return domain.CategoryReferral
	case domain.RoleOwner:
		return domain.CategoryOwnerSales
	default:
		return domain.CategoryCustom
	}
}

func beneficiaryTypeOf(line domain.SchemeLine) string {
	switch line.Role {
	case domain.RoleOwnerSales:
		return "bank"
	case domain.RoleOwnerDeposit:
		return "deposit"
	case domain.RoleDoctor, domain.RoleDoctorShare:
		return "doctor"
	case domain.RoleReferral, domain.RoleReferralShare:
		return "referral"
	default:
		return "pool"
	}
}

func legacyToLines(scheme *domain.Scheme) []domain.SchemeLine {
	docChildren := make([]domain.SchemeLine, 0, len(scheme.Doctors))
	for _, d := range scheme.Doctors {
		docChildren = append(docChildren, domain.SchemeLine{
			ID: "doc-" + d.DoctorID, Label: d.DoctorName, Pct: d.Pct,
			Role: domain.RoleDoctorShare, DoctorID: d.DoctorID,
		})
	}
	refChildren := make([]domain.SchemeLine, 0, len(scheme.Referrals))
	for _, r := range scheme.Referrals {
		refChildren = append(refChildren, domain.SchemeLine{
			ID: "ref-" + r.ReferralID, Label: r.ReferralName, Pct: r.Pct,
			Role: domain.RoleReferralShare, ReferralID: r.ReferralID,
		})
	}
	sales, dep := scheme.OwnerSalesPct, scheme.OwnerDepositPct
	if sales+dep < 0.01 {
		sales, dep = 50, 50
	}
	return []domain.SchemeLine{
		{ID: "worker", Label: "Ishchi", Pct: scheme.WorkerPct, Role: domain.RoleWorker},
		{ID: "ads", Label: "Reklama", Pct: scheme.AdsPct, Role: domain.RoleAds},
		{ID: "doctor", Label: "Shifokor", Pct: scheme.DoctorPct, Role: domain.RoleDoctor, Children: docChildren},
		{
			ID: "owner", Label: "Biznes egasi", Pct: scheme.OwnerPct, Role: domain.RoleOwner,
			Children: []domain.SchemeLine{
				{ID: "owner-sales", Label: "Savdo (bank)", Pct: sales, Role: domain.RoleOwnerSales},
				{ID: "owner-deposit", Label: "Omonat", Pct: dep, Role: domain.RoleOwnerDeposit},
			},
		},
		{
			ID: "referral", Label: "Referal", Pct: scheme.ReferralPct, Role: domain.RoleReferral,
			OnlyIfReferral: true, Children: refChildren,
		},
	}
}

// ——— Scheme CRUD ———

func (s *Service) ListSchemes(ctx context.Context, companyID string) ([]dto.SchemeResponse, error) {
	items, err := s.repo.ListSchemes(ctx, companyID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.SchemeResponse, 0, len(items))
	for i := range items {
		full, err := s.repo.GetScheme(ctx, companyID, items[i].ID)
		if err != nil {
			return nil, err
		}
		out = append(out, *schemeDTO(full))
	}
	return out, nil
}

func (s *Service) GetScheme(ctx context.Context, companyID, id string) (*dto.SchemeResponse, error) {
	x, err := s.repo.GetScheme(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	return schemeDTO(x), nil
}

func (s *Service) CreateScheme(ctx context.Context, companyID string, req dto.UpsertSchemeRequest) (*dto.SchemeResponse, error) {
	x, err := s.buildScheme(ctx, companyID, "", req)
	if err != nil {
		return nil, err
	}
	if err := s.repo.CreateScheme(ctx, x); err != nil {
		return nil, err
	}
	return s.GetScheme(ctx, companyID, x.ID)
}

func (s *Service) UpdateScheme(ctx context.Context, companyID, id string, req dto.UpsertSchemeRequest) (*dto.SchemeResponse, error) {
	if _, err := s.repo.GetScheme(ctx, companyID, id); err != nil {
		return nil, err
	}
	x, err := s.buildScheme(ctx, companyID, id, req)
	if err != nil {
		return nil, err
	}
	if err := s.repo.UpdateScheme(ctx, x); err != nil {
		return nil, err
	}
	return s.GetScheme(ctx, companyID, id)
}

func (s *Service) DeleteScheme(ctx context.Context, companyID, id string) error {
	return s.repo.DeleteScheme(ctx, companyID, id)
}

func (s *Service) buildScheme(ctx context.Context, companyID, id string, req dto.UpsertSchemeRequest) (*domain.Scheme, error) {
	name := strings.TrimSpace(req.Name)
	if len(name) < 2 {
		return nil, domain.ErrInvalidInput
	}

	var lines []domain.SchemeLine
	if len(req.Lines) > 0 {
		var err error
		lines, err = s.normalizeLines(ctx, companyID, req.Lines, true)
		if err != nil {
			return nil, err
		}
		var top float64
		for _, l := range lines {
			top += l.Pct
		}
		if !pctOK(top) {
			return nil, domain.ErrBadPct
		}
	} else {
		// legacy path
		top := req.WorkerPct + req.AdsPct + req.DoctorPct + req.OwnerPct + req.ReferralPct
		if !pctOK(top) {
			return nil, domain.ErrBadPct
		}
		sales, dep := req.OwnerSalesPct, req.OwnerDepositPct
		if req.OwnerPct > 0 {
			if !pctOK(sales + dep) {
				return nil, domain.ErrBadPct
			}
		} else if sales == 0 && dep == 0 {
			sales, dep = 50, 50
		}
		tmp := &domain.Scheme{
			WorkerPct: req.WorkerPct, AdsPct: req.AdsPct, DoctorPct: req.DoctorPct,
			OwnerPct: req.OwnerPct, ReferralPct: req.ReferralPct,
			OwnerSalesPct: sales, OwnerDepositPct: dep,
		}
		var docSum float64
		for _, d := range req.Doctors {
			dname, err := s.repo.DoctorName(ctx, companyID, d.DoctorID)
			if err != nil {
				return nil, domain.ErrInvalidInput
			}
			tmp.Doctors = append(tmp.Doctors, domain.SchemeDoctor{DoctorID: d.DoctorID, DoctorName: dname, Pct: d.Pct})
			docSum += d.Pct
		}
		if req.DoctorPct > 0 && len(tmp.Doctors) > 0 && !pctOK(docSum) {
			return nil, domain.ErrBadPct
		}
		var refSum float64
		for _, r := range req.Referrals {
			rname, err := s.repo.ReferralName(ctx, companyID, r.ReferralID)
			if err != nil {
				return nil, domain.ErrInvalidInput
			}
			tmp.Referrals = append(tmp.Referrals, domain.SchemeReferral{ReferralID: r.ReferralID, ReferralName: rname, Pct: r.Pct})
			refSum += r.Pct
		}
		if req.ReferralPct > 0 && len(tmp.Referrals) > 0 && !pctOK(refSum) {
			return nil, domain.ErrBadPct
		}
		lines = legacyToLines(tmp)
	}

	// legacy ustunlar va doctor/referral child jadvallari uchun sinxron
	worker, ads, doctor, owner, referral := 0.0, 0.0, 0.0, 0.0, 0.0
	sales, dep := 50.0, 50.0
	var docs []domain.SchemeDoctor
	var refs []domain.SchemeReferral
	for _, l := range lines {
		switch l.Role {
		case domain.RoleWorker:
			worker = l.Pct
		case domain.RoleAds:
			ads = l.Pct
		case domain.RoleDoctor:
			doctor = l.Pct
			for _, c := range l.Children {
				if c.DoctorID != "" {
					docs = append(docs, domain.SchemeDoctor{DoctorID: c.DoctorID, DoctorName: c.Label, Pct: c.Pct})
				}
			}
		case domain.RoleOwner:
			owner = l.Pct
			var sPct, dPct float64
			for _, c := range l.Children {
				if c.Role == domain.RoleOwnerSales {
					sPct = c.Pct
				}
				if c.Role == domain.RoleOwnerDeposit {
					dPct = c.Pct
				}
			}
			if sPct+dPct > 0 {
				sales, dep = sPct, dPct
			}
		case domain.RoleReferral:
			referral = l.Pct
			for _, c := range l.Children {
				if c.ReferralID != "" {
					refs = append(refs, domain.SchemeReferral{ReferralID: c.ReferralID, ReferralName: c.Label, Pct: c.Pct})
				}
			}
		}
	}
	// custom/top boshqa rollar legacy foizlarga kirmaydi — jami 100 lines da allaqachon

	return &domain.Scheme{
		ID: id, CompanyID: companyID, Name: name, Description: strings.TrimSpace(req.Description),
		WorkerPct: worker, AdsPct: ads, DoctorPct: doctor, OwnerPct: owner, ReferralPct: referral,
		OwnerSalesPct: sales, OwnerDepositPct: dep, IsActive: req.IsActive,
		Lines: lines, Doctors: docs, Referrals: refs,
	}, nil
}

func (s *Service) normalizeLines(ctx context.Context, companyID string, in []dto.SchemeLineInput, topLevel bool) ([]domain.SchemeLine, error) {
	out := make([]domain.SchemeLine, 0, len(in))
	for _, raw := range in {
		label := strings.TrimSpace(raw.Label)
		if label == "" {
			return nil, domain.ErrInvalidInput
		}
		role := strings.TrimSpace(raw.Role)
		if role == "" {
			role = domain.RoleCustom
		}
		id := strings.TrimSpace(raw.ID)
		if id == "" {
			id = "line-" + strings.ToLower(strings.ReplaceAll(label, " ", "-"))
		}
		line := domain.SchemeLine{
			ID: id, Label: label, Pct: raw.Pct, Role: role,
			OnlyIfReferral: raw.OnlyIfReferral || role == domain.RoleReferral,
			DoctorID:       strings.TrimSpace(raw.DoctorID),
			ReferralID:     strings.TrimSpace(raw.ReferralID),
		}
		if line.Role == domain.RoleDoctorShare || line.DoctorID != "" {
			if line.DoctorID == "" {
				return nil, domain.ErrInvalidInput
			}
			n, err := s.repo.DoctorName(ctx, companyID, line.DoctorID)
			if err != nil {
				return nil, domain.ErrInvalidInput
			}
			if line.Label == "" || line.Role == domain.RoleDoctorShare {
				line.Label = n
			}
			line.Role = domain.RoleDoctorShare
		}
		if line.Role == domain.RoleReferralShare || (line.ReferralID != "" && line.Role != domain.RoleReferral) {
			if line.ReferralID == "" {
				return nil, domain.ErrInvalidInput
			}
			n, err := s.repo.ReferralName(ctx, companyID, line.ReferralID)
			if err != nil {
				return nil, domain.ErrInvalidInput
			}
			line.Label = n
			line.Role = domain.RoleReferralShare
		}
		if len(raw.Children) > 0 {
			children, err := s.normalizeLines(ctx, companyID, raw.Children, false)
			if err != nil {
				return nil, err
			}
			// ichki foizlar jami 100 (agar bolalar bor)
			var sum float64
			for _, c := range children {
				sum += c.Pct
			}
			if len(children) > 0 && !pctOK(sum) {
				return nil, domain.ErrBadPct
			}
			line.Children = children
		}
		// referral role always only-if
		if line.Role == domain.RoleReferral {
			line.OnlyIfReferral = true
		}
		_ = topLevel
		out = append(out, line)
	}
	return out, nil
}

func (s *Service) ListIncomes(ctx context.Context, companyID string, dayStr string, page, limit int) (*dto.ListResult[dto.IncomeResponse], error) {
	var day *time.Time
	if dayStr != "" {
		t, err := time.ParseInLocation("2006-01-02", dayStr, time.Local)
		if err != nil {
			return nil, domain.ErrInvalidInput
		}
		day = &t
	}
	items, total, err := s.repo.ListIncomes(ctx, companyID, day, page, limit)
	if err != nil {
		return nil, err
	}
	out := make([]dto.IncomeResponse, 0, len(items))
	for i := range items {
		out = append(out, *incomeDTO(&items[i]))
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	return &dto.ListResult[dto.IncomeResponse]{Data: out, Total: total, Page: page, Limit: limit}, nil
}

func (s *Service) ListAllocations(ctx context.Context, companyID, status, category, dayStr string, page, limit int) (*dto.ListResult[dto.AllocationResponse], error) {
	var day *time.Time
	if dayStr != "" {
		t, err := time.ParseInLocation("2006-01-02", dayStr, time.Local)
		if err != nil {
			return nil, domain.ErrInvalidInput
		}
		day = &t
	}
	items, total, err := s.repo.ListAllocations(ctx, companyID, status, category, day, page, limit)
	if err != nil {
		return nil, err
	}
	out := make([]dto.AllocationResponse, 0, len(items))
	for i := range items {
		out = append(out, *allocDTO(&items[i]))
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	return &dto.ListResult[dto.AllocationResponse]{Data: out, Total: total, Page: page, Limit: limit}, nil
}

func (s *Service) PayAllocation(ctx context.Context, companyID, id string, note string) error {
	return s.repo.PayAllocation(ctx, companyID, id, strings.TrimSpace(note))
}

func (s *Service) PayBatch(ctx context.Context, companyID string, ids []string, note string) (int, error) {
	return s.repo.PayAllocations(ctx, companyID, ids, strings.TrimSpace(note))
}

func (s *Service) Summary(ctx context.Context, companyID string) (*dto.SummaryResponse, error) {
	x, err := s.repo.Summary(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return &dto.SummaryResponse{
		TodayIncome: x.TodayIncome, TodayPending: x.TodayPending, TodayPaidOut: x.TodayPaidOut,
		PendingTotal: x.PendingTotal, PaidOutTotal: x.PaidOutTotal,
		WorkerPending: x.WorkerPending, AdsPending: x.AdsPending, DoctorPending: x.DoctorPending,
		OwnerPending: x.OwnerPending, ReferralPending: x.ReferralPending,
	}, nil
}

func schemeDTO(x *domain.Scheme) *dto.SchemeResponse {
	lines := x.Lines
	if len(lines) == 0 {
		lines = legacyToLines(x)
	}
	docs := make([]dto.SchemeDoctorResponse, 0, len(x.Doctors))
	for _, d := range x.Doctors {
		docs = append(docs, dto.SchemeDoctorResponse{DoctorID: d.DoctorID, DoctorName: d.DoctorName, Pct: d.Pct})
	}
	refs := make([]dto.SchemeReferralResponse, 0, len(x.Referrals))
	for _, r := range x.Referrals {
		refs = append(refs, dto.SchemeReferralResponse{ReferralID: r.ReferralID, ReferralName: r.ReferralName, Pct: r.Pct})
	}
	return &dto.SchemeResponse{
		ID: x.ID, CompanyID: x.CompanyID, Name: x.Name, Description: x.Description,
		Lines: mapLines(lines),
		WorkerPct: x.WorkerPct, AdsPct: x.AdsPct, DoctorPct: x.DoctorPct, OwnerPct: x.OwnerPct,
		ReferralPct: x.ReferralPct, OwnerSalesPct: x.OwnerSalesPct, OwnerDepositPct: x.OwnerDepositPct,
		IsActive: x.IsActive, Doctors: docs, Referrals: refs,
		CreatedAt: x.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt: x.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func mapLines(in []domain.SchemeLine) []dto.SchemeLineResponse {
	out := make([]dto.SchemeLineResponse, 0, len(in))
	for _, l := range in {
		out = append(out, dto.SchemeLineResponse{
			ID: l.ID, Label: l.Label, Pct: l.Pct, Role: l.Role,
			OnlyIfReferral: l.OnlyIfReferral,
			DoctorID:       l.DoctorID, ReferralID: l.ReferralID,
			Children:       mapLines(l.Children),
		})
	}
	return out
}

func incomeDTO(x *domain.Income) *dto.IncomeResponse {
	return &dto.IncomeResponse{
		ID: x.ID, SchemeID: x.SchemeID, SchemeName: x.SchemeName, Source: x.Source, SourceID: x.SourceID,
		Amount: x.Amount, HasReferral: x.HasReferral, ReferralID: x.ReferralID, ReferralName: x.ReferralName,
		DoctorID: x.DoctorID, DoctorName: x.DoctorName, RegistratorID: x.RegistratorID,
		PatientName: x.PatientName, PatientPhone: x.PatientPhone, Note: x.Note,
		PaidAt: x.PaidAt.UTC().Format(time.RFC3339),
		CreatedAt: x.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func allocDTO(x *domain.Allocation) *dto.AllocationResponse {
	out := &dto.AllocationResponse{
		ID: x.ID, IncomeID: x.IncomeID, Category: x.Category, BeneficiaryType: x.BeneficiaryType,
		BeneficiaryID: x.BeneficiaryID, BeneficiaryName: x.BeneficiaryName, Amount: x.Amount,
		Status: x.Status, PayoutNote: x.PayoutNote, PatientName: x.PatientName, Source: x.Source,
		IncomeAmount: x.IncomeAmount,
		CreatedAt:    x.CreatedAt.UTC().Format(time.RFC3339),
	}
	if x.PaidOutAt != nil {
		out.PaidOutAt = x.PaidOutAt.UTC().Format(time.RFC3339)
	}
	if !x.PaidAt.IsZero() {
		out.PaidAt = x.PaidAt.UTC().Format(time.RFC3339)
	}
	return out
}
