# Forma API — tokensiz so'rovnoma topshirish

Respondent (foydalanuvchi) uchun alohida API. **JWT / token kerak emas.**

Faqat forma ochish (GET) va topshirish (POST).

Base: `http://localhost:8080/api/v1`  
Swagger: `http://localhost:8080/swagger/index.html` (tag: **Form**)

Bog'liq: [surveys.md](./surveys.md) · [settings.md](./settings.md)

---

## Asosiy qoida

Har bir topshirishda **ism** va **telefon majburiy** — so'rovnoma savollariga qaramay.
Kompaniya har doim kim javob berganini biladi.

| Maydon | JSON | Majburiy | Izoh |
|--------|------|----------|------|
| Ism | `name` | ha | min 2 belgi |
| Telefon | `phone` | ha | min 9 belgi |
| Javoblar | `answers` | ha | `{ questionId: value }` |

---

## Endpointlar

| Method | Path | Auth | Tavsif |
|--------|------|------|--------|
| GET | `/forms/{slug}` | yo'q | Formani olish |
| POST | `/forms/{slug}` | yo'q | Formani topshirish |
| POST | `/forms/{slug}/upload` | yo'q | Fayl savoli uchun upload (ixtiyoriy) |

`slug` — so'rovnoma tashqi identifikatori (masalan `customer-feedback`).

Public frontend URL: `{survey_link_base_url}/surveys/{slug}`  
(API chaqiruvlari shu `slug` bilan `/forms/{slug}` ga ketadi.)

---

## 1. Formani olish

```
GET /api/v1/forms/{slug}
```

**Auth:** yo'q

Faqat `published` yoki `closed` so'rovnomalar. `draft` → `404`.

**200:**

```json
{
  "success": true,
  "message": "So'rovnoma formasi",
  "data": {
    "id": "customer-feedback",
    "title": "Mijoz fikri",
    "description": "Xizmat haqida",
    "settings": {
      "collectEmail": false,
      "shuffleQuestions": false,
      "showProgressBar": true
    },
    "respondentFields": [
      { "key": "name", "label": "Ism familiya", "type": "text", "required": true },
      { "key": "phone", "label": "Telefon raqam", "type": "phone", "required": true }
    ],
    "questions": [
      {
        "id": "q1",
        "type": "short_text",
        "title": "Izohingiz",
        "required": false
      }
    ],
    "status": "published"
  }
}
```

Frontend alohida **Ism** va **Telefon** maydonlarini chizadi.
Buni hardcode qilish shart emas — API `respondentFields` qaytaradi:

```json
"respondentFields": [
  { "key": "name",  "label": "Ism familiya",  "type": "text",  "required": true },
  { "key": "phone", "label": "Telefon raqam", "type": "phone", "required": true }
]
```

`questions` dan **oldin** shu maydonlarni render qiling.

`closed` bo'lsa forma ko'rinadi, lekin POST rad etiladi.

---

## 2. Formani topshirish

```
POST /api/v1/forms/{slug}
Content-Type: application/json
```

**Auth:** yo'q  
**Faqat** `published` holatda.

### Body

```json
{
  "name": "Alisher Karimov",
  "phone": "+998901234567",
  "answers": {
    "q1": "Juda yaxshi xizmat"
  }
}
```

| Maydon | Majburiy | Tavsif |
|--------|----------|--------|
| `name` | ha | Ism familiya |
| `phone` | ha | Telefon raqam |
| `answers` | ha | Savol javoblari obyekti |

Agar so'rovnomada majburiy savollar bo'lsa, ular `answers` ichida ham to'ldiriladi.

### Muvaffaqiyat (201)

```json
{
  "success": true,
  "message": "So'rovnoma muvaffaqiyatli topshirildi",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Alisher Karimov",
    "phone": "+998901234567",
    "confirmationMessage": "Rahmat!",
    "createdAt": "2026-07-25T12:00:00Z"
  }
}
```

### Xatolar

| Kod | Sabab |
|-----|--------|
| 400 | `name`/`phone` yo'q yoki qisqa; answers validatsiya; so'rovnoma yopilgan |
| 404 | slug topilmadi yoki draft |

---

## 3. Fayl yuklash (ixtiyoriy)

Agar savol `file_*` tipida bo'lsa:

```
POST /api/v1/forms/{slug}/upload
Content-Type: multipart/form-data

questionId=q_file
file=<binary>
```

Javobdagi `path` ni `answers` ichiga yozing, keyin POST `/forms/{slug}`.

---

## Frontend oqim

```
1. User ochadi: https://form.../surveys/customer-feedback
2. App: GET /api/v1/forms/customer-feedback
3. UI: Ism + Telefon (majburiy) + savollar
4. (ixtiyoriy) fayl upload
5. POST /api/v1/forms/customer-feedback
   { name, phone, answers }
6. confirmationMessage ko'rsatiladi
```

---

## Company tomonda javoblar

Kompaniya javoblarni ko'rganda har birida `name` va `phone` chiqadi:

```
GET /api/v1/company/surveys/{slug}/responses
Authorization: Bearer <company_token>
```

```json
{
  "id": "...",
  "name": "Alisher Karimov",
  "phone": "+998901234567",
  "answers": { "q1": "..." },
  "createdAt": "..."
}
```

Batafsil: [surveys.md](./surveys.md)

---

## Eski endpointlar

Quyidagilar hali ishlaydi, lekin **ham** `name` + `phone` talab qiladi:

- `GET /surveys/{id}`
- `POST /surveys/{id}/responses`

Yangi frontend uchun **`/forms/{slug}`** ni ishlating.
