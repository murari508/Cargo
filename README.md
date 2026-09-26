# CarGo

**Your Journey. Your Car.**

A self-drive car rental platform for the Indian market, with an assistant that
takes a whole request in one sentence — in English, Telugu or Hindi — and turns it
into a real search against the real fleet.

> "నాకు ఐదుగురికి సరిపడే ఆటోమేటిక్ SUV మూడు రోజులకు కావాలి. బడ్జెట్ పది వేల రూపాయలు."

…gets the same answer as setting six filters by hand.

```
React + TypeScript  →  REST  →  FastAPI  →  MySQL
```

---

## What's in here

| Area | What it does |
|---|---|
| Fleet & search | Combine city, type, seats, fuel, transmission and price filters in one query |
| Availability | Date-overlap checking in the database, enforced on every booking and payment |
| Pricing | Rental, 18% GST, service fee and a category-based refundable deposit — all server-side |
| Bookings | Pending → confirmed → active → completed, with cancellation and refund handling |
| Payments | Provider abstraction with a signed mock gateway for development |
| Accounts | JWT auth, bcrypt hashing, customer and admin roles |
| Admin | Fleet CRUD, booking status control, user management, revenue overview |
| Assistant | Multilingual understanding, voice in and out, trip planning |

---

## Running it

### 1. Database

```sql
CREATE DATABASE cargo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cargo'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON cargo.* TO 'cargo'@'localhost';
FLUSH PRIVILEGES;
```

`utf8mb4` matters — Telugu and Devanagari text is stored in these tables.

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# fill in DB_PASSWORD and generate SECRET_KEY:
python -c "import secrets; print(secrets.token_urlsafe(48))"

python -m app.seed          # tables + demo fleet + demo accounts
uvicorn app.main:app --reload
```

API on http://localhost:8000 · Swagger at `/docs` · ReDoc at `/redoc`

No MySQL handy? Set `DATABASE_URL=sqlite:///./cargo.db` in `.env` and everything
runs unchanged.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App on http://localhost:5173. Vite proxies `/api` to the backend, so both sides
share one origin in development and CORS stays out of the way.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@cargo.in | CarGoAdmin1 |
| Customer | ravi@example.com | Password1 |

---

## The assistant

The standout feature is **"Just speak. CarGo understands."** The floating button
opens a panel that works in two modes: voice and text, switchable mid-conversation.

**The flow.** Mic → listening animation → speech to text → language detection →
the server parses the request → reply appears as text → the reply is spoken.
Tapping the button while it's speaking interrupts it.

**Languages.** English (`en-IN`), Telugu (`te-IN`), Hindi (`hi-IN`), plus auto
detect. Detection runs on script first, then on romanised cue words, so Hinglish
("Mujhe Hyderabad mein ek automatic car chahiye") and Tenglish ("Hyderabad lo
automatic SUV kavali") both land correctly without perfect grammar.

**What it extracts.** City, dates, trip length, category, seats, fuel,
transmission and budget — including spoken numbers in all three languages
("ten thousand", "పది వేలు", "दस हजार" all mean ₹10,000). Slots persist across
turns, so a follow-up only has to supply the missing piece.

**It never invents a car.** Every recommendation is a row from the `cars` table,
filtered by the parsed slots and the live booking calendar.

### Speech, without a bill

`SPEECH_PROVIDER=browser` and `LLM_PROVIDER=rules` (the defaults) mean the browser's
Web Speech API handles recognition and synthesis, and the server's own rules engine
does the understanding. Nothing leaves your infrastructure and nothing costs money.

To swap in hosted services, set the provider and key in `.env` and fill in the two
marked hooks: `app/services/nlu.py::enrich` and the bodies of
`/api/voice/transcribe` and `/api/voice/speak`. Credentials stay server-side in
both cases — the browser never sees a key.

Firefox and some Android webviews have no `SpeechRecognition`. The panel detects
that and falls back to the text box automatically.

---

## Availability, and why the frontend can't be trusted with it

Two closed date intervals overlap when `a.start <= b.end AND b.start <= a.end`.
That single condition is in `app/services/availability.py` and it is the only
authority on whether a car can be booked.

Statuses `pending`, `confirmed` and `active` all occupy the calendar — pending is
included so two people can't start checkout on the same car for the same dates.

It runs three times: when search flags each result, when the booking is created,
and again when payment is created. The **Available / Unavailable** badges in the UI
are a mirror of the backend's answer, never a substitute for it. A booking that
collides returns `409` with the conflicting date ranges attached.

---

## Pricing

```
base      = price_per_day × rental_days     (same-day return counts as one day)
taxes     = base × 18%                       GST
fee       = base × 5%                        platform fee
deposit    fixed by category                 refundable
total     = base + taxes + fee + deposit
```

`POST /api/bookings/quote` previews it and `POST /api/bookings` recomputes it. No
amount sent by the client is ever read — `BookingCreate` has no price fields at all.

---

## Payments

`PaymentProvider` is an abstract class with two methods: `create_order` and
`verify`. The development provider signs each order with the app secret, so a
forged "payment succeeded" call from the browser fails verification.

```
POST /api/payments/create          → order + checkout token
POST /api/payments/mock/checkout   → stands in for the hosted gateway (dev only)
POST /api/payments/verify          → checks the signature, then confirms the booking
```

Connecting Razorpay or Stripe means writing one more class and setting
`PAYMENT_PROVIDER`. Card numbers, CVVs and UPI PINs are handled by the provider's
hosted checkout and are never stored, logged or received by CarGo.

---

## API

Full interactive docs at `/docs`. The shape of it:

**Auth** `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` ·
`POST /api/auth/forgot-password` · `POST /api/auth/reset-password`

**Cars** `GET /api/cars` · `GET /api/cars/filters` · `GET /api/cars/{id}` ·
`GET /api/cars/{id}/availability` · `POST|PUT|DELETE /api/cars` *(admin)*

**Bookings** `POST /api/bookings/quote` · `POST /api/bookings` · `GET /api/bookings` ·
`GET /api/bookings/{id}` · `PUT /api/bookings/{id}/cancel`

**Payments** `POST /api/payments/create` · `POST /api/payments/verify` ·
`GET /api/payments/methods`

**Users** `GET|PUT /api/users/me` · `GET /api/users/me/dashboard` ·
`GET|POST|DELETE /api/users/me/saved-cars`

**Admin** `GET /api/admin/dashboard` · `/api/admin/cars` · `/api/admin/bookings` ·
`/api/admin/users`

**Assistant** `POST /api/ai/car-assistant` · `POST /api/ai/trip-planner` ·
`GET|POST|DELETE /api/ai/trip-plans` · `GET /api/ai/conversations`

**Voice** `POST /api/voice/process` · `POST /api/voice/transcribe` ·
`POST /api/voice/speak` · `GET /api/voice/languages`

### Filter examples

```
GET /api/cars?location=Hyderabad
GET /api/cars?category=SUV&transmission=Automatic
GET /api/cars?min_price=1000&max_price=5000&seats=5
GET /api/cars?location=Hyderabad&fuel_type=Diesel&pickup_date=2026-10-01&return_date=2026-10-04&available_only=true
```

### Errors

One JSON shape everywhere:

```json
{ "error": { "status": 409, "message": "This car is already booked for part of those dates.",
             "detail": { "conflicting_dates": [{ "pickup_date": "2026-10-02",
                                                 "return_date": "2026-10-05" }] } } }
```

`400` validation · `401` sign in · `403` wrong role · `404` missing ·
`409` conflict or unavailable · `500` server

---

## Data model

```
users  ──< bookings >──  cars
  │                       │
  ├──< saved_cars >───────┘
  ├──< reviews
  ├──< ai_conversations
  └──< trip_plans
```

Foreign keys cascade on delete. Indexes cover `(car_id, pickup_date, return_date)`
for the overlap query, `(location, category)` for search, and `booking_status`.

A car with live bookings is retired rather than deleted, so history stays intact.

---

## Security

- bcrypt password hashing; `password_hash` has no field in any response schema,
  so it cannot leak by accident
- JWT bearer tokens, typed so a password-reset token can't be used as an access token
- Role checks as a router-level dependency on every admin route
- Pydantic validation on every request body, including Indian mobile number format
- SQLAlchemy ORM throughout — no string-built SQL
- CORS restricted to the origins in `CORS_ORIGINS`
- Every secret in `.env`, which is gitignored; `.env.example` holds no real values
- Login returns one message for a wrong password and an unknown email alike

---

## Project layout

```
backend/
  app/
    main.py            app, CORS, error handlers
    config.py          settings from the environment
    database.py        engine, session, Base
    models/            users, cars, bookings, ai_conversations, trip_plans, extras
    schemas/           request and response models
    routers/           auth, cars, bookings, payments, users, admin, ai, voice
    services/          pricing, availability, payments, nlu, responses, trip_planner
    auth/              hashing and JWT
    dependencies/      current user, current admin
    seed.py
  requirements.txt
  .env.example

frontend/
  src/
    components/        Navbar, CarCard, VoiceAssistant, route guards, shared UI
    pages/             16 pages including the admin section
    services/api.ts    typed client, one place that talks to the backend
    hooks/             useSpeech, useAsync
    context/           AuthContext
    types/
    App.tsx
```

---

## Notes for extending it

- **Booking lifecycle** — `pending` → `confirmed` happens on payment. Moving
  `confirmed` → `active` → `completed` is manual in the admin screen today; a daily
  job keyed on `pickup_date` and `return_date` is the obvious next step.
- **Reviews** — the table and relationships exist; endpoints aren't wired up yet.
- **Migrations** — `Base.metadata.create_all` is fine for development. Add Alembic
  before you change a column in production.
- **Rate limiting** — worth adding to `/api/auth/login` and the assistant endpoints
  before this faces the internet.
