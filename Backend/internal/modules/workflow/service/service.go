package service

import (
	"context"
	"strings"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/workflow/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/workflow/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/workflow/repository"
)

// PaymentRecorder — moliya moduli to‘lovni taqsimlash uchun.
type PaymentRecorder interface {
	RecordPayment(ctx context.Context, companyID, source, sourceID string,
		amount float64, referralID, doctorID, registratorID *string,
		patientName, patientPhone, note string, paidAt time.Time) error
}

type Service struct {
	repo    *repository.Repository
	finance PaymentRecorder
}

func NewService(repo *repository.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) SetFinance(rec PaymentRecorder) {
	s.finance = rec
}

func (s *Service) notifyFinance(ctx context.Context, companyID, source, sourceID string,
	amount float64, referralID, doctorID, registratorID *string,
	patientName, patientPhone, note string, paidAt time.Time,
) {
	if s.finance == nil || amount <= 0 {
		return
	}
	_ = s.finance.RecordPayment(ctx, companyID, source, sourceID, amount,
		referralID, doctorID, registratorID, patientName, patientPhone, note, paidAt)
}

func (s *Service) ListDoctors(ctx context.Context, companyID string) ([]dto.DoctorBrief, error) {
	rows, err := s.repo.ListDoctors(ctx, companyID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.DoctorBrief, 0, len(rows))
	for _, d := range rows {
		out = append(out, dto.DoctorBrief{ID: d.ID, Name: d.Name, Specialty: d.Specialty, Phone: d.Phone})
	}
	return out, nil
}

func (s *Service) RegistratorDashboard(ctx context.Context, companyID string) (*dto.DashboardResponse, error) {
	pending, assigned, paid, noShow, todayPaid, err := s.repo.RegistratorSummary(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return &dto.DashboardResponse{
		Pending: pending, Assigned: assigned, Paid: paid, NoShow: noShow, TodayPaid: todayPaid,
	}, nil
}

func (s *Service) DoctorDashboard(ctx context.Context, companyID, doctorID string) (*dto.DashboardResponse, error) {
	myQueue, concluded, noShow, err := s.repo.DoctorSummary(ctx, companyID, doctorID)
	if err != nil {
		return nil, err
	}
	return &dto.DashboardResponse{MyQueue: myQueue, Concluded: concluded, NoShow: noShow}, nil
}

func (s *Service) ListSurveys(ctx context.Context, companyID, doctorID, status string, page, limit int) (*dto.CaseListResult, error) {
	items, total, err := s.repo.ListSurveyCases(ctx, companyID, doctorID, status, page, limit)
	if err != nil {
		return nil, err
	}
	return caseList(items, total, page, limit), nil
}

func (s *Service) ListBookings(ctx context.Context, companyID, doctorID, status string, page, limit int) (*dto.CaseListResult, error) {
	items, total, err := s.repo.ListBookingCases(ctx, companyID, doctorID, status, page, limit)
	if err != nil {
		return nil, err
	}
	return caseList(items, total, page, limit), nil
}

func (s *Service) GetSurvey(ctx context.Context, companyID, id string) (*dto.CaseResponse, error) {
	x, err := s.repo.GetSurveyCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	return toDTO(x), nil
}

func (s *Service) GetBooking(ctx context.Context, companyID, id string) (*dto.CaseResponse, error) {
	x, err := s.repo.GetBookingCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	return toDTO(x), nil
}

// Registrator actions

func (s *Service) AssignSurvey(ctx context.Context, companyID, regID, id string, req dto.AssignRequest) (*dto.CaseResponse, error) {
	item, err := s.repo.GetSurveyCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus == domain.StatusConcluded || item.WorkflowStatus == domain.StatusCancelled {
		return nil, domain.ErrBadState
	}
	ok, err := s.repo.DoctorInCompany(ctx, companyID, req.DoctorID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, domain.ErrInvalidInput
	}
	status := domain.StatusAssigned
	var paidAt *time.Time
	var amount *float64
	note := strings.TrimSpace(req.PaymentNote)
	if req.PaymentAmount != nil && *req.PaymentAmount > 0 {
		status = domain.StatusPaid
		now := time.Now().UTC()
		paidAt = &now
		amount = req.PaymentAmount
	}
	doc := req.DoctorID
	reg := regID
	if err := s.repo.UpdateSurveyWorkflow(ctx, companyID, id, status, &doc, &reg, amount, note, paidAt, "", nil); err != nil {
		return nil, err
	}
	if amount != nil && *amount > 0 && paidAt != nil {
		s.notifyFinance(ctx, companyID, domain.SourceSurvey, id, *amount, nil, &doc, &reg,
			item.PatientName, item.PatientPhone, note, *paidAt)
	}
	return s.GetSurvey(ctx, companyID, id)
}

func (s *Service) PaySurvey(ctx context.Context, companyID, regID, id string, req dto.PaymentRequest) (*dto.CaseResponse, error) {
	item, err := s.repo.GetSurveyCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus == domain.StatusNoShow || item.WorkflowStatus == domain.StatusConcluded || item.WorkflowStatus == domain.StatusCancelled {
		return nil, domain.ErrBadState
	}
	if item.AssignedDoctorID == nil {
		return nil, domain.ErrInvalidInput
	}
	now := time.Now().UTC()
	amt := req.Amount
	reg := regID
	if err := s.repo.UpdateSurveyWorkflow(ctx, companyID, id, domain.StatusPaid, nil, &reg, &amt, strings.TrimSpace(req.Note), &now, "", nil); err != nil {
		return nil, err
	}
	s.notifyFinance(ctx, companyID, domain.SourceSurvey, id, amt, nil, item.AssignedDoctorID, &reg,
		item.PatientName, item.PatientPhone, strings.TrimSpace(req.Note), now)
	return s.GetSurvey(ctx, companyID, id)
}

func (s *Service) NoShowSurveyReg(ctx context.Context, companyID, regID, id string) (*dto.CaseResponse, error) {
	item, err := s.repo.GetSurveyCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus == domain.StatusConcluded {
		return nil, domain.ErrBadState
	}
	reg := regID
	if err := s.repo.UpdateSurveyWorkflow(ctx, companyID, id, domain.StatusNoShow, nil, &reg, nil, "", nil, "", nil); err != nil {
		return nil, err
	}
	return s.GetSurvey(ctx, companyID, id)
}

func (s *Service) AssignBooking(ctx context.Context, companyID, regID, id string, req dto.AssignRequest) (*dto.CaseResponse, error) {
	item, err := s.repo.GetBookingCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus == domain.StatusConcluded || item.WorkflowStatus == domain.StatusCancelled {
		return nil, domain.ErrBadState
	}
	ok, err := s.repo.DoctorInCompany(ctx, companyID, req.DoctorID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, domain.ErrInvalidInput
	}
	status := domain.StatusAssigned
	bookingStatus := "confirmed"
	var paidAt *time.Time
	var amount *float64
	note := strings.TrimSpace(req.PaymentNote)
	if req.PaymentAmount != nil && *req.PaymentAmount > 0 {
		status = domain.StatusPaid
		now := time.Now().UTC()
		paidAt = &now
		amount = req.PaymentAmount
	}
	doc := req.DoctorID
	reg := regID
	if err := s.repo.UpdateBookingWorkflow(ctx, companyID, id, status, bookingStatus, &doc, &reg, amount, note, paidAt, "", nil); err != nil {
		return nil, err
	}
	if amount != nil && *amount > 0 && paidAt != nil {
		s.notifyFinance(ctx, companyID, domain.SourceBooking, id, *amount, item.ReferralID, &doc, &reg,
			item.PatientName, item.PatientPhone, note, *paidAt)
	}
	return s.GetBooking(ctx, companyID, id)
}

func (s *Service) PayBooking(ctx context.Context, companyID, regID, id string, req dto.PaymentRequest) (*dto.CaseResponse, error) {
	item, err := s.repo.GetBookingCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus == domain.StatusNoShow || item.WorkflowStatus == domain.StatusConcluded {
		return nil, domain.ErrBadState
	}
	if item.AssignedDoctorID == nil {
		return nil, domain.ErrInvalidInput
	}
	now := time.Now().UTC()
	amt := req.Amount
	reg := regID
	if err := s.repo.UpdateBookingWorkflow(ctx, companyID, id, domain.StatusPaid, "confirmed", nil, &reg, &amt, strings.TrimSpace(req.Note), &now, "", nil); err != nil {
		return nil, err
	}
	s.notifyFinance(ctx, companyID, domain.SourceBooking, id, amt, item.ReferralID, item.AssignedDoctorID, &reg,
		item.PatientName, item.PatientPhone, strings.TrimSpace(req.Note), now)
	return s.GetBooking(ctx, companyID, id)
}

func (s *Service) NoShowBookingReg(ctx context.Context, companyID, regID, id string) (*dto.CaseResponse, error) {
	item, err := s.repo.GetBookingCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus == domain.StatusConcluded {
		return nil, domain.ErrBadState
	}
	reg := regID
	if err := s.repo.UpdateBookingWorkflow(ctx, companyID, id, domain.StatusNoShow, "no_show", nil, &reg, nil, "", nil, "", nil); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, companyID, id)
}

// Doctor actions

func (s *Service) ensureDoctorOwnsSurvey(ctx context.Context, companyID, doctorID, id string) (*domain.CaseItem, error) {
	item, err := s.repo.GetSurveyCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.AssignedDoctorID == nil || *item.AssignedDoctorID != doctorID {
		return nil, domain.ErrForbidden
	}
	return item, nil
}

func (s *Service) ensureDoctorOwnsBooking(ctx context.Context, companyID, doctorID, id string) (*domain.CaseItem, error) {
	item, err := s.repo.GetBookingCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.AssignedDoctorID == nil || *item.AssignedDoctorID != doctorID {
		return nil, domain.ErrForbidden
	}
	return item, nil
}

func (s *Service) ConcludeSurvey(ctx context.Context, companyID, doctorID, id string, req dto.ConcludeRequest) (*dto.CaseResponse, error) {
	item, err := s.ensureDoctorOwnsSurvey(ctx, companyID, doctorID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus != domain.StatusAssigned && item.WorkflowStatus != domain.StatusPaid {
		return nil, domain.ErrBadState
	}
	now := time.Now().UTC()
	c := strings.TrimSpace(req.Conclusion)
	if err := s.repo.UpdateSurveyWorkflow(ctx, companyID, id, domain.StatusConcluded, nil, nil, nil, "", nil, c, &now); err != nil {
		return nil, err
	}
	return s.GetSurvey(ctx, companyID, id)
}

func (s *Service) CancelSurvey(ctx context.Context, companyID, doctorID, id string) (*dto.CaseResponse, error) {
	item, err := s.ensureDoctorOwnsSurvey(ctx, companyID, doctorID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus != domain.StatusAssigned && item.WorkflowStatus != domain.StatusPaid {
		return nil, domain.ErrBadState
	}
	if err := s.repo.UpdateSurveyWorkflow(ctx, companyID, id, domain.StatusCancelled, nil, nil, nil, "", nil, "", nil); err != nil {
		return nil, err
	}
	return s.GetSurvey(ctx, companyID, id)
}

func (s *Service) DoctorNoShowSurvey(ctx context.Context, companyID, doctorID, id string) (*dto.CaseResponse, error) {
	item, err := s.ensureDoctorOwnsSurvey(ctx, companyID, doctorID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus != domain.StatusAssigned && item.WorkflowStatus != domain.StatusPaid {
		return nil, domain.ErrBadState
	}
	if err := s.repo.UpdateSurveyWorkflow(ctx, companyID, id, domain.StatusDoctorNoShow, nil, nil, nil, "", nil, "", nil); err != nil {
		return nil, err
	}
	return s.GetSurvey(ctx, companyID, id)
}

func (s *Service) ConcludeBooking(ctx context.Context, companyID, doctorID, id string, req dto.ConcludeRequest) (*dto.CaseResponse, error) {
	item, err := s.ensureDoctorOwnsBooking(ctx, companyID, doctorID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus != domain.StatusAssigned && item.WorkflowStatus != domain.StatusPaid {
		return nil, domain.ErrBadState
	}
	now := time.Now().UTC()
	c := strings.TrimSpace(req.Conclusion)
	if err := s.repo.UpdateBookingWorkflow(ctx, companyID, id, domain.StatusConcluded, "completed", nil, nil, nil, "", nil, c, &now); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, companyID, id)
}

func (s *Service) CancelBooking(ctx context.Context, companyID, doctorID, id string) (*dto.CaseResponse, error) {
	item, err := s.ensureDoctorOwnsBooking(ctx, companyID, doctorID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus != domain.StatusAssigned && item.WorkflowStatus != domain.StatusPaid {
		return nil, domain.ErrBadState
	}
	if err := s.repo.UpdateBookingWorkflow(ctx, companyID, id, domain.StatusCancelled, "cancelled", nil, nil, nil, "", nil, "", nil); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, companyID, id)
}

func (s *Service) DoctorNoShowBooking(ctx context.Context, companyID, doctorID, id string) (*dto.CaseResponse, error) {
	item, err := s.ensureDoctorOwnsBooking(ctx, companyID, doctorID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus != domain.StatusAssigned && item.WorkflowStatus != domain.StatusPaid {
		return nil, domain.ErrBadState
	}
	if err := s.repo.UpdateBookingWorkflow(ctx, companyID, id, domain.StatusDoctorNoShow, "no_show", nil, nil, nil, "", nil, "", nil); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, companyID, id)
}

// Company*: kompaniya panelidan to‘liq boshqaruv (ownership cheksiz; registrator_id ixtiyoriy).

func (s *Service) CompanyConcludeSurvey(ctx context.Context, companyID, id string, req dto.ConcludeRequest) (*dto.CaseResponse, error) {
	item, err := s.repo.GetSurveyCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus != domain.StatusAssigned && item.WorkflowStatus != domain.StatusPaid {
		return nil, domain.ErrBadState
	}
	now := time.Now().UTC()
	c := strings.TrimSpace(req.Conclusion)
	if err := s.repo.UpdateSurveyWorkflow(ctx, companyID, id, domain.StatusConcluded, nil, nil, nil, "", nil, c, &now); err != nil {
		return nil, err
	}
	return s.GetSurvey(ctx, companyID, id)
}

func (s *Service) CompanyCancelSurvey(ctx context.Context, companyID, id string) (*dto.CaseResponse, error) {
	item, err := s.repo.GetSurveyCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus != domain.StatusAssigned && item.WorkflowStatus != domain.StatusPaid &&
		item.WorkflowStatus != domain.StatusPending {
		return nil, domain.ErrBadState
	}
	if err := s.repo.UpdateSurveyWorkflow(ctx, companyID, id, domain.StatusCancelled, nil, nil, nil, "", nil, "", nil); err != nil {
		return nil, err
	}
	return s.GetSurvey(ctx, companyID, id)
}

func (s *Service) CompanyDoctorNoShowSurvey(ctx context.Context, companyID, id string) (*dto.CaseResponse, error) {
	item, err := s.repo.GetSurveyCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus != domain.StatusAssigned && item.WorkflowStatus != domain.StatusPaid {
		return nil, domain.ErrBadState
	}
	if err := s.repo.UpdateSurveyWorkflow(ctx, companyID, id, domain.StatusDoctorNoShow, nil, nil, nil, "", nil, "", nil); err != nil {
		return nil, err
	}
	return s.GetSurvey(ctx, companyID, id)
}

func (s *Service) CompanyConcludeBooking(ctx context.Context, companyID, id string, req dto.ConcludeRequest) (*dto.CaseResponse, error) {
	item, err := s.repo.GetBookingCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus != domain.StatusAssigned && item.WorkflowStatus != domain.StatusPaid {
		return nil, domain.ErrBadState
	}
	now := time.Now().UTC()
	c := strings.TrimSpace(req.Conclusion)
	if err := s.repo.UpdateBookingWorkflow(ctx, companyID, id, domain.StatusConcluded, "completed", nil, nil, nil, "", nil, c, &now); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, companyID, id)
}

func (s *Service) CompanyCancelBooking(ctx context.Context, companyID, id string) (*dto.CaseResponse, error) {
	item, err := s.repo.GetBookingCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus != domain.StatusAssigned && item.WorkflowStatus != domain.StatusPaid &&
		item.WorkflowStatus != domain.StatusPending {
		return nil, domain.ErrBadState
	}
	if err := s.repo.UpdateBookingWorkflow(ctx, companyID, id, domain.StatusCancelled, "cancelled", nil, nil, nil, "", nil, "", nil); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, companyID, id)
}

func (s *Service) CompanyDoctorNoShowBooking(ctx context.Context, companyID, id string) (*dto.CaseResponse, error) {
	item, err := s.repo.GetBookingCase(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if item.WorkflowStatus != domain.StatusAssigned && item.WorkflowStatus != domain.StatusPaid {
		return nil, domain.ErrBadState
	}
	if err := s.repo.UpdateBookingWorkflow(ctx, companyID, id, domain.StatusDoctorNoShow, "no_show", nil, nil, nil, "", nil, "", nil); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, companyID, id)
}

func caseList(items []domain.CaseItem, total, page, limit int) *dto.CaseListResult {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	out := make([]dto.CaseResponse, 0, len(items))
	for i := range items {
		out = append(out, *toDTO(&items[i]))
	}
	return &dto.CaseListResult{Data: out, Total: total, Page: page, Limit: limit}
}

func toDTO(x *domain.CaseItem) *dto.CaseResponse {
	out := &dto.CaseResponse{
		ID: x.ID, Source: x.Source, SourceID: x.SourceID, Title: x.Title,
		PatientName: x.PatientName, PatientPhone: x.PatientPhone, Purpose: x.Purpose,
		WorkflowStatus: x.WorkflowStatus, AssignedDoctorID: x.AssignedDoctorID, DoctorName: x.DoctorName,
		RegistratorID: x.RegistratorID, PaymentAmount: x.PaymentAmount, PaymentNote: x.PaymentNote,
		Conclusion: x.Conclusion, Date: x.Date, SlotStart: x.SlotStart, SlotEnd: x.SlotEnd,
		SurveySlug: x.SurveySlug, Answers: x.Answers,
		ReferralID: x.ReferralID, ReferralName: x.ReferralName,
		ReferralPhone: x.ReferralPhone, ReferralSpecialty: x.ReferralSpecialty,
		CreatedAt: x.CreatedAt.UTC().Format(time.RFC3339),
	}
	if x.PaidAt != nil {
		out.PaidAt = x.PaidAt.UTC().Format(time.RFC3339)
	}
	if x.ConcludedAt != nil {
		out.ConcludedAt = x.ConcludedAt.UTC().Format(time.RFC3339)
	}
	if !x.UpdatedAt.IsZero() {
		out.UpdatedAt = x.UpdatedAt.UTC().Format(time.RFC3339)
	}
	return out
}
