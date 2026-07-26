# Company moduli dokumentatsiyasi

## Umumiy ma'lumot

**Company** moduli modular monolit ichida kompaniyalarni boshqarish uchun.
Admin kompaniyalarni CRUD orqali yaratadi/tahrirlaydi; kompaniya o'zi
`username` + `password` bilan tizimga kiradi va profilini boshqaradi.

Bog'liq hujjat: [admins.md](./admins.md)

---

## Model

| Maydon | Tip | Majburiy | Izoh |
|---|---|---|---|
| `id` | UUID | avto | Primary key |
| `name` | string | ha | Kompaniya nomi (2–200) |
| `phone` | string | ha | Telefon (unique) |
| `username` | string | ha | Login (unique, case-insensitive) |
| `password` | string | ha | bcrypt hash (min 6 belgi) |
| `created_at` | timestamptz | avto | Yaratilgan vaqt |
| `updated_at` | timestamptz | avto | Yangilangan vaqt |

Parol API javoblarida **hech qachon** qaytarilmaydi.

---

## Autentifikatsiya

### Admin vs Company token

| Role | Login endpoint | Token `role` | Qaysi API |
|---|---|---|---|
| admin | `POST /auth/login` | `admin` | `/admins`, `/companies` CRUD, admin profil |
| company | `POST /company/auth/login` | `company` | kompaniya profil, so'rovnomalar, settings o'qish |

JWT header:

```
Authorization: Bearer <token>
```

Kompaniya tokeni bilan admin CRUD chaqirilsa → `401 Bu amal uchun ruxsat yo'q`.

---

## API endpointlar

Base URL: `http://localhost:8080/api/v1`  
Swagger: `http://localhost:8080/swagger/index.html`

### Company Auth

#### 1. Login

```
POST /company/auth/login
```

**Auth:** kerak emas

```json
{
  "username": "techsol",
  "password": "company123"
}
```

**200:**

```json
{
  "success": true,
  "message": "Muvaffaqiyatli kirildi",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "company": {
      "id": "...",
      "name": "Tech Solutions LLC",
      "phone": "+998901112233",
      "username": "techsol",
      "created_at": "...",
      "updated_at": "..."
    }
  }
}
```

---

#### 2. Profilni olish

```
GET /company/auth/profile
```

**Auth:** Company Bearer token

---

#### 3. Profilni yangilash

```
PUT /company/auth/profile
```

**Auth:** Company Bearer token

```json
{
  "name": "Tech Solutions LLC",
  "phone": "+998901112233",
  "username": "techsol",
  "password": "newcompany123"
}
```

`password` ixtiyoriy — bo'sh qoldirilsa eski parol saqlanadi.

---

### Companies CRUD (faqat Admin)

Barcha endpointlar **Admin** Bearer token talab qiladi.

#### 4. Yaratish

```
POST /companies
```

```json
{
  "name": "Tech Solutions LLC",
  "phone": "+998901112233",
  "username": "techsol",
  "password": "company123"
}
```

**201 Created**

---

#### 5. Ro'yxat

```
GET /companies
```

---

#### 6. Bitta kompaniya

```
GET /companies/{id}
```

---

#### 7. Yangilash

```
PUT /companies/{id}
```

```json
{
  "name": "Tech Solutions LLC",
  "phone": "+998901112233",
  "username": "techsol",
  "password": ""
}
```

---

#### 8. O'chirish

```
DELETE /companies/{id}
```

---

## Tipik oqim

1. Admin login: `POST /auth/login` (`admin` / `admin123`)
2. Admin kompaniya yaratadi: `POST /companies`
3. Kompaniya login: `POST /company/auth/login`
4. Kompaniya profil: `GET/PUT /company/auth/profile`

---

## Domain xatolar

| Xato | HTTP |
|---|---|
| kompaniya topilmadi | 404 |
| username yoki parol noto'g'ri | 401 |
| bu username allaqachon band | 409 |
| bu telefon raqami allaqachon band | 409 |
| parol kamida 6 ta belgidan iborat bo'lishi kerak | 400 |

---

## Modul strukturasi

```
internal/modules/company/
  domain/
  dto/
  repository/
  service/
  handler/
  module.go
```

Migratsiya: `migrations/002_create_companies.up.sql`
