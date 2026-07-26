package domain

import (
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrSurveyNotFound   = errors.New("so'rovnoma topilmadi")
	ErrForbidden        = errors.New("bu so'rovnomaga ruxsat yo'q")
	ErrResponseNotFound = errors.New("so'rovnoma javobi topilmadi")
)

const (
	SurveyStatusDraft     = "draft"
	SurveyStatusPublished = "published"
	SurveyStatusClosed    = "closed"
	SurveyTypeSection     = "section"
)

var SurveyQuestionTypes = map[string]bool{
	"short_text": true, "long_text": true, "multiple_choice": true, "checkbox": true,
	"dropdown": true, "linear_scale": true, "rating": true, "date": true, "time": true,
	"datetime": true, "email": true, "phone": true, "url": true, "number": true,
	"file_image": true, "file_video": true, "file_audio": true, "file_pdf": true,
	"file_document": true, "file_spreadsheet": true, "file_presentation": true,
	"file_archive": true, "file_any": true, "file": true, SurveyTypeSection: true,
	"grid_choice": true, "grid_checkbox": true,
}

type SurveyFileFormat struct {
	QuestionType     string   `json:"questionType"`
	Category         string   `json:"category"`
	LabelUz          string   `json:"labelUz"`
	Extensions       []string `json:"extensions"`
	DefaultMaxSizeMB int      `json:"defaultMaxSizeMb"`
	DefaultMaxFiles  int      `json:"defaultMaxFiles"`
}

var SurveyFileFormats = []SurveyFileFormat{
	{"file_image", "image", "Rasm", []string{"jpg", "jpeg", "png", "gif", "webp"}, 10, 1},
	{"file_video", "video", "Video", []string{"mp4", "webm", "mov", "avi"}, 100, 1},
	{"file_audio", "audio", "Audio", []string{"mp3", "wav", "ogg", "m4a"}, 25, 1},
	{"file_pdf", "pdf", "PDF", []string{"pdf"}, 20, 1},
	{"file_document", "document", "Hujjat", []string{"doc", "docx", "txt", "rtf", "odt"}, 15, 1},
	{"file_spreadsheet", "spreadsheet", "Jadval", []string{"xls", "xlsx", "csv", "ods"}, 15, 1},
	{"file_presentation", "presentation", "Taqdimot", []string{"ppt", "pptx", "odp"}, 30, 1},
	{"file_archive", "archive", "Arxiv", []string{"zip", "rar", "7z", "tar", "gz"}, 50, 1},
	{"file_any", "any", "Istalgan fayl", nil, 25, 1},
}

func IsSurveyFileType(t string) bool {
	for _, f := range SurveyFileFormats {
		if f.QuestionType == t {
			return true
		}
	}
	return t == "file"
}

type Survey struct {
	ID          string
	CompanyID   string
	Slug        string
	Title       string
	Description string
	Settings    json.RawMessage
	Questions   json.RawMessage
	Status      string
	SortOrder   int
	CreatedAt   time.Time
	UpdatedAt   time.Time
	PublishedAt *time.Time
	ClosedAt    *time.Time
}

type SurveyResponse struct {
	ID              string
	SurveyID        string
	RespondentName  string
	RespondentPhone string
	Answers         json.RawMessage
	CreatedAt       time.Time
}
