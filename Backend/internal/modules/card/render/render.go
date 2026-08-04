package render

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"strings"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/domain"
	"github.com/go-pdf/fpdf"
	"github.com/golang/freetype"
	"github.com/golang/freetype/truetype"
	"github.com/skip2/go-qrcode"
	xdraw "golang.org/x/image/draw"
	"golang.org/x/image/font"
	"golang.org/x/image/math/fixed"
)

const printDPI = 150.0

func DecodeImageBytes(data []byte) (image.Image, string, error) {
	img, format, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, "", err
	}
	switch format {
	case "jpeg":
		return img, "image/jpeg", nil
	case "png":
		return img, "image/png", nil
	default:
		return nil, "", domain.ErrBadImage
	}
}

func LoadImage(path string) (image.Image, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	img, _, err := image.Decode(f)
	return img, err
}

func GenerateQR(content string, size int) (image.Image, error) {
	if size < 64 {
		size = 64
	}
	pngBytes, err := qrcode.Encode(content, qrcode.Medium, size)
	if err != nil {
		return nil, err
	}
	img, _, err := image.Decode(bytes.NewReader(pngBytes))
	return img, err
}

// CompositeCard fon + matn maydonlari + QR.
func CompositeCard(
	template image.Image,
	fields []domain.TextField,
	qrRect image.Rectangle,
	qrContent string,
) (*image.RGBA, error) {
	bounds := template.Bounds()
	dst := image.NewRGBA(bounds)
	draw.Draw(dst, bounds, template, bounds.Min, draw.Src)

	for _, f := range fields {
		if strings.TrimSpace(f.Text) == "" {
			continue
		}
		drawTextField(dst, f)
	}

	if qrContent != "" && qrRect.Dx() > 0 && qrRect.Dy() > 0 {
		qr, err := GenerateQR(qrContent, max(qrRect.Dx(), qrRect.Dy())*2)
		if err != nil {
			return nil, err
		}
		placeQR(dst, qr, qrRect)
	}
	return dst, nil
}

func placeQR(dst *image.RGBA, qr image.Image, rect image.Rectangle) {
	// oq fon
	draw.Draw(dst, rect, &image.Uniform{C: color.White}, image.Point{}, draw.Src)
	scaled := image.NewRGBA(image.Rect(0, 0, rect.Dx(), rect.Dy()))
	xdraw.ApproxBiLinear.Scale(scaled, scaled.Bounds(), qr, qr.Bounds(), xdraw.Src, nil)
	draw.Draw(dst, rect, scaled, image.Point{}, draw.Over)
}

func drawTextField(dst *image.RGBA, f domain.TextField) {
	size := f.FontSize
	if size <= 0 {
		size = 16
	}
	col := parseHexColor(f.Color)
	face, err := loadFace(f.FontFamily, f.Bold, float64(size))
	if err != nil {
		// fallback: oddiy pixel matn emas — o'tkazib yuboramiz
		return
	}
	defer face.Close()

	// matnni qatorlarga bo'lish (oddiy)
	maxW := f.Width
	if maxW <= 0 {
		maxW = dst.Bounds().Dx() - f.X
	}
	lines := wrapLines(face, f.Text, maxW)
	lineH := int(math.Ceil(float64(size) * 1.25))
	y := f.Y + size
	for i, line := range lines {
		if f.Height > 0 && (i+1)*lineH > f.Height {
			break
		}
		w := font.MeasureString(face, line).Ceil()
		x := f.X
		switch strings.ToLower(f.Align) {
		case "center":
			x = f.X + (maxW-w)/2
		case "right":
			x = f.X + maxW - w
		}
		d := &font.Drawer{
			Dst:  dst,
			Src:  image.NewUniform(col),
			Face: face,
			Dot:  fixed.P(x, y+i*lineH),
		}
		d.DrawString(line)
	}
}

func wrapLines(face font.Face, text string, maxW int) []string {
	words := strings.Fields(text)
	if len(words) == 0 {
		return nil
	}
	var lines []string
	cur := words[0]
	for _, w := range words[1:] {
		trial := cur + " " + w
		if font.MeasureString(face, trial).Ceil() <= maxW {
			cur = trial
		} else {
			lines = append(lines, cur)
			cur = w
		}
	}
	lines = append(lines, cur)
	return lines
}

func parseHexColor(s string) color.Color {
	s = strings.TrimSpace(s)
	if s == "" {
		return color.RGBA{R: 17, G: 24, B: 39, A: 255}
	}
	if strings.HasPrefix(s, "#") {
		s = s[1:]
	}
	var r, g, b uint8
	switch len(s) {
	case 3:
		fmt.Sscanf(s, "%1x%1x%1x", &r, &g, &b)
		r, g, b = r*17, g*17, b*17
	case 6:
		fmt.Sscanf(s, "%02x%02x%02x", &r, &g, &b)
	default:
		return color.RGBA{R: 17, G: 24, B: 39, A: 255}
	}
	return color.RGBA{R: r, G: g, B: b, A: 255}
}

type faceCloser interface {
	font.Face
	Close() error
}

type ttfFace struct {
	font.Face
}

func (t ttfFace) Close() error { return nil }

func loadFace(family string, bold bool, size float64) (faceCloser, error) {
	path := findFontPath(family, bold)
	if path == "" {
		return nil, fmt.Errorf("font not found")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	ft, err := truetype.Parse(data)
	if err != nil {
		return nil, err
	}
	face := truetype.NewFace(ft, &truetype.Options{
		Size:    size,
		DPI:     72,
		Hinting: font.HintingFull,
	})
	_ = freetype.NewContext // keep dep referenced
	return ttfFace{Face: face}, nil
}

func findFontPath(family string, bold bool) string {
	family = strings.ToLower(strings.TrimSpace(family))
	candidates := []string{}

	// loyiha ichida (ixtiyoriy)
	base := "assets/fonts"
	if bold {
		candidates = append(candidates,
			filepath.Join(base, "NotoSans-Bold.ttf"),
			filepath.Join(base, "DejaVuSans-Bold.ttf"),
		)
	}
	candidates = append(candidates,
		filepath.Join(base, "NotoSans-Regular.ttf"),
		filepath.Join(base, "DejaVuSans.ttf"),
	)

	// Windows
	win := os.Getenv("WINDIR")
	if win == "" {
		win = `C:\Windows`
	}
	fontsDir := filepath.Join(win, "Fonts")
	switch {
	case strings.Contains(family, "times"):
		if bold {
			candidates = append(candidates, filepath.Join(fontsDir, "timesbd.ttf"))
		}
		candidates = append(candidates, filepath.Join(fontsDir, "times.ttf"))
	case strings.Contains(family, "courier"):
		if bold {
			candidates = append(candidates, filepath.Join(fontsDir, "courbd.ttf"))
		}
		candidates = append(candidates, filepath.Join(fontsDir, "cour.ttf"))
	case strings.Contains(family, "georgia"):
		if bold {
			candidates = append(candidates, filepath.Join(fontsDir, "georgiab.ttf"))
		}
		candidates = append(candidates, filepath.Join(fontsDir, "georgia.ttf"))
	case strings.Contains(family, "verdana"):
		if bold {
			candidates = append(candidates, filepath.Join(fontsDir, "verdanab.ttf"))
		}
		candidates = append(candidates, filepath.Join(fontsDir, "verdana.ttf"))
	default: // Arial / sans
		if bold {
			candidates = append(candidates, filepath.Join(fontsDir, "arialbd.ttf"))
		}
		candidates = append(candidates, filepath.Join(fontsDir, "arial.ttf"), filepath.Join(fontsDir, "segoeui.ttf"))
	}

	// Linux fallbacks
	candidates = append(candidates,
		"/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
		"/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
		"/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
		"/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
	)

	for _, p := range candidates {
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p
		}
	}
	return ""
}

func EncodePNG(img image.Image) ([]byte, error) {
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func EncodeJPEG(img image.Image, quality int) ([]byte, error) {
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func ComputeLayout(c domain.CompanyCard) (domain.Layout, error) {
	if c.Orientation != domain.OrientationPortrait && c.Orientation != domain.OrientationLandscape {
		return domain.Layout{}, domain.ErrNoOrientation
	}
	if c.Cols < 1 || c.Rows < 1 {
		return domain.Layout{}, domain.ErrNoGrid
	}
	if c.ImageWidth <= 0 || c.ImageHeight <= 0 {
		return domain.Layout{}, domain.ErrInvalidInput
	}
	pageW, pageH := 210.0, 297.0
	if c.Orientation == domain.OrientationLandscape {
		pageW, pageH = 297.0, 210.0
	}
	aspect := float64(c.ImageWidth) / float64(c.ImageHeight)
	margin := c.MarginMM
	if margin <= 0 {
		margin = domain.DefaultMarginMM
	}
	gap := c.GapMM
	if gap < 0 {
		gap = domain.DefaultGapMM
	}
	cols, rows := c.Cols, c.Rows
	availW := pageW - 2*margin - float64(cols-1)*gap
	availH := pageH - 2*margin - float64(rows-1)*gap
	if availW <= 0 || availH <= 0 {
		return domain.Layout{}, domain.ErrInvalidInput
	}
	cardW := math.Min(availW/float64(cols), availH/float64(rows)*aspect)
	cardH := cardW / aspect
	return domain.Layout{
		Orientation:  c.Orientation,
		Cols:         cols,
		Rows:         rows,
		PerPage:      cols * rows,
		CardWidthMM:  cardW,
		CardHeightMM: cardH,
		PageWidthMM:  pageW,
		PageHeightMM: pageH,
	}, nil
}

// BuildPDF — bitta vizitka nusxasini A4 gridga joylaydi.
func BuildPDF(c domain.CompanyCard, qrContent string, copies int) ([]byte, error) {
	layout, err := ComputeLayout(c)
	if err != nil {
		return nil, err
	}
	if copies < 1 {
		copies = layout.PerPage
	}
	template, err := LoadImage(c.ImagePath)
	if err != nil {
		return nil, err
	}
	scaled, qrRect, err := preparePrintTemplate(template, c, layout)
	if err != nil {
		return nil, err
	}
	// text fields scale
	scaleX := float64(scaled.Bounds().Dx()) / float64(c.ImageWidth)
	scaleY := float64(scaled.Bounds().Dy()) / float64(c.ImageHeight)
	scaledFields := scaleFields(c.TextFields, scaleX, scaleY)

	cardImg, err := CompositeCard(scaled, scaledFields, qrRect, qrContent)
	if err != nil {
		return nil, err
	}
	jpg, err := EncodeJPEG(cardImg, 85)
	if err != nil {
		return nil, err
	}

	orient := "P"
	if c.Orientation == domain.OrientationLandscape {
		orient = "L"
	}
	pdf := fpdf.New(orient, "mm", "A4", "")
	pdf.SetMargins(0, 0, 0)
	pdf.SetAutoPageBreak(false, 0)
	margin := c.MarginMM
	if margin <= 0 {
		margin = domain.DefaultMarginMM
	}
	gap := c.GapMM
	if gap < 0 {
		gap = domain.DefaultGapMM
	}
	opt := fpdf.ImageOptions{ImageType: "JPG", ReadDpi: false}
	perPage := layout.PerPage
	for i := 0; i < copies; i++ {
		slot := i % perPage
		if slot == 0 {
			pdf.AddPage()
		}
		col := slot % layout.Cols
		row := slot / layout.Cols
		x := margin + float64(col)*(layout.CardWidthMM+gap)
		y := margin + float64(row)*(layout.CardHeightMM+gap)
		name := fmt.Sprintf("c%d", i)
		pdf.RegisterImageOptionsReader(name, opt, bytes.NewReader(jpg))
		if pdf.Error() != nil {
			return nil, pdf.Error()
		}
		pdf.ImageOptions(name, x, y, layout.CardWidthMM, layout.CardHeightMM, false, opt, 0, "")
		if pdf.Error() != nil {
			return nil, pdf.Error()
		}
	}
	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func preparePrintTemplate(template image.Image, c domain.CompanyCard, layout domain.Layout) (*image.RGBA, image.Rectangle, error) {
	srcBounds := template.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()
	targetW := int(math.Round(layout.CardWidthMM / 25.4 * printDPI))
	if targetW < 64 {
		targetW = 64
	}
	if targetW > 1200 {
		targetW = 1200
	}
	targetH := int(math.Round(float64(targetW) * float64(srcH) / float64(srcW)))
	if targetH < 1 {
		targetH = 1
	}
	scaleX := float64(targetW) / float64(srcW)
	scaleY := float64(targetH) / float64(srcH)
	dst := image.NewRGBA(image.Rect(0, 0, targetW, targetH))
	xdraw.ApproxBiLinear.Scale(dst, dst.Bounds(), template, srcBounds, xdraw.Src, nil)
	qrRect := image.Rect(
		int(math.Round(float64(c.QRX)*scaleX)),
		int(math.Round(float64(c.QRY)*scaleY)),
		int(math.Round(float64(c.QRX+c.QRWidth)*scaleX)),
		int(math.Round(float64(c.QRY+c.QRHeight)*scaleY)),
	)
	if qrRect.Dx() < 8 {
		qrRect.Max.X = qrRect.Min.X + 8
	}
	if qrRect.Dy() < 8 {
		qrRect.Max.Y = qrRect.Min.Y + 8
	}
	b := dst.Bounds()
	if qrRect.Max.X > b.Max.X {
		qrRect.Max.X = b.Max.X
	}
	if qrRect.Max.Y > b.Max.Y {
		qrRect.Max.Y = b.Max.Y
	}
	if qrRect.Min.X < b.Min.X {
		qrRect.Min.X = b.Min.X
	}
	if qrRect.Min.Y < b.Min.Y {
		qrRect.Min.Y = b.Min.Y
	}
	return dst, qrRect, nil
}

func scaleFields(fields []domain.TextField, sx, sy float64) []domain.TextField {
	out := make([]domain.TextField, len(fields))
	for i, f := range fields {
		out[i] = f
		out[i].X = int(math.Round(float64(f.X) * sx))
		out[i].Y = int(math.Round(float64(f.Y) * sy))
		out[i].Width = int(math.Round(float64(f.Width) * sx))
		out[i].Height = int(math.Round(float64(f.Height) * sy))
		fs := f.FontSize
		if fs <= 0 {
			fs = 16
		}
		out[i].FontSize = int(math.Max(8, math.Round(float64(fs)*math.Min(sx, sy))))
	}
	return out
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// ImageRegister for jpeg/png decode.
func init() {
	// image packages side-effect imports:
	_ = jpeg.DefaultQuality
	_ = png.BestSpeed
}
