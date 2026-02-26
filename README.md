# HackHalt – Cyber Intelligence Council

## Project Summary
HackHalt CIC is the official website for the Cyber Intelligence Council — a cybersecurity-focused organization. It serves as a public-facing platform for community engagement, blog publishing, event listings, session bookings, partnership showcases, and membership/ambassador applications. An admin dashboard allows authorized users to manage form submissions and blog content. The site is deployed as a serverless application on Vercel.

---

## Tech Stack

| Layer | Technology | Purpose in Project |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Renders all public-facing pages |
| **Backend** | Node.js, Express.js | Runtime and routing for API logic |
| **Database** | MongoDB Atlas (Mongoose ODM) | Cloud storage for all submissions and blogs |
| **Auth** | JWT, bcryptjs, cookie-parser | Secure admin login and session handling |
| **Security** | Helmet, express-rate-limit, CORS | HTTP hardening and request throttling |
| **Deployment** | Vercel (Serverless Functions) | Hosts static files and serverless API |

---

## Project Architecture

```
Browser (Static HTML/CSS/JS)
        ↓
  Vercel CDN / Routing
        ↓
  Express API (Serverless via api/)
        ↓
  MongoDB Atlas (Mongoose models)
```

- Static pages are served directly from `public/` via Vercel's static builds.
- API calls hit serverless functions under `api/`, which connect to MongoDB Atlas.
- Admin routes are protected by JWT middleware before accessing data.

---

## How It Works (Flow)

- **Public user** visits a page (e.g., Contact, Join, Book Session) and submits a form.
- The form sends a `POST` request to the relevant `/api/...` endpoint.
- The Express handler validates the input, then saves the submission to MongoDB via a Mongoose model.
- **Admin user** logs in at `/admin-login` → credentials are verified → a JWT is issued and stored as a cookie.
- The admin dashboard fetches submissions via protected `GET /api/submissions/...` endpoints, gated by JWT middleware.
- Blog posts are created/managed through `/api/blog` routes and displayed on the public `/blogs` page.

---

## Folder Structure

```
api/              Vercel serverless entry points (auth + catch-all handler)
config/           Database connection setup
middleware/       Auth guards, rate limiting, security headers
models/           Mongoose schemas (Admin, Blog, Contact, Booking, etc.)
public/           Static HTML pages + assets (CSS, JS, images, fonts)
routes/           Express route handlers (admin auth, submissions, blog)
scripts/          One-off utility scripts (seed data, fix admin passwords)
services/         Shared data-access logic (dataService.js)
utils/            Password policy enforcement, security headers
tests/            API and login diagnostic scripts
```
