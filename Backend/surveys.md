# So'rovnomalar (Survey) moduli

Google Forms uslubidagi so'rovnomalar. **Kompaniya** boshqaradi (Admin emas).

Bog'liq: [companies.md](./companies.md) · [settings.md](./settings.md) · [form-api.md](./form-api.md)

---

## Umumiy

| Tomon | Auth | Vazifa |
|-------|------|--------|
| Company | JWT Bearer | CRUD, publish/close, javoblarni ko'rish |
| Respondent | yo'q | Forma ochish, fayl yuklash, javob yuborish |

### Holatlar

```
draft  --publish-->  published  --close-->  closed
```

- `draft` — tahrirlash, o'chirish, nashr
- `published` — public forma ishlaydi; tahrirlash va yopish mumkin
- `closed` — ko'rish mumkin, javob qabul qilinmaydi; tahrirlash yo'q

### Link (`responseUrl`)

```
{survey_link_base_url}/surveys/{slug}
```

Default: `http://localhost:5174/surveys/customer-feedback`  
Base URL: [settings.md](./settings.md)

---

## Model

| Maydon | Tip | Izoh |
|--------|-----|------|
| `id` | UUID | Primary key |
| `companyId` | UUID | Egasi kompaniya |
| `slug` | string | Unique tashqi ID (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) |
| `title` | string | Sarlavha |
| `description` | string | Tavsif |
| `settings` | object | Forma sozlamalari |
| `questions` | array | Savollar (JSONB) |
| `status` | string | `draft` \| `published` \| `closed` |
| `sortOrder` | number | Tartib |
| `questionCount` | number | `section` dan tashqari savollar |
| `responseUrl` | string | Public frontend havolasi |
| `publishedAt` / `closedAt` | string? | |

### Settings

| Maydon | Tip |
|--------|-----|
| `collectEmail` | boolean? |
| `shuffleQuestions` | boolean? |
| `confirmationMessage` | string? |
| `showProgressBar` | boolean? |

### Savol

| Maydon | Majburiy | Izoh |
|--------|----------|------|
| `id` | ha | Unique |
| `type` | ha | Savol turi |
| `title` | `section` dan tashqari | |
| `description` | yo'q | |
| `required` | yo'q | |
| `options` | tanlovlarda | `{ id, label, isOther? }` |
| `validation` | yo'q | min/max/minLength/maxLength/pattern |
| `config` | ba'zi turlarda | scale, grid, file limits |

### Savol turlari

`short_text`, `long_text`, `multiple_choice`, `checkbox`, `dropdown`,
`linear_scale`, `rating`, `date`, `time`, `datetime`, `email`, `phone`,
`url`, `number`, `file_image`, `file_video`, `file_audio`, `file_pdf`,
`file_document`, `file_spreadsheet`, `file_presentation`, `file_archive`,
`file_any`, `file` (legacy), `section`, `grid_choice`, `grid_checkbox`

---

## Company API

Base: `/api/v1/company/surveys`  
Auth: Company token (`POST /api/v1/company/auth/login`)

| Method | Path | Tavsif |
|--------|------|--------|
| GET | `/` | Ro'yxat |
| POST | `/` | Yaratish (`draft`) |
| GET | `/file-formats` | Fayl MIME/kengaytmalar |
| GET | `/:id` | Bitta (slug yoki UUID) |
| PUT | `/:id` | Yangilash (closed emas) |
| DELETE | `/:id` | O'chirish |
| POST | `/:id/publish` | draft → published |
| POST | `/:id/close` | published → closed |
| GET | `/responses` | Barcha javoblar |
| GET | `/responses/:responseId` | Bitta javob |
| DELETE | `/responses/:responseId` | Javobni o'chirish |
| GET | `/:id/responses` | So'rovnoma javoblari |
| GET | `/:id/responses/summary` | Statistika |

### Yaratish / yangilash body

```json
{
  "slug": "customer-feedback",
  "title": "Mijoz fikri",
  "description": "Xizmat haqida",
  "settings": {
    "confirmationMessage": "Rahmat!",
    "showProgressBar": true
  },
  "questions": [
    {
      "id": "q1",
      "type": "short_text",
      "title": "Ismingiz",
      "required": true
    },
    {
      "id": "q2",
      "type": "multiple_choice",
      "title": "Baholang",
      "required": true,
      "options": [
        { "id": "o1", "label": "Yaxshi" },
        { "id": "o2", "label": "Yomon" }
      ]
    }
  ],
  "sortOrder": 0
}
```

Publish uchun kamida **1 ta** javob beriladigan savol kerak (`section` hisoblanmaydi).

---

## Public API (Sorovnoma frontend)

Base: `/api/v1/surveys` — **auth yo'q**

| Method | Path | Tavsif |
|--------|------|--------|
| GET | `/` | Published ro'yxat |
| GET | `/:id` | Forma (published yoki closed) |
| POST | `/:id/responses` | Javob yuborish (faqat published) |
| POST | `/:id/upload` | Fayl yuklash (multipart) |

### Submit

```json
POST /api/v1/surveys/customer-feedback/responses
{
  "answers": {
    "q1": "Ali",
    "q2": "o1"
  }
}
```

### Upload

```
POST /api/v1/surveys/customer-feedback/upload
Content-Type: multipart/form-data
questionId=<file question id>
file=<binary>
```

Javobda `path` / `url` — shu `path` ni answers ichida yuboring.

---

## Tipik oqim

1. Company login → `POST /company/auth/login`
2. So'rovnoma yaratish → `POST /company/surveys`
3. Publish → `POST /company/surveys/{slug}/publish`
4. `responseUrl` ni ulashish
5. Respondent forma to'ldiradi (public API)
6. Company javoblarni ko'radi → `GET /company/surveys/{slug}/responses`

---

## Migratsiya

`migrations/005_upgrade_surveys.up.sql` — to'liq schema + `survey_responses`.

## Modul

```
internal/modules/survey/
  domain/
  dto/
  repository/
  service/
  handler/
  module.go
```
