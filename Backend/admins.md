# Admin moduli dokumentatsiyasi

## Umumiy ma'lumot

Bu loyiha **Go + PostgreSQL** asosidagi **modular monolit** arxitekturada qurilgan.
Hozircha faqat **Admin** moduli ishga tushirilgan: CRUD, login va profil boshqaruvi.

---

## Texnologiyalar

| Texnologiya | Vazifa |
|---|---|
| Go 1.22+ | Backend til |
| Gin | HTTP framework |
| PostgreSQL | Asosiy ma'lumotlar bazasi |
| JWT (HS256) | Autentifikatsiya |
| bcrypt | Parol hashlash |
| Swagger (swaggo) | API dokumentatsiya |

---

## Loyiha strukturasi (modular monolit)

```
backend/
├── cmd/api/main.go                 # Ilova kirish nuqtasi
├── internal/
│   ├── config/                     # Konfiguratsiya (.env)
│   ├── platform/                   # Umumiy infratuzilma
│   │   ├── database/               # PostgreSQL ulanish
│   │   ├── middleware/             # JWT auth middleware
│   │   └── response/               # Standart JSON javoblar
│   └── modules/
│       └── admin/                  # Admin moduli
│           ├── domain/             # Entity va domain xatolar
│           ├── dto/                # Request/Response DTO
│           ├── repository/         # PostgreSQL adapter
│           ├── service/            # Biznes mantiq
│           ├── handler/            # HTTP handler + Swagger
│           └── module.go           # Modulni API ga ulash
├── migrations/                     # SQL migratsiyalar
├── docs/                           # Swagger generatsiya (docs.go, swagger.json)
├── admins.md                       # Shu hujjat
├── .env.example
└── go.mod
```

Har bir biznes modul (`admin`, keyinchalik `users`, `roles` va h.k.) o'zining
`domain → repository → service → handler` qatlamiga ega va `module.go` orqali
asosiy routerga ulanadi. Umumiy narsalar (`config`, `database`, `middleware`)
`platform` da saqlanadi.

---

## Admin modeli

| Maydon | Tip | Majburiy | Izoh |
|---|---|---|---|
| `id` | UUID | avto | Primary key |
| `name` | string | ha | Admin ismi (2–150) |
| `phone` | string | ha | Telefon (unique) |
| `username` | string | ha | Login uchun (unique, case-insensitive) |
| `password` | string | ha | bcrypt hash (min 6 belgi) |
| `created_at` | timestamptz | avto | Yaratilgan vaqt |
| `updated_at` | timestamptz | avto | Yangilangan vaqt |

Parol API javoblarida **hech qachon** qaytarilmaydi.

---

## Autentifikatsiya

1. `POST /api/v1/auth/login` — `username` + `password` yuboriladi.
2. Muvaffaqiyatli javobda **JWT token** qaytadi.
3. Himoyalangan endpointlarga so'rovda header:

```
Authorization: Bearer <token>
```

Token ichida: `sub` (admin id), `username`, `role=admin`, `exp`, `iat`.

Default muddat: **24 soat** (`JWT_EXPIRE_HOUR`).

---

## Boshlang'ich (seed) admin

Bazada hech qanday admin bo'lmasa, server ishga tushganda avtomatik yaratiladi:

| Maydon | Qiymat |
|---|---|
| name | Super Admin |
| phone | +998900000000 |
| username | `admin` |
| password | `admin123` |

**Productionda** darhol parolni o'zgartiring.

---

## API endpointlar

Base URL: `http://localhost:8080/api/v1`

Swagger UI: `http://localhost:8080/swagger/index.html`

### Auth

#### 1. Login

```
POST /auth/login
```

**Auth:** kerak emas

**Body:**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Muvaffaqiyatli javob (200):**

```json
{
  "success": true,
  "message": "Muvaffaqiyatli kirildi",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Super Admin",
      "phone": "+998900000000",
      "username": "admin",
      "created_at": "2026-07-24T12:00:00Z",
      "updated_at": "2026-07-24T12:00:00Z"
    }
  }
}
```

**Xatolar:**
- `400` — validatsiya
- `401` — username yoki parol noto'g'ri

---

#### 2. Profilni olish

```
GET /auth/profile
```

**Auth:** Bearer token majburiy

**Muvaffaqiyatli javob (200):**

```json
{
  "success": true,
  "message": "Profil ma'lumotlari",
  "data": {
    "id": "...",
    "name": "Super Admin",
    "phone": "+998900000000",
    "username": "admin",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

#### 3. Profilni yangilash

```
PUT /auth/profile
```

**Auth:** Bearer token majburiy

**Body:**

```json
{
  "name": "Alisher Karimov",
  "phone": "+998901234567",
  "username": "admin",
  "password": "newsecret123"
}
```

- `password` **ixtiyoriy**. Bo'sh qoldirilsa, eski parol saqlanadi.
- Username/phone boshqa adminga tegishli bo'lsa → `409`.

---

### Admins CRUD

Barcha CRUD endpointlar **Bearer token** talab qiladi.

#### 4. Admin yaratish

```
POST /admins
```

```json
{
  "name": "Dilshod Rahimov",
  "phone": "+998911112233",
  "username": "dilshod",
  "password": "secret123"
}
```

**Javob:** `201 Created`

---

#### 5. Adminlar ro'yxati

```
GET /admins
```

**Javob:** `200` — adminlar massivi

---

#### 6. Bitta adminni olish

```
GET /admins/{id}
```

**Javob:** `200` yoki `404`

---

#### 7. Adminni yangilash

```
PUT /admins/{id}
```

```json
{
  "name": "Dilshod Rahimov",
  "phone": "+998911112233",
  "username": "dilshod",
  "password": ""
}
```

`password` bo'sh bo'lsa — o'zgarmaydi.

---

#### 8. Adminni o'chirish

```
DELETE /admins/{id}
```

**Javob:** `200`

---

## Standart javob formatlari

### Success

```json
{
  "success": true,
  "message": "matn",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "xato matni",
  "error": "qo'shimcha detail (ixtiyoriy)"
}
```

### HTTP status kodlar

| Kod | Ma'nosi |
|---|---|
| 200 | OK |
| 201 | Yaratildi |
| 400 | Validatsiya / noto'g'ri so'rov |
| 401 | Autentifikatsiya xatosi |
| 404 | Topilmadi |
| 409 | Conflict (username/phone band) |
| 500 | Ichki server xatosi |

---

## Domain xatolar

| Xato | HTTP |
|---|---|
| admin topilmadi | 404 |
| username yoki parol noto'g'ri | 401 |
| bu username allaqachon band | 409 |
| bu telefon raqami allaqachon band | 409 |
| parol kamida 6 ta belgidan iborat bo'lishi kerak | 400 |

---

## Ishga tushirish

### 1. PostgreSQL baza yaratish

```sql
CREATE DATABASE foydalanuvchilar_bazasi;
```

### 2. Environment

```bash
cp .env.example .env
# .env ni o'zingizning DB sozlamalaringizga moslang
```

### 3. Dependencies

```bash
go mod tidy
```

### 4. Swagger generatsiya (o'zgartirishlardan keyin)

```bash
go install github.com/swaggo/swag/cmd/swag@latest
swag init -g cmd/api/main.go -o docs --parseDependency --parseInternal
```

### 5. Server

```bash
# loyiha ildizidan
go run ./cmd/api
```

Migratsiya (`admins` jadvali) va seed admin avtomatik bajariladi.

---

## Swagger bilan ishlash

1. Brauzerda oching: [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)
2. `POST /auth/login` ni chaqiring (`admin` / `admin123`)
3. Qaytgan `token` ni nusxalang
4. Yuqoridagi **Authorize** tugmasiga bosing
5. Qiymat: `Bearer <token>` (yoki faqat token — `Bearer` so'zi allaqachon descriptionda ko'rsatilgan)
6. Himoyalangan endpointlarni sinab ko'ring

---

## Keyingi qadamlar (tavsiya)

Modular monolitda keyingi modullar shu pattern bo'yicha qo'shiladi:

```
internal/modules/<modul_nomi>/
  domain/
  dto/
  repository/
  service/
  handler/
  module.go
```

Masalan: `users`, `roles`, `permissions` — har biri mustaqil modul,
lekin bitta jarayon va bitta PostgreSQL bazada ishlaydi.
