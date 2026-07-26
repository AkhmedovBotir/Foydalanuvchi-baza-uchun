package upload

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

const SurveyResponsePublicPrefix = "/uploads/survey-responses/"

var (
	ErrFileTooLarge    = errors.New("file too large")
	ErrInvalidFileType = errors.New("invalid file type")
	ErrEmptyFile       = errors.New("empty file")
)

type SavedFile struct {
	Path      string `json:"path"`
	URL       string `json:"url"`
	Ext       string `json:"ext"`
	SizeLabel string `json:"sizeLabel"`
	SizeBytes int64  `json:"sizeBytes"`
}

type Storage struct {
	rootDir       string
	publicBaseURL string
}

func NewStorage(rootDir, publicBaseURL string) *Storage {
	return &Storage{rootDir: rootDir, publicBaseURL: strings.TrimRight(publicBaseURL, "/")}
}

func (s *Storage) EnsureDirs() error {
	return os.MkdirAll(filepath.Join(s.rootDir, "survey-responses"), 0o755)
}

func (s *Storage) SaveSurveyResponseFile(header *multipart.FileHeader, allowed map[string]struct{}, maxBytes int64) (*SavedFile, error) {
	if header == nil || header.Size < 1 {
		return nil, ErrEmptyFile
	}
	if maxBytes > 0 && header.Size > maxBytes {
		return nil, ErrFileTooLarge
	}
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if len(allowed) > 0 {
		if _, ok := allowed[ext]; !ok {
			return nil, ErrInvalidFileType
		}
	}
	if err := s.EnsureDirs(); err != nil {
		return nil, err
	}
	src, err := header.Open()
	if err != nil {
		return nil, fmt.Errorf("open upload: %w", err)
	}
	defer src.Close()
	name := uuid.NewString() + ext
	dst, err := os.Create(filepath.Join(s.rootDir, "survey-responses", name))
	if err != nil {
		return nil, fmt.Errorf("create upload: %w", err)
	}
	defer dst.Close()
	if _, err := io.Copy(dst, src); err != nil {
		return nil, fmt.Errorf("save upload: %w", err)
	}
	path := SurveyResponsePublicPrefix + name
	return &SavedFile{Path: path, URL: s.publicBaseURL + path, Ext: strings.TrimPrefix(ext, "."), SizeBytes: header.Size, SizeLabel: formatSize(header.Size)}, nil
}

func ValidateSurveyResponseFilePath(path string) error {
	path = strings.TrimSpace(path)
	if strings.HasPrefix(path, SurveyResponsePublicPrefix) || strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return nil
	}
	return ErrInvalidFileType
}

func formatSize(n int64) string {
	if n < 1024 {
		return fmt.Sprintf("%d B", n)
	}
	return fmt.Sprintf("%.1f KB", float64(n)/1024)
}
