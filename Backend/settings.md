# Settings moduli — So'rovnoma link sozlamasi

## Umumiy

So'rovnomalar public linkining **base URL** qiymati `settings` jadvalida saqlanadi.

| | |
|--|--|
| Kalit | `survey_link_base_url` |
| Default | `http://localhost:5174` |

To'liq link:

```
{base_url}/surveys/{slug}
```

Misol: `http://localhost:5174/surveys/customer-feedback`

Base o'zgarsa, barcha so'rovnomalar `responseUrl` yangi base bilan qayta hisoblanadi (`slug` o'zgarmaydi).

Bog'liq: [surveys.md](./surveys.md)

---

## API

Base: `http://localhost:8080/api/v1`

### 1. Base URL olish

```
GET /settings/survey-link-base
```

**Auth:** Admin yoki Company Bearer token

```json
{
  "success": true,
  "message": "So'rovnoma link sozlamasi",
  "data": {
    "key": "survey_link_base_url",
    "base_url": "http://localhost:5174",
    "updated_at": "2026-07-25T12:00:00Z"
  }
}
```

### 2. Base URL yangilash

```
PUT /settings/survey-link-base
```

**Auth:** faqat **Admin**

```json
{
  "base_url": "https://form.example.com"
}
```

Talablar: `http`/`https`, oxiridagi `/` olib tashlanadi.

---

## Migratsiya

- `003_create_settings.up.sql` — jadval + default seed
- `005_upgrade_surveys.up.sql` — default ni `http://localhost:5174` ga yangilaydi
