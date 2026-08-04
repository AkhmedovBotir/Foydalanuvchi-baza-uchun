# Vizitka (business card) moduli

Admin shablonlari, kompaniya vizitkalari, so‘rovnoma biriktirish, QR va A4 PDF.

## Oqim

1. **Admin** → `POST /api/v1/card-templates` — rasm + QR to‘rtburchagi + matn maydonlari (shrift, rang, o‘lcham, bold)
2. **Kompaniya** → shablonlardan yaratish yoki o‘z rasmini yuklash
3. Matnlarni to‘ldirish / uslubini sozlash
4. So‘rovnomaga biriktirish → QR = `{survey_link_base_url}/surveys/{slug}`
5. A4 orientation + cols×rows → PDF (bir xil vizitkaning nusxalari)

## Admin API

Base: `/api/v1/card-templates` · Auth: Admin JWT

| Method | Path | Tavsif |
|--------|------|--------|
| POST | `/` | multipart: `image`, `name`, `qrX/Y/Width/Height`, `textFields` JSON |
| GET | `/` | Ro‘yxat |
| GET | `/:id` | Bitta |
| PUT | `/:id` | JSON yangilash |
| DELETE | `/:id` | O‘chirish |
| GET | `/:id/image` | Fon rasm |

## Company API

| Method | Path | Tavsif |
|--------|------|--------|
| GET | `/company/card-templates` | Shablonlar |
| POST | `/company/cards/from-template` | Shablondan |
| POST | `/company/cards` | Custom (multipart) |
| GET/PUT/DELETE | `/company/cards/:id` | CRUD |
| GET | `/company/cards/:id/preview` | Matn + QR bilan PNG |
| GET | `/company/cards/:id/qr` | Faqat QR PNG |
| GET | `/company/cards/:id/layout` | A4 hisobi |
| GET | `/company/cards/:id/pdf?copies=` | PDF |
| POST | `/company/surveys/:id/card` | `{ "cardId" }` |
| DELETE | `/company/surveys/:id/card` | Ajratish |
| GET | `/company/surveys/:id/card` | Brief |

## textFields

```json
{
  "id": "uuid",
  "label": "Ism",
  "x": 40, "y": 60, "width": 220, "height": 36,
  "text": "Ali Valiyev",
  "fontSize": 18,
  "fontFamily": "Arial",
  "color": "#111827",
  "bold": true,
  "align": "left"
}
```
