package service

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey/domain"
)

func normalSettings(v json.RawMessage) json.RawMessage {
	if len(v) == 0 {
		return json.RawMessage(`{}`)
	}
	return v
}
func validateRequest(req interface{}) error {
	var raw struct {
		Slug, Title         string
		Settings, Questions json.RawMessage
	}
	data, _ := json.Marshal(req)
	_ = json.Unmarshal(data, &raw)
	if !slugPattern.MatchString(strings.ToLower(strings.TrimSpace(raw.Slug))) || strings.TrimSpace(raw.Title) == "" || !json.Valid(raw.Settings) && len(raw.Settings) > 0 {
		return ErrInvalidSurvey
	}
	var qs []json.RawMessage
	if json.Unmarshal(raw.Questions, &qs) != nil || len(qs) == 0 {
		return ErrInvalidSurvey
	}
	seen := map[string]bool{}
	for _, q := range qs {
		var meta struct {
			ID, Type, Title string
			Options         []struct{ ID, Label string }
			Config          json.RawMessage
		}
		if json.Unmarshal(q, &meta) != nil || strings.TrimSpace(meta.ID) == "" || !domain.SurveyQuestionTypes[meta.Type] || (meta.Type != domain.SurveyTypeSection && strings.TrimSpace(meta.Title) == "") || seen[meta.ID] {
			return ErrInvalidSurvey
		}
		seen[meta.ID] = true
		if (meta.Type == "multiple_choice" || meta.Type == "checkbox" || meta.Type == "dropdown") && len(meta.Options) == 0 {
			return ErrInvalidSurvey
		}
	}
	return nil
}
func answerable(raw json.RawMessage) int {
	var qs []struct{ Type string }
	if json.Unmarshal(raw, &qs) != nil {
		return 0
	}
	n := 0
	for _, q := range qs {
		if q.Type != domain.SurveyTypeSection {
			n++
		}
	}
	return n
}
func publicSettings(raw json.RawMessage) json.RawMessage {
	var m map[string]json.RawMessage
	if json.Unmarshal(raw, &m) != nil {
		return json.RawMessage(`{}`)
	}
	out := map[string]json.RawMessage{}
	for _, k := range []string{"collectEmail", "shuffleQuestions", "showProgressBar"} {
		if v := m[k]; v != nil {
			out[k] = v
		}
	}
	b, _ := json.Marshal(out)
	return b
}
func confirmation(raw json.RawMessage) string {
	var v struct {
		ConfirmationMessage string `json:"confirmationMessage"`
	}
	_ = json.Unmarshal(raw, &v)
	return strings.TrimSpace(v.ConfirmationMessage)
}
func validateAnswers(questions, answers json.RawMessage) (json.RawMessage, error) {
	var qs []struct {
		ID, Type string
		Required bool
		Options  []struct{ ID string }
	}
	if json.Unmarshal(questions, &qs) != nil {
		return nil, ErrInvalidSurvey
	}
	var in map[string]json.RawMessage
	if json.Unmarshal(answers, &in) != nil {
		return nil, fmt.Errorf("%w: answers must be object", ErrInvalidSurvey)
	}
	out := map[string]json.RawMessage{}
	known := map[string]bool{}
	for _, q := range qs {
		if q.Type == domain.SurveyTypeSection {
			continue
		}
		known[q.ID] = true
		v := in[q.ID]
		if len(v) == 0 || string(v) == "null" {
			if q.Required {
				return nil, fmt.Errorf("%w: answer required", ErrInvalidSurvey)
			}
			continue
		}
		if q.Type == "multiple_choice" || q.Type == "dropdown" {
			var choice string
			if json.Unmarshal(v, &choice) != nil {
				return nil, ErrInvalidSurvey
			}
			valid := false
			for _, o := range q.Options {
				if o.ID == choice {
					valid = true
				}
			}
			if !valid {
				return nil, ErrInvalidSurvey
			}
		}
		out[q.ID] = v
	}
	for id := range in {
		if !known[id] {
			return nil, ErrInvalidSurvey
		}
	}
	return json.Marshal(out)
}
