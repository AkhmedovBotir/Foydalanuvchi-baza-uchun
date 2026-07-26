# So'rovnoma javoblari — Company API

Kompaniya o'z so'rovnomalariga kelgan javoblarni ko'radi, filtrlaydi, o'chiradi.

**Auth:** Company JWT (`POST /api/v1/company/auth/login`)

```
Authorization: Bearer <company_token>
```

Base: `http://localhost:8080/api/v1/company/surveys`  
Swagger tag: **Survey Responses**

Bog'liq: [surveys.md](./surveys.md) · [form-api.md](./form-api.md)

---

## Endpointlar

| Method | Path | Tavsif |
|--------|------|--------|
| GET | `/responses` | Barcha so'rovnomalar javoblari |
| GET | `/responses/{responseId}` | Bitta javob (savollar + answers) |
| DELETE | `/responses/{responseId}` | Javobni o'chirish |
| GET | `/{id}/responses` | Bitta so'rovnoma javoblari |
| GET | `/{id}/responses/summary` | Statistika |

`{id}` — survey **slug** yoki **UUID**.

Query: `page` (default 1), `limit` (default 20, max 100).

---

## 1. Barcha javoblar

```
GET /api/v1/company/surveys/responses?page=1&limit=20
```

**200:**

```json
{
  "success": true,
  "message": "Javoblar",
  "data": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "surveyId": "...",
        "surveySlug": "yangi-sorovnoma",
        "surveyTitle": "Yangi so'rovnoma",
        "name": "Alisher Karimov",
        "phone": "+998901234567",
        "answers": {
          "q1": "Juda yaxshi"
        },
        "createdAt": "2026-07-25T12:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

Har bir javobda **`name`** (ism familiya) va **`phone`** doim bor.

---

## 2. Bitta so'rovnoma javoblari

```
GET /api/v1/company/surveys/yangi-sorovnoma/responses?page=1&limit=20
```

Javob formati yuqoridagi bilan bir xil (faqat shu so'rovnoma).

---

## 3. Bitta javob (detail)

```
GET /api/v1/company/surveys/responses/{responseId}
```

```json
{
  "success": true,
  "message": "Javob",
  "data": {
    "id": "...",
    "surveyId": "...",
    "surveySlug": "yangi-sorovnoma",
    "surveyTitle": "Yangi so'rovnoma",
    "surveyStatus": "published",
    "name": "Alisher Karimov",
    "phone": "+998901234567",
    "questions": [ ... ],
    "answers": { "q1": "..." },
    "createdAt": "..."
  }
}
```

---

## 4. Statistika

```
GET /api/v1/company/surveys/yangi-sorovnoma/responses/summary
```

```json
{
  "success": true,
  "message": "Javoblar xulosasi",
  "data": {
    "surveyId": "...",
    "surveySlug": "yangi-sorovnoma",
    "surveyTitle": "Yangi so'rovnoma",
    "surveyStatus": "published",
    "totalResponses": 12,
    "todayResponses": 3,
    "weekResponses": 8,
    "firstResponseAt": "...",
    "lastResponseAt": "..."
  }
}
```

---

## 5. O'chirish

```
DELETE /api/v1/company/surveys/responses/{responseId}
```

---

## Ism / telefon — frontendga qanday bildiriladi?

**Frontendda qo'lda yozib qo'yish shart emas.** API o'zi aytadi.

### Forma (respondent) — `GET /forms/{slug}`

```json
{
  "id": "yangi-sorovnoma",
  "title": "...",
  "questions": [ ... ],
  "respondentFields": [
    { "key": "name",  "label": "Ism familiya",  "type": "text",  "required": true },
    { "key": "phone", "label": "Telefon raqam", "type": "phone", "required": true }
  ],
  "status": "published"
}
```

Forma UI:
1. Avval `respondentFields` bo'yicha input chizadi (ism, telefon)
2. Keyin `questions` bo'yicha savollarni chizadi
3. Submit: `{ name, phone, answers }`

### Company panel — `GET /company/surveys/{id}`

So'rovnoma obyektida ham `respondentFields` qaytadi. Preview yoki
"Javob beruvchidan avtomatik so'raladi" bloki uchun shu massivdan foydalaning.

---

## Tipik oqim

1. Company login
2. `GET /company/surveys/yangi-sorovnoma/responses/summary` — kartochkalar
3. `GET /company/surveys/yangi-sorovnoma/responses` — jadval (`name`, `phone`, answers)
4. Qator bosilsa → `GET /company/surveys/responses/{id}` — to'liq detail
