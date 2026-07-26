package domain

import "errors"

const KeySurveyLinkBaseURL = "survey_link_base_url"

var (
	ErrSettingNotFound = errors.New("sozlama topilmadi")
	ErrInvalidBaseURL  = errors.New("link base URL noto'g'ri formatda")
)

type Setting struct {
	Key       string `json:"key"`
	Value     string `json:"value"`
	UpdatedAt string `json:"updated_at"`
}
