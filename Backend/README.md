# Foydalanuvchilar bazasi — Backend

Go + PostgreSQL **modular monolit**. Modullar: **Admin**, **Company**, **Survey**, **Settings**.

## Tezkor start

```bash
cp .env.example .env
# PostgreSQL da: CREATE DATABASE foydalanuvchilar_bazasi;
go mod tidy
go run ./cmd/api
```

- API: `http://localhost:8080`
- Swagger: `http://localhost:8080/swagger/index.html`
- Default admin: `admin` / `admin123`

## Hujjatlar

- [admins.md](./admins.md) — Admin CRUD, login, profil
- [companies.md](./companies.md) — Company CRUD, login, profil
- [surveys.md](./surveys.md) — So'rovnomalar (company): savollar, publish, javoblar
- [survey-responses.md](./survey-responses.md) — Kompaniya: javoblarni olish / summary
- [form-api.md](./form-api.md) — Tokensiz forma GET/POST (ism + telefon majburiy)
- [settings.md](./settings.md) — So'rovnoma link base URL sozlamasi

