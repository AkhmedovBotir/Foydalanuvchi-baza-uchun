package domain

import (
	"encoding/json"
	"errors"
	"time"
)

const (
	OrientationPortrait  = "portrait"
	OrientationLandscape = "landscape"

	SourceTemplate = "template"
	SourceCustom   = "custom"

	DefaultMarginMM = 5.0
	DefaultGapMM    = 2.0
	MaxCols         = 20
	MaxRows         = 20
	MaxImageBytes   = 10 << 20
)

var (
	ErrNotFound      = errors.New("vizitka topilmadi")
	ErrForbidden     = errors.New("bu vizitkaga ruxsat yo'q")
	ErrInvalidInput  = errors.New("noto'g'ri kiritilgan ma'lumot")
	ErrImageTooLarge = errors.New("rasm 10 MB dan katta bo'lmasligi kerak")
	ErrBadImage      = errors.New("faqat JPEG yoki PNG rasm qabul qilinadi")
	ErrNoOrientation = errors.New("avval A4 orientation tanlang (portrait yoki landscape)")
	ErrNoGrid        = errors.New("avval listga nechta sig'ishini belgilang (cols va rows)")
	ErrNoSurveyURL   = errors.New("so'rovnoma havolasi yo'q — avval so'rovnomaga biriktiring yoki nashr qiling")
	ErrSurveyBound    = errors.New("bu so'rovnomaga boshqa vizitka biriktirilgan")
)

// TextField — shablonda yoziladigan zona.
type TextField struct {
	ID         string `json:"id"`
	Label      string `json:"label"`
	X          int    `json:"x"`
	Y          int    `json:"y"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	Text       string `json:"text"`
	FontSize   int    `json:"fontSize"`
	FontFamily string `json:"fontFamily"`
	Color      string `json:"color"`
	Bold       bool   `json:"bold"`
	Align      string `json:"align"` // left | center | right
}

// CardTemplate — admin global shabloni.
type CardTemplate struct {
	ID               string
	Name             string
	ImagePath        string
	ImageWidth       int
	ImageHeight      int
	ImageContentType string
	QRX              int
	QRY              int
	QRWidth          int
	QRHeight         int
	TextFields       []TextField
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// CompanyCard — kompaniya vizitkasi (shablondan yoki o'zi).
type CompanyCard struct {
	ID               string
	CompanyID        string
	TemplateID       *string
	Source           string
	Name             string
	ImagePath        string
	ImageWidth       int
	ImageHeight      int
	ImageContentType string
	QRX              int
	QRY              int
	QRWidth          int
	QRHeight         int
	TextFields       []TextField
	Orientation      string
	Cols             int
	Rows             int
	MarginMM         float64
	GapMM            float64
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// Layout — A4 ga nechta kartochka.
type Layout struct {
	Orientation  string  `json:"orientation"`
	Cols         int     `json:"cols"`
	Rows         int     `json:"rows"`
	PerPage      int     `json:"perPage"`
	CardWidthMM  float64 `json:"cardWidthMm"`
	CardHeightMM float64 `json:"cardHeightMm"`
	PageWidthMM  float64 `json:"pageWidthMm"`
	PageHeightMM float64 `json:"pageHeightMm"`
	Copies       int     `json:"copies"`
	PagesNeeded  int     `json:"pagesNeeded"`
}

func ParseTextFields(raw json.RawMessage) []TextField {
	if len(raw) == 0 {
		return []TextField{}
	}
	var fields []TextField
	if err := json.Unmarshal(raw, &fields); err != nil {
		return []TextField{}
	}
	if fields == nil {
		return []TextField{}
	}
	return fields
}

func TextFieldsJSON(fields []TextField) json.RawMessage {
	if fields == nil {
		fields = []TextField{}
	}
	b, err := json.Marshal(fields)
	if err != nil {
		return json.RawMessage("[]")
	}
	return b
}
