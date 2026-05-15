# Velour — UK E-Commerce Platform

A full-stack UK online marketplace built with a microservices architecture. The backend is five independent FastAPI services. The frontend is a React SPA whose Nginx container doubles as an API gateway — all traffic goes through a single port (3000).

---

## What's Inside

- Browse and search 685+ products across 16 categories
- Add to cart, checkout, and view order history
- Register and log in with JWT-based authentication
- **Vera** — AI shopping assistant powered by Google Gemini, with product cards, clickable options, and order history access
- All prices in GBP (£), UK locale throughout

---

## Architecture

```
         Browser
            │
            ▼
  ┌─────────────────────┐
  │  Nginx (port 3000)  │  ← React frontend + API gateway
  └──────────┬──────────┘
             │ routes by /api/<service>/
    ┌─────────┼──────────┬──────────────┬──────────────┐
    ▼         ▼          ▼              ▼              ▼
 /api/auth/ /api/     /api/cart/  /api/search/  /api/assistant/
            products/
    │         │          │              │              │
  Auth    Products     Cart       Search &         Vera AI
 Service   Service    Service   Recommend.       Assistant
            │                    Service          (Gemini)
            ▼
         MongoDB
      (3 databases)
```

All backend services talk to each other over Docker's internal network. Browsers only ever talk to port 3000.

---

## Quick Start

**Requirements:** [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

### 1. Clone

```bash
git clone https://github.com/Lohit20/Ecommerce-Microservices.git
cd Ecommerce-Microservices
```

### 2. Create a `.env` file

Create a `.env` file in the root directory (next to `docker-compose.yml`):

```env
# Required — change this to any strong random string
JWT_SECRET_KEY=replace_with_a_strong_secret

# Required for Vera AI assistant — get a free key at aistudio.google.com
GEMINI_API_KEY=your_gemini_api_key_here

# Optional — AI model selection (default: gemini-2.0-flash)
GEMINI_MODEL=gemini-2.0-flash
```

> **Note on Gemini quota:** The free tier allows ~1,500 requests/day on `gemini-2.0-flash`. If you hit the limit, Vera will say "I'm a little busy" — it resets at midnight UTC. Add billing on [aistudio.google.com](https://aistudio.google.com) for unlimited requests.

### 3. Run

```bash
docker-compose up --build
```

First run takes ~2 minutes while Docker builds images and seeds the database (685 products). Subsequent runs are much faster.

### 4. Open

```
http://localhost:3000
```

---

## Services

| Service | Internal Port | Gateway Path | What it does |
|---------|--------------|--------------|--------------|
| Frontend (Nginx) | 80 → **3000** | — | React UI + API gateway |
| Auth | 8000 → 8004 | `/api/auth/` | Register, login, JWT tokens |
| Products | 8000 → 8001 | `/api/products/` | Product catalogue, stock |
| Cart | 8000 → 8002 | `/api/cart/` | Cart management, checkout, orders |
| Search & Recommend | 8000 → 8003 | `/api/search/` | Full-text search, homepage recommendations |
| AI Assistant (Vera) | 8000 → 8005 | `/api/assistant/` | Gemini-powered shopping assistant |
| MongoDB | 27017 | — | Database |

Ports 8001–8005 are exposed for debugging but not needed during normal use.

---

## Pages

| URL | Page |
|-----|------|
| `/` | Home — hero, categories, deals, recommendations |
| `/shop` | All products with filters (price, rating, category) |
| `/product/:id` | Product detail, add to cart, chat with Vera about the item |
| `/category/:name` | Category listing with sort and price range slider |
| `/cart` | Shopping cart |
| `/checkout` | Payment and order confirmation *(login required)* |
| `/account` | Order history and account details *(login required)* |
| `/login` | Sign in |
| `/register` | Create an account |

---

## Key API Endpoints

All calls go through `http://localhost:3000`. The gateway strips `/api/<service>/` before forwarding.

### Auth
```
POST /api/auth/auth/register   — create account
POST /api/auth/auth/login      — returns { token, user }
```

### Products
```
GET  /api/products/get_all_products/          — all 685 products
GET  /api/products/get_product/{product_id}   — single product
```

### Cart *(requires Authorization: Bearer <token>)*
```
GET  /api/cart/cart/{user_id}                        — view cart
POST /api/cart/cart/{user_id}/add                    — add items
POST /api/cart/cart/{user_id}/remove/{product_id}    — remove item
POST /api/cart/checkout/{user_id}                    — place order
GET  /api/cart/transactions/{user_id}                — order history
```

### Search
```
GET /api/search/product_semantic_search?query=wireless headphones under £50&top_k=24
GET /api/search/recommendations
```

### AI Assistant
```
POST /api/assistant/chat      — send message, get reply + product cards
GET  /api/assistant/health    — check Gemini connectivity
```

**Chat request body:**
```json
{
  "message": "I want headphones under £50",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }],
  "product_context": null,
  "user_id": null,
  "auth_token": null
}
```

**Chat response:**
```json
{
  "response": "Here are some great picks for you!",
  "options": ["Wireless", "Wired"],
  "products": [{ "product_id": 123, "name": "...", "price": 12.99, "rating": 4.1, ... }]
}
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Axios, FontAwesome |
| Backend | FastAPI 0.115, Python 3.11, Uvicorn |
| Auth | JWT (HS256), bcrypt |
| Database | MongoDB 7, Motor (async driver) |
| AI Assistant | Google Gemini 2.0 Flash via REST API |
| Search | Custom local scoring engine (name + category + price matching) |
| Infrastructure | Docker, Docker Compose, Nginx |

---

## Project Structure

```
Ecommerce-Microservices/
├── ecommerce-auth/          # Auth service
├── products/                # Product catalogue service
├── cart/                    # Cart & orders service
├── recommendation_and_search_system/  # Search service
├── ai_assistant/            # Vera AI assistant service
├── mongo-init/              # One-time DB seed (685 products)
├── Frontend/                # React app + Nginx config
│   └── nginx.conf           # API gateway routing rules
└── docker-compose.yml       # Orchestrates everything
```

---

## Troubleshooting

**Products not loading on first run**
The seed container needs MongoDB to be healthy first. Wait ~30 seconds and refresh. If it still fails: `docker-compose down -v && docker-compose up --build`

**Vera says "I'm a little busy"**
Gemini free tier quota exhausted. Either wait for midnight UTC reset or add billing at [aistudio.google.com](https://aistudio.google.com).

**Login not working after restart**
JWT tokens expire after 30 minutes. Sign in again. Persistent "invalid token" errors usually mean `JWT_SECRET_KEY` changed between restarts — clear localStorage in the browser.

**Port 3000 already in use**
Change the port in `docker-compose.yml`: `"3001:80"` under the `frontend` service, then access `http://localhost:3001`.
