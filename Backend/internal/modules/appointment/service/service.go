package service

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/appointment/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/appointment/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/appointment/repository"
	settingService "github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/service"
	"github.com/google/uuid"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var timePattern = regexp.MustCompile(`^\d{2}:\d{2}$`)

type Service struct {
	repo     *repository.Repository
	settings *settingService.SettingService
}

func NewService(repo *repository.Repository, settings *settingService.SettingService) *Service {
	return &Service{repo: repo, settings: settings}
}

func (s *Service) Create(ctx context.Context, companyID string, req dto.UpsertServiceRequest) (*dto.ServiceResponse, error) {
	if err := validateUpsert(req); err != nil {
		return nil, err
	}
	exists, err := s.repo.SlugExists(ctx, req.Slug, "")
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("%w: slug band", domain.ErrInvalidInput)
	}
	now := time.Now().UTC()
	maxAhead := req.MaxDaysAhead
	if maxAhead < 1 {
		maxAhead = 30
	}
	svc := &domain.Service{
		ID: uuid.NewString(), CompanyID: companyID,
		Slug: strings.ToLower(strings.TrimSpace(req.Slug)),
		Title: strings.TrimSpace(req.Title), Description: strings.TrimSpace(req.Description),
		Status: domain.StatusDraft, SlotIntervalMinutes: req.SlotIntervalMinutes,
		Schedule: normalizeSchedule(req.Schedule), MaxDaysAhead: maxAhead,
		CreatedAt: now, UpdatedAt: now,
	}
	if err := s.repo.CreateService(ctx, svc); err != nil {
		return nil, err
	}
	return s.toServiceDTO(ctx, svc)
}

func (s *Service) Update(ctx context.Context, companyID, ref string, req dto.UpsertServiceRequest) (*dto.ServiceResponse, error) {
	svc, err := s.repo.GetService(ctx, companyID, ref)
	if err != nil {
		return nil, err
	}
	if svc.Status == domain.StatusClosed {
		return nil, domain.ErrInvalidInput
	}
	if err := validateUpsert(req); err != nil {
		return nil, err
	}
	slug := strings.ToLower(strings.TrimSpace(req.Slug))
	exists, err := s.repo.SlugExists(ctx, slug, svc.ID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("%w: slug band", domain.ErrInvalidInput)
	}
	svc.Slug = slug
	svc.Title = strings.TrimSpace(req.Title)
	svc.Description = strings.TrimSpace(req.Description)
	svc.SlotIntervalMinutes = req.SlotIntervalMinutes
	svc.Schedule = normalizeSchedule(req.Schedule)
	if req.MaxDaysAhead >= 1 {
		svc.MaxDaysAhead = req.MaxDaysAhead
	}
	svc.UpdatedAt = time.Now().UTC()
	if err := s.repo.UpdateService(ctx, svc); err != nil {
		return nil, err
	}
	return s.toServiceDTO(ctx, svc)
}

func (s *Service) List(ctx context.Context, companyID string) ([]dto.ServiceResponse, error) {
	items, err := s.repo.ListServices(ctx, companyID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ServiceResponse, 0, len(items))
	for i := range items {
		d, err := s.toServiceDTO(ctx, &items[i])
		if err != nil {
			return nil, err
		}
		out = append(out, *d)
	}
	return out, nil
}

func (s *Service) Get(ctx context.Context, companyID, ref string) (*dto.ServiceResponse, error) {
	svc, err := s.repo.GetService(ctx, companyID, ref)
	if err != nil {
		return nil, err
	}
	return s.toServiceDTO(ctx, svc)
}

func (s *Service) Delete(ctx context.Context, companyID, ref string) error {
	svc, err := s.repo.GetService(ctx, companyID, ref)
	if err != nil {
		return err
	}
	return s.repo.DeleteService(ctx, companyID, svc.ID)
}

func (s *Service) Publish(ctx context.Context, companyID, ref string) (*dto.ServiceResponse, error) {
	svc, err := s.repo.GetService(ctx, companyID, ref)
	if err != nil {
		return nil, err
	}
	if svc.Status != domain.StatusDraft {
		return nil, domain.ErrNotDraft
	}
	if !hasEnabledDay(svc.Schedule) {
		return nil, fmt.Errorf("%w: kamida 1 ish kuni kerak", domain.ErrInvalidInput)
	}
	now := time.Now().UTC()
	svc.Status = domain.StatusPublished
	svc.PublishedAt = &now
	svc.UpdatedAt = now
	if err := s.repo.UpdateService(ctx, svc); err != nil {
		return nil, err
	}
	return s.toServiceDTO(ctx, svc)
}

func (s *Service) Close(ctx context.Context, companyID, ref string) (*dto.ServiceResponse, error) {
	svc, err := s.repo.GetService(ctx, companyID, ref)
	if err != nil {
		return nil, err
	}
	if svc.Status != domain.StatusPublished {
		return nil, domain.ErrNotOpen
	}
	now := time.Now().UTC()
	svc.Status = domain.StatusClosed
	svc.ClosedAt = &now
	svc.UpdatedAt = now
	if err := s.repo.UpdateService(ctx, svc); err != nil {
		return nil, err
	}
	return s.toServiceDTO(ctx, svc)
}

func (s *Service) AttachCard(ctx context.Context, companyID, ref, cardID string) (*dto.ServiceResponse, error) {
	svc, err := s.repo.GetService(ctx, companyID, ref)
	if err != nil {
		return nil, err
	}
	id := strings.TrimSpace(cardID)
	if id == "" {
		return nil, domain.ErrInvalidInput
	}
	ok, err := s.repo.CardBelongsToCompany(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, fmt.Errorf("%w: vizitka topilmadi", domain.ErrInvalidInput)
	}
	svc.CardID = &id
	svc.UpdatedAt = time.Now().UTC()
	if err := s.repo.UpdateService(ctx, svc); err != nil {
		return nil, err
	}
	return s.toServiceDTO(ctx, svc)
}

func (s *Service) DetachCard(ctx context.Context, companyID, ref string) (*dto.ServiceResponse, error) {
	svc, err := s.repo.GetService(ctx, companyID, ref)
	if err != nil {
		return nil, err
	}
	svc.CardID = nil
	svc.UpdatedAt = time.Now().UTC()
	if err := s.repo.UpdateService(ctx, svc); err != nil {
		return nil, err
	}
	return s.toServiceDTO(ctx, svc)
}

// Public

func (s *Service) PublicGet(ctx context.Context, slug string) (*dto.PublicServiceResponse, error) {
	svc, err := s.repo.GetServicePublic(ctx, slug)
	if err != nil {
		return nil, err
	}
	if svc.Status == domain.StatusDraft {
		return nil, domain.ErrNotFound
	}
	return &dto.PublicServiceResponse{
		ID: svc.ID, Slug: svc.Slug, Title: svc.Title, Description: svc.Description,
		Status: svc.Status, SlotIntervalMinutes: svc.SlotIntervalMinutes,
		Schedule: svc.Schedule, MaxDaysAhead: svc.MaxDaysAhead,
	}, nil
}

func (s *Service) AvailableDays(ctx context.Context, slug string, from, to time.Time) ([]dto.DayAvailability, error) {
	svc, err := s.repo.GetServicePublic(ctx, slug)
	if err != nil {
		return nil, err
	}
	if svc.Status != domain.StatusPublished {
		return nil, domain.ErrNotPublished
	}
	today := time.Now().In(time.Local).Truncate(24 * time.Hour)
	max := today.AddDate(0, 0, svc.MaxDaysAhead)
	if from.Before(today) {
		from = today
	}
	if to.After(max) {
		to = max
	}
	if to.Before(from) {
		return []dto.DayAvailability{}, nil
	}

	out := make([]dto.DayAvailability, 0)
	for d := from; !d.After(to); d = d.AddDate(0, 0, 1) {
		wd := isoWeekday(d)
		day := dayFor(svc.Schedule, wd)
		item := dto.DayAvailability{
			Date: d.Format("2006-01-02"), Weekday: wd, Open: day != nil && day.Enabled,
		}
		if item.Open {
			slots, _, err := s.generateSlots(ctx, svc, d)
			if err != nil {
				return nil, err
			}
			item.TotalSlots = len(slots)
			for _, sl := range slots {
				if sl.Available {
					item.FreeSlots++
				}
			}
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *Service) AvailableSlots(ctx context.Context, slug, dateStr string) ([]dto.SlotItem, error) {
	svc, err := s.repo.GetServicePublic(ctx, slug)
	if err != nil {
		return nil, err
	}
	if svc.Status != domain.StatusPublished {
		return nil, domain.ErrNotPublished
	}
	date, err := time.ParseInLocation("2006-01-02", dateStr, time.Local)
	if err != nil {
		return nil, domain.ErrInvalidInput
	}
	today := time.Now().In(time.Local).Truncate(24 * time.Hour)
	if date.Before(today) || date.After(today.AddDate(0, 0, svc.MaxDaysAhead)) {
		return nil, domain.ErrSlotClosed
	}
	slots, _, err := s.generateSlots(ctx, svc, date)
	return slots, err
}

func (s *Service) CreateBooking(ctx context.Context, slug string, req dto.CreateBookingRequest) (*dto.BookingResponse, error) {
	svc, err := s.repo.GetServicePublic(ctx, slug)
	if err != nil {
		return nil, err
	}
	if svc.Status != domain.StatusPublished {
		return nil, domain.ErrNotPublished
	}
	name := strings.TrimSpace(req.Name)
	phone := strings.TrimSpace(req.Phone)
	if len(name) < 2 || len(phone) < 9 {
		return nil, domain.ErrInvalidInput
	}
	date, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(req.Date), time.Local)
	if err != nil {
		return nil, domain.ErrInvalidInput
	}
	slotStart := normalizeHHMM(req.SlotStart)
	slots, day, err := s.generateSlots(ctx, svc, date)
	if err != nil {
		return nil, err
	}
	if day == nil || !day.Enabled {
		return nil, domain.ErrSlotClosed
	}
	var slotEnd string
	ok := false
	for _, sl := range slots {
		if sl.Start == slotStart && sl.Available {
			slotEnd = sl.End
			ok = true
			break
		}
	}
	if !ok {
		return nil, domain.ErrSlotTaken
	}

	// pass-now check for today
	now := time.Now().In(time.Local)
	if sameDate(date, now) {
		if slotToMinutes(slotStart) <= now.Hour()*60+now.Minute() {
			return nil, domain.ErrSlotClosed
		}
	}

	nowUTC := time.Now().UTC()
	b := &domain.Booking{
		ID: uuid.NewString(), ServiceID: svc.ID, CompanyID: svc.CompanyID,
		BookingDate: date, SlotStart: slotStart, SlotEnd: slotEnd,
		RespondentName: name, RespondentPhone: phone,
		Purpose: strings.TrimSpace(req.Purpose), Status: domain.BookingPending,
		CreatedAt: nowUTC, UpdatedAt: nowUTC,
	}
	if err := s.repo.CreateBooking(ctx, b); err != nil {
		return nil, err
	}
	return bookingDTO(b, svc.Slug, svc.Title), nil
}

// Company bookings

func (s *Service) ListBookings(ctx context.Context, companyID, serviceRef, status string, page, limit int) (*dto.BookingListResult, error) {
	serviceID := ""
	if serviceRef != "" {
		svc, err := s.repo.GetService(ctx, companyID, serviceRef)
		if err != nil {
			return nil, err
		}
		serviceID = svc.ID
	}
	items, total, err := s.repo.ListBookings(ctx, companyID, serviceID, status, page, limit)
	if err != nil {
		return nil, err
	}
	// load service titles
	svcCache := map[string]*domain.Service{}
	out := make([]dto.BookingResponse, 0, len(items))
	for i := range items {
		sv := svcCache[items[i].ServiceID]
		if sv == nil {
			sv, _ = s.repo.GetService(ctx, companyID, items[i].ServiceID)
			svcCache[items[i].ServiceID] = sv
		}
		slug, title := "", ""
		if sv != nil {
			slug, title = sv.Slug, sv.Title
		}
		out = append(out, *bookingDTO(&items[i], slug, title))
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return &dto.BookingListResult{Data: out, Total: total, Page: page, Limit: limit}, nil
}

func (s *Service) GetBooking(ctx context.Context, companyID, id string) (*dto.BookingResponse, error) {
	b, err := s.repo.GetBooking(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	svc, _ := s.repo.GetService(ctx, companyID, b.ServiceID)
	slug, title := "", ""
	if svc != nil {
		slug, title = svc.Slug, svc.Title
	}
	return bookingDTO(b, slug, title), nil
}

func (s *Service) UpdateBooking(ctx context.Context, companyID, id string, req dto.UpdateBookingRequest) (*dto.BookingResponse, error) {
	b, err := s.repo.GetBooking(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if req.Status != nil {
		st := strings.TrimSpace(*req.Status)
		if !validBookingStatus(st) {
			return nil, domain.ErrInvalidInput
		}
		b.Status = st
	}
	if req.Conclusion != nil {
		b.Conclusion = strings.TrimSpace(*req.Conclusion)
		now := time.Now().UTC()
		b.ConcludedAt = &now
		if b.Status == domain.BookingPending || b.Status == domain.BookingConfirmed {
			b.Status = domain.BookingCompleted
		}
	}
	b.UpdatedAt = time.Now().UTC()
	if err := s.repo.UpdateBooking(ctx, b); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, companyID, id)
}

func (s *Service) Summary(ctx context.Context, companyID, serviceRef string) (*dto.BookingSummary, error) {
	serviceID := ""
	if serviceRef != "" {
		svc, err := s.repo.GetService(ctx, companyID, serviceRef)
		if err != nil {
			return nil, err
		}
		serviceID = svc.ID
	}
	total, pending, confirmed, completed, cancelled, today, week, err := s.repo.Summary(ctx, companyID, serviceID)
	if err != nil {
		return nil, err
	}
	return &dto.BookingSummary{
		ServiceID: serviceID, Total: total, Pending: pending, Confirmed: confirmed,
		Completed: completed, Cancelled: cancelled, Today: today, ThisWeek: week,
	}, nil
}

func (s *Service) ServiceByCard(ctx context.Context, companyID, cardID string) (*domain.Service, error) {
	return s.repo.ServiceByCard(ctx, companyID, cardID)
}

// helpers

func (s *Service) generateSlots(ctx context.Context, svc *domain.Service, date time.Time) ([]dto.SlotItem, *domain.DaySchedule, error) {
	wd := isoWeekday(date)
	day := dayFor(svc.Schedule, wd)
	if day == nil || !day.Enabled {
		return []dto.SlotItem{}, day, nil
	}
	startMin, err1 := parseHHMM(day.Start)
	endMin, err2 := parseHHMM(day.End)
	if err1 != nil || err2 != nil || endMin <= startMin {
		return nil, day, domain.ErrInvalidInput
	}
	interval := svc.SlotIntervalMinutes
	if interval < 5 {
		interval = 30
	}
	booked, err := s.repo.BookedStarts(ctx, svc.ID, date)
	if err != nil {
		return nil, day, err
	}
	now := time.Now().In(time.Local)
	isToday := sameDate(date, now)
	nowMin := now.Hour()*60 + now.Minute()

	out := make([]dto.SlotItem, 0)
	for t := startMin; t+interval <= endMin; t += interval {
		start := minutesToHHMM(t)
		end := minutesToHHMM(t + interval)
		avail := !booked[start]
		if isToday && t <= nowMin {
			avail = false
		}
		out = append(out, dto.SlotItem{Start: start, End: end, Available: avail})
	}
	return out, day, nil
}

func (s *Service) toServiceDTO(ctx context.Context, svc *domain.Service) (*dto.ServiceResponse, error) {
	base, err := s.settings.GetSurveyLinkBaseURL(ctx)
	if err != nil {
		return nil, err
	}
	out := &dto.ServiceResponse{
		ID: svc.ID, CompanyID: svc.CompanyID, Slug: svc.Slug, Title: svc.Title,
		Description: svc.Description, Status: svc.Status,
		SlotIntervalMinutes: svc.SlotIntervalMinutes, Schedule: svc.Schedule,
		MaxDaysAhead: svc.MaxDaysAhead, CardID: svc.CardID,
		BookingURL: strings.TrimRight(base, "/") + "/book/" + svc.Slug,
		CreatedAt:  svc.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:  svc.UpdatedAt.UTC().Format(time.RFC3339),
	}
	if svc.PublishedAt != nil {
		out.PublishedAt = svc.PublishedAt.UTC().Format(time.RFC3339)
	}
	if svc.ClosedAt != nil {
		out.ClosedAt = svc.ClosedAt.UTC().Format(time.RFC3339)
	}
	return out, nil
}

func bookingDTO(b *domain.Booking, slug, title string) *dto.BookingResponse {
	out := &dto.BookingResponse{
		ID: b.ID, ServiceID: b.ServiceID, ServiceSlug: slug, ServiceTitle: title,
		Date: b.BookingDate.Format("2006-01-02"), SlotStart: b.SlotStart, SlotEnd: b.SlotEnd,
		Name: b.RespondentName, Phone: b.RespondentPhone, Purpose: b.Purpose,
		Status: b.Status, Conclusion: b.Conclusion,
		CreatedAt: b.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt: b.UpdatedAt.UTC().Format(time.RFC3339),
	}
	if b.ConcludedAt != nil {
		out.ConcludedAt = b.ConcludedAt.UTC().Format(time.RFC3339)
	}
	return out
}

func validateUpsert(req dto.UpsertServiceRequest) error {
	slug := strings.ToLower(strings.TrimSpace(req.Slug))
	if !slugPattern.MatchString(slug) || strings.TrimSpace(req.Title) == "" {
		return domain.ErrInvalidInput
	}
	if req.SlotIntervalMinutes < 5 || req.SlotIntervalMinutes > 480 {
		return domain.ErrInvalidInput
	}
	if len(req.Schedule) == 0 {
		return domain.ErrInvalidInput
	}
	for _, d := range req.Schedule {
		if d.Weekday < 1 || d.Weekday > 7 {
			return domain.ErrInvalidInput
		}
		if d.Enabled {
			if !timePattern.MatchString(d.Start) || !timePattern.MatchString(d.End) {
				return domain.ErrInvalidInput
			}
			sm, e1 := parseHHMM(d.Start)
			em, e2 := parseHHMM(d.End)
			if e1 != nil || e2 != nil || em <= sm {
				return domain.ErrInvalidInput
			}
		}
	}
	return nil
}

func normalizeSchedule(in []domain.DaySchedule) []domain.DaySchedule {
	by := map[int]domain.DaySchedule{}
	for _, d := range in {
		if d.Weekday < 1 || d.Weekday > 7 {
			continue
		}
		d.Start = normalizeHHMM(d.Start)
		d.End = normalizeHHMM(d.End)
		by[d.Weekday] = d
	}
	out := make([]domain.DaySchedule, 0, 7)
	for w := 1; w <= 7; w++ {
		if d, ok := by[w]; ok {
			out = append(out, d)
		} else {
			out = append(out, domain.DaySchedule{Weekday: w, Enabled: false, Start: "09:00", End: "18:00"})
		}
	}
	return out
}

func hasEnabledDay(sched []domain.DaySchedule) bool {
	for _, d := range sched {
		if d.Enabled {
			return true
		}
	}
	return false
}

func dayFor(sched []domain.DaySchedule, weekday int) *domain.DaySchedule {
	for i := range sched {
		if sched[i].Weekday == weekday {
			return &sched[i]
		}
	}
	return nil
}

func isoWeekday(t time.Time) int {
	// Monday=1 ... Sunday=7
	wd := int(t.Weekday())
	if wd == 0 {
		return 7
	}
	return wd
}

func parseHHMM(s string) (int, error) {
	s = normalizeHHMM(s)
	parts := strings.Split(s, ":")
	if len(parts) != 2 {
		return 0, fmt.Errorf("bad time")
	}
	h, err1 := strconv.Atoi(parts[0])
	m, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil || h < 0 || h > 23 || m < 0 || m > 59 {
		return 0, fmt.Errorf("bad time")
	}
	return h*60 + m, nil
}

func minutesToHHMM(m int) string {
	h := m / 60
	mm := m % 60
	return fmt.Sprintf("%02d:%02d", h, mm)
}

func normalizeHHMM(s string) string {
	s = strings.TrimSpace(s)
	if len(s) >= 5 {
		return s[:5]
	}
	return s
}

func slotToMinutes(s string) int {
	m, _ := parseHHMM(s)
	return m
}

func sameDate(a, b time.Time) bool {
	ay, am, ad := a.Date()
	by, bm, bd := b.Date()
	return ay == by && am == bm && ad == bd
}

func validBookingStatus(s string) bool {
	switch s {
	case domain.BookingPending, domain.BookingConfirmed, domain.BookingCompleted,
		domain.BookingCancelled, domain.BookingNoShow:
		return true
	}
	return false
}
