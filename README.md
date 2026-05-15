# Velour — UK E-Commerce Microservices Platform

Velour is a full-stack UK online marketplace built with a microservices architecture. It sells products across 16 categories — electronics, fashion, beauty, home, sports, and more — and includes an AI-powered shopping assistant called **Vera**, which uses Google Gemini to help customers find products, track orders, and get support through a floating chat interface.

The backend is composed of five independent FastAPI services. The frontend is a React single-page application served by Nginx, which also acts as an API gateway — routing all browser requests through a single port so no service ports need to be exposed to end users.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Repository Structure](#repository-structure)
4. [Services Overview](#services-overview)
5. [Technology Stack](#technology-stack)
6. [Prerequisites](#prerequisites)
7. [Getting Started](#getting-started)
8. [Environment Variables](#environment-variables)
9. [API Reference](#api-reference)
10. [Frontend Pages](#frontend-pages)
11. [AI Assistant — Vera](#ai-assistant--vera)
12. [Search System](#search-system)
13. [Database Schema](#database-schema)
14. [Troubleshooting](#troubleshooting)

---

## Features

- **Product catalogue** — 685 products seeded from a JSON file into MongoDB on first run, spanning 16 categories
- **Search** — Free-text search with natural language price constraints (e.g. "wireless headphones under £50"), category alias resolution, and multi-factor relevance scoring
- **Authentication** — JWT-based register and login; tokens expire after 30 minutes
- **Shopping cart** — Add, remove, and update items; stock is validated and decremented atomically on each cart operation
- **Checkout and orders** — Place orders with a choice of payment method; view full order history
- **AI Shopping Assistant (Vera)** — Floating chat widget powered by Google Gemini; shows clickable product cards with images, ratings, and prices; understands product context when browsing a product page; accesses order history when logged in
- **UK localisation** — All prices in GBP (£) converted from the source INR data at 106:1; `en-GB` date and number formatting throughout
- **Responsive design** — Works on desktop and mobile; Poppins body font, Playfair Display for headings

---

## Architecture

All browser traffic enters through port 3000. The Nginx container serves the React application for page requests and proxies all `/api/*` requests to the appropriate backend service. Backend services communicate with each other over Docker's internal bridge network and are never directly reachable from the browser.

```text
                                Browser
                         http://localhost:3000
                                      │
                                      ▼

                 ┌────────────────────────────────┐
                 │       Nginx (port 3000)        │
                 │    React SPA + API Gateway     │
                 └────────────────────────────────┘
                                      │
                        Routing by URL path prefix
                                      │

 ┌──────────────┬──────────────┬──────────────┬────────────────────────────┐
 │              │              │              │                            │
 ▼              ▼              ▼              ▼                            ▼

/api/auth/   /api/products/   /api/cart/   /api/search/           /api/assistant/

 │              │              │              │                             │
 ▼              ▼              ▼              ▼                             ▼

┌───────────┐ ┌────────────┐ ┌───────────┐ ┌────────────────┐ ┌───────────────┐
│   Auth    │ │ Products   │ │   Cart    │ │ Search &       │ │   Vera AI     │
│  Service  │ │  Service   │ │  Service  │ │ Recommendation │ │  Assistant    │
│   :8004   │ │   :8001    │ │   :8002   │ │   Service      │ │    :8005      │
└─────┬─────┘ └─────┬──────┘ └─────┬─────┘ │    :8003       │ └─────────────-─┘
      │             │              │       └────────┬───────┘          │
      ▼             ▼              ▼                │                  │
                                                    |                  |
 ┌─────────┐   ┌─────────────┐   ┌─────────┐        │                  │
 │ auth_db │   │ products_db │   │ cart_db │        │                  │
 └─────────┘   └─────────────┘   └─────────┘        │                  │
                                                    │                  │
                                      ┌──────────────▼────────────┐    │
                                      │ Calls Products API        │    │
                                      │ for recommendation data   │    │
                                      └───────────────────────────┘    │
                                                                       │
                                               ┌───────────────────────▼──────────────────────┐
                                               │ Calls Gemini API + Products API + Cart API   │
                                               └──────────────────────────────────────────────┘
```
```

**Key design decisions:**

- **Single entry point.** By routing everything through the Nginx gateway, there are no CORS issues — all API requests come from the same origin (port 3000). Backend services do not need `Access-Control-Allow-Origin` headers.
- **Database isolation.** Each service owns its own MongoDB database (`auth_db`, `products_db`, `cart_db`). No service queries another service's database directly; data is shared only through HTTP API calls.
- **Atomic stock updates.** When the Cart Service adds an item, it calls `PATCH /update_stock` on the Products Service. This uses a single MongoDB `find_one_and_update` with the filter `{ stock: { $gte: quantity } }`, ensuring two simultaneous buyers of the last item cannot both succeed — one will receive a 409 Conflict.
- **JWT ownership checks.** Cart endpoints extract the `user_id` from the JWT token and verify it matches the `user_id` in the request URL, so a logged-in user cannot access or modify another user's cart.

---

## Repository Structure

```
Ecommerce-Microservices/
│
├── ecommerce-auth/                 # Authentication service
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS configuration, router mount
│   │   ├── routes/user.py          # POST /register and POST /login endpoints
│   │   ├── auth.py                 # bcrypt password hashing and JWT creation/decoding
│   │   ├── models.py               # Pydantic models: UserRegister, UserLogin
│   │   ├── database.py             # MongoDB connection → auth_db
│   │   └── config.py               # Environment variable loading
│   ├── Dockerfile
│   └── requirements.txt
│
├── products/                       # Product catalogue service
│   ├── main.py                     # All product CRUD endpoints
│   ├── models.py                   # Product Pydantic model
│   ├── dependencies/
│   │   └── auth.py                 # Reusable JWT verification FastAPI dependency
│   ├── Dockerfile
│   └── requirements.txt
│
├── cart/                           # Cart and order service
│   ├── main.py                     # App factory: mounts routers, sets up DB and CORS
│   ├── models.py                   # CartItem, Order, PaymentMethod Pydantic models
│   ├── routers/
│   │   ├── cart.py                 # Cart management endpoints
│   │   └── orders.py               # Checkout and order history endpoints
│   ├── dependencies/
│   │   └── auth.py                 # JWT verification dependency
│   ├── Dockerfile
│   └── requirements.txt
│
├── recommendation_and_search_system/
│   ├── main.py                     # Search scoring engine and recommendations logic
│   ├── models.py                   # Product Pydantic model
│   ├── Dockerfile
│   └── requirements.txt
│
├── ai_assistant/                   # Vera AI shopping assistant
│   ├── main.py                     # Gemini API integration, chat endpoint, product context
│   ├── Dockerfile
│   └── requirements.txt
│
├── mongo-init/                     # One-time database seeding
│   ├── seed.py                     # Reads products.json and inserts into products_db
│   ├── products.json               # 685 product records (source data in INR)
│   └── Dockerfile
│
├── Frontend/                       # React single-page application
│   ├── public/
│   │   └── index.html              # HTML shell, Google Fonts, page title
│   ├── src/
│   │   ├── App.js                  # Root component, React Router setup, context providers
│   │   ├── App.css                 # Global CSS custom properties (design tokens)
│   │   ├── pages/                  # One component per route
│   │   │   ├── HomePage.js         # Hero slider, categories, search, recommendations
│   │   │   ├── AllProductsPage.js  # Full product listing with filters
│   │   │   ├── ProductPage.js      # Product detail with quantity selector
│   │   │   ├── CategoryPage.js     # Category listing with price slider
│   │   │   ├── CartPage.js         # Cart review and totals
│   │   │   ├── CheckoutPage.js     # Payment selection and confirmation
│   │   │   ├── AccountPage.js      # Order history and account info
│   │   │   ├── LoginPage.js        # Login form
│   │   │   └── RegisterPage.js     # Registration form
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Header.js/.css      # Navigation, cart icon, sign-in button
│   │   │   ├── Footer.js/.css      # Links, contact info, copyright
│   │   │   ├── ProductCard.js/.css # Product thumbnail with hover cart button
│   │   │   ├── HeroSlider.js/.css  # Auto-playing homepage hero banner
│   │   │   ├── ChatWidget.js/.css  # Vera AI floating chat bubble and window
│   │   │   └── ScrollToTop.js      # Scrolls to top on route change
│   │   ├── context/
│   │   │   ├── AuthContext.js      # Global auth state (user, token, login, logout)
│   │   │   └── CartContext.js      # Global cart state with localStorage persistence
│   │   ├── services/
│   │   │   └── api.js              # Axios instances using relative /api/* paths
│   │   └── utils/
│   │       └── priceUtils.js       # toGBP() and formatPrice() helpers
│   ├── nginx.conf                  # API gateway proxy rules + SPA fallback
│   ├── Dockerfile                  # Multi-stage build: Node 18 → Nginx alpine
│   └── package.json
│
├── docker-compose.yml              # Orchestrates all 7 containers
└── README.md
```

---

## Services Overview

### 1. Auth Service

**Internal port:** 8000 | **Gateway path:** `/api/auth/`

Handles user registration and login. Passwords are hashed with **bcrypt** before being stored — plain-text passwords are never persisted. On successful register or login, the service issues a signed JWT token containing the user's email and MongoDB `_id`. This token is used by the frontend for all subsequent authenticated requests.

Tokens are signed with the **HS256** algorithm using a secret key configured via `JWT_SECRET_KEY` and expire after 30 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`).

---

### 2. Products Service

**Internal port:** 8000 | **Gateway path:** `/api/products/`

Manages the full product catalogue. On first startup, 685 products are inserted into `products_db` by the seed container. The Products Service then serves and manages these records.

- **Read endpoints** (`GET`) are public — no authentication required.
- **Write endpoints** (`PUT`, `POST`, `DELETE`) require a valid JWT.
- **Stock updates** (`PATCH /update_stock`) are called internally by the Cart Service. The update is atomic: MongoDB's `find_one_and_update` with a conditional filter ensures stock never goes below zero, even under concurrent requests. If stock is insufficient, the endpoint returns **HTTP 409 Conflict**.

---

### 3. Cart Service

**Internal port:** 8000 | **Gateway path:** `/api/cart/`

Manages shopping carts and completed orders. The service is split into two routers to keep the two concerns separate:

- **`routers/cart.py`** handles the temporary cart state: adding items, removing items, fetching the cart, and clearing it.
- **`routers/orders.py`** handles permanent records: placing an order (checkout) and fetching order history (transactions).

**All cart endpoints require a valid JWT.** The service extracts `user_id` from the token and checks it matches the `user_id` in the URL — a user cannot read or modify another user's cart.

When an item is added to the cart, the service validates that stock is available and calls `PATCH /update_stock` on the Products Service to atomically decrement it. If an item is removed, the stock is restored.

---

### 4. Recommendation and Search Service

**Internal port:** 8000 | **Gateway path:** `/api/search/`

Provides two public endpoints:

- **Product search** — Accepts a free-text query and returns the most relevant products using a local multi-factor scoring algorithm (described in detail in the [Search System](#search-system) section).
- **Category recommendations** — Fetches all in-stock products from the Products Service, groups them by `main_category`, and returns the top-rated products per category. This powers the recommendation strips on the homepage.

This service has **no direct database connection**. All product data is retrieved via the Products Service API, keeping data access properly encapsulated.

---

### 5. AI Assistant Service (Vera)

**Internal port:** 8000 | **Gateway path:** `/api/assistant/`

Powers the floating chat widget on every page of the website. When a user sends a message:

1. The service checks whether the query is product-related. If so, it calls the Search Service to fetch relevant products from the catalogue.
2. If the query is order-related and the user is logged in, it fetches the user's order history from the Cart Service.
3. If the user is on a product page, the frontend sends that product's data as context.
4. All collected context is added to the system prompt and sent to the **Google Gemini API**, which generates a structured JSON response containing a conversational reply, optional clickable choice buttons, and optionally a list of product IDs to display as visual cards.
5. The service matches those product IDs back to the full product records and returns rich product data (image, price, rating, discount) to the frontend for rendering.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18, React Router v6 |
| Frontend HTTP | Axios (relative `/api/*` paths — no hardcoded ports) |
| UI icons | FontAwesome 6 (solid set) |
| Fonts | Poppins (body), Playfair Display (headings) — Google Fonts |
| Backend framework | FastAPI 0.115, Python 3.11, Uvicorn |
| Password hashing | bcrypt via passlib |
| Authentication | JWT (HS256) via python-jose |
| Database | MongoDB 7 |
| Async DB driver | Motor 3.7 |
| Inter-service HTTP | httpx 0.28 (async) |
| AI assistant | Google Gemini 2.0 Flash (configurable model) via REST API |
| Search engine | Custom local scoring (primary); Hugging Face sentence-transformers (optional fallback) |
| Web server / gateway | Nginx alpine |
| Containerisation | Docker, Docker Compose |

---

## Prerequisites

Before running the project, make sure the following are installed on your machine:

- **Docker** — [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** — included with Docker Desktop on Mac and Windows; install separately on Linux

You do not need Python, Node.js, or MongoDB installed locally. Everything runs inside Docker containers.

You will also need:

- A **Google Gemini API key** for the AI assistant. Get one for free at [aistudio.google.com](https://aistudio.google.com) — click **Get API key**. The free tier allows approximately 1,500 requests per day on `gemini-2.0-flash`, which is sufficient for normal use.

---

## Getting Started

### Step 1 — Clone the repository

```bash
git clone https://github.com/Lohit20/Ecommerce-Microservices.git
cd Ecommerce-Microservices
```

### Step 2 — Create your environment file

Create a file named `.env` in the root directory (the same folder as `docker-compose.yml`):

```env
# Secret key used to sign and verify JWT tokens.
# Replace this with any long random string — keep it secret.
JWT_SECRET_KEY=replace_this_with_a_long_random_secret_string

# Your Google Gemini API key for the Vera AI assistant.
# Get a free key at: https://aistudio.google.com
GEMINI_API_KEY=your_gemini_api_key_here

# (Optional) Override the Gemini model. Default is gemini-2.0-flash.
# GEMINI_MODEL=gemini-2.0-flash
```

> **Security note:** Never commit your `.env` file to version control. The `.gitignore` should exclude it. The `JWT_SECRET_KEY` default in `docker-compose.yml` is intentionally weak — always override it via the `.env` file.

### Step 3 — Build and start all services

```bash
docker-compose up --build
```

The first run will take approximately 2–3 minutes as Docker builds all service images and seeds the database. You will see log output from each container. When you see `frontend` logs from Nginx, everything is ready.

On subsequent runs (when images are already built and the database is already seeded), startup takes around 10–15 seconds:

```bash
docker-compose up
```

### Step 4 — Open the application

Visit [http://localhost:3000](http://localhost:3000) in your browser.

That is the only URL you need. Everything — the website, the APIs, and the AI assistant — is accessible through port 3000.

---

### Startup Order

Docker Compose starts the containers in a specific order to ensure dependencies are ready:

1. **MongoDB** starts first and waits until its health check passes.
2. **Seed container** runs once to insert 685 products into `products_db`, then exits. If the data already exists, it skips the insert and exits cleanly.
3. **Products Service** starts after the seed completes successfully.
4. **Auth Service** starts after MongoDB is healthy.
5. **Cart Service** starts after the Products Service is available.
6. **Recommendation Service** starts after the Products Service is available.
7. **AI Assistant Service** starts after the Products and Cart services are available.
8. **Frontend** starts last, after all backend services are running.

---

### Stopping the application

To stop all containers:
```bash
docker-compose down
```

To stop and remove all data (wipes the database — useful for a fresh start):
```bash
docker-compose down -v
```

---

## Environment Variables

The following environment variables are read by the services. They can be set in the `.env` file in the project root, and Docker Compose will pass them through automatically.

| Variable | Used By | Description | Default (docker-compose) |
|----------|---------|-------------|--------------------------|
| `JWT_SECRET_KEY` | Auth, Products, Cart | Secret key for signing and verifying JWT tokens. Must be the same value across all services. | `supersecretkey_changeme_in_production` |
| `ALGORITHM` | Auth, Products, Cart | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Auth | How long tokens remain valid | `30` |
| `MONGO_URI` | Auth, Products, Cart | MongoDB connection string | `mongodb://mongodb:27017` |
| `PRODUCTS_SERVICE_URL` | Cart, Recommendation, Assistant | Internal URL of the Products Service | `http://products_service:8000` |
| `CART_SERVICE_URL` | Assistant | Internal URL of the Cart Service | `http://cart_service:8000` |
| `RECOMMENDATION_SERVICE_URL` | Assistant | Internal URL of the Recommendation Service | `http://recommendation_service:8000` |
| `GEMINI_API_KEY` | Assistant | Google Gemini API key for Vera | *(must be set)* |
| `GEMINI_MODEL` | Assistant | Gemini model to use | `gemini-2.0-flash` |
| `HF_API_TOKEN` | Recommendation | Hugging Face token for optional semantic search fallback | *(empty — not required)* |

---

## API Reference

All API endpoints are accessed through the Nginx gateway at `http://localhost:3000`. The gateway strips the `/api/<service>/` path prefix before forwarding the request to the backend service.

Individual service ports (8001–8005) are also exposed for development and debugging, but are not needed during normal use.

---

### Authentication — `/api/auth/`

#### Register a new user

```
POST /api/auth/auth/register
```

**Request body:**
```json
{
  "username": "jane_smith",
  "email": "jane@example.co.uk",
  "password": "yourpassword",
  "address": "42 Baker Street, London, W1U 7BW",
  "phone_number": "+44 7700 900123"
}
```

**Response (200 OK):**
```json
{
  "token": "<jwt_token>",
  "token_type": "bearer",
  "user": {
    "id": "64f1c2d3e4b5f6a7b8c9d0e1",
    "username": "jane_smith",
    "email": "jane@example.co.uk",
    "address": "42 Baker Street, London, W1U 7BW",
    "phone_number": "+44 7700 900123"
  }
}
```

**Error responses:**
- `400 Bad Request` — Email address is already registered.

---

#### Log in

```
POST /api/auth/auth/login
```

**Request body:**
```json
{
  "email": "jane@example.co.uk",
  "password": "yourpassword"
}
```

**Response (200 OK):** Same shape as the register response above.

**Error responses:**
- `401 Unauthorized` — Incorrect email or password.

---

### Products — `/api/products/`

#### Get all products

```
GET /api/products/get_all_products/
```

Returns all 685 products as a JSON array. No authentication required.

---

#### Get a single product

```
GET /api/products/get_product/{product_id}
```

Returns the full product object for the given numeric `product_id`. No authentication required.

**Error responses:**
- `404 Not Found` — No product with that ID exists.

---

#### Update stock quantity

```
PATCH /api/products/update_stock/{product_id}
```

Called internally by the Cart Service. Uses an atomic MongoDB operation to prevent stock going below zero.

**Request body:**
```json
{ "quantity": -2 }
```

Use negative values to decrement stock (when adding to cart) and positive values to increment (when removing from cart).

**Error responses:**
- `409 Conflict` — Insufficient stock for the requested decrement.
- `404 Not Found` — Product does not exist.

---

#### Update product details *(requires authentication)*

```
PUT /api/products/update_product/{product_id}
```

**Request headers:**
```
Authorization: Bearer <jwt_token>
```

**Request body:** Any subset of product fields to update (e.g. `{ "actual_price": 2500, "stock": 100 }`).

---

#### Add a new product *(requires authentication)*

```
POST /api/products/insert_new_product/
```

**Request headers:**
```
Authorization: Bearer <jwt_token>
```

**Request body:** Full product object matching the product schema.

---

#### Delete a product *(requires authentication)*

```
DELETE /api/products/delete_product/{product_id}
```

**Request headers:**
```
Authorization: Bearer <jwt_token>
```

---

### Cart and Orders — `/api/cart/`

All cart and order endpoints require a valid JWT. The `user_id` in the JWT payload must match the `{user_id}` in the URL path, otherwise the request is rejected with 403 Forbidden.

**Required header for all cart endpoints:**
```
Authorization: Bearer <jwt_token>
```

---

#### Get the user's cart

```
GET /api/cart/cart/{user_id}
```

Returns the current cart contents, including product details and quantities.

---

#### Add items to the cart

```
POST /api/cart/cart/{user_id}/add
```

**Request body** (array of items):
```json
[
  { "product_id": 83919804, "quantity": 1 },
  { "product_id": 46354382, "quantity": 2 }
]
```

The service validates stock availability and decrements it atomically. Returns an error if any item has insufficient stock.

---

#### Remove an item from the cart

```
POST /api/cart/cart/{user_id}/remove/{product_id}
```

Removes the specified product from the cart and restores the stock quantity.

---

#### Clear the entire cart

```
POST /api/cart/cart/{user_id}/clear
```

Removes all items from the cart and restores stock for each item.

---

#### Place an order (checkout)

```
POST /api/cart/checkout/{user_id}
```

**Request body** (the payment method as a plain string):
```json
"credit_card"
```

Available payment methods: `credit_card`, `paypal`, `cod`

Creates an order record in `cart_db.transactions`, then clears the cart. Returns the order summary.

---

#### Get order history

```
GET /api/cart/transactions/{user_id}
```

Returns an array of all past orders for the user, ordered by date.

---

### Search and Recommendations — `/api/search/`

These endpoints are public and require no authentication.

---

#### Search products

```
GET /api/search/product_semantic_search?query=<search_term>&top_k=<number>
```

**Query parameters:**
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `query` | Yes | — | Free-text search query |
| `top_k` | No | `24` | Maximum number of results to return |

The search engine supports natural language queries. See the [Search System](#search-system) section for a full explanation of how scoring works.

**Example queries:**
```
/api/search/product_semantic_search?query=wireless headphones under £50
/api/search/product_semantic_search?query=yoga mat for beginners&top_k=10
/api/search/product_semantic_search?query=womens running shoes
```

---

#### Get homepage recommendations

```
GET /api/search/recommendations?top_n=<number>
```

Returns the top-rated in-stock products for each category, grouped by `main_category`. Used by the homepage to populate the recommendation strips.

**Query parameters:**
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `top_n` | No | `5` | Number of products to return per category |

---

### AI Assistant — `/api/assistant/`

#### Check assistant health

```
GET /api/assistant/health
```

Returns the assistant's status and whether it can reach the Gemini API.

**Response:**
```json
{
  "status": "ok",
  "provider": "gemini",
  "model": "gemini-2.0-flash",
  "api_key_configured": true
}
```

---

#### Send a chat message

```
POST /api/assistant/chat
```

**Request body:**
```json
{
  "message": "I want headphones under £50",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I help you today?" }
  ],
  "product_context": null,
  "user_id": null,
  "auth_token": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | The user's current message |
| `history` | array | Previous conversation turns (last 6 are sent to Gemini) |
| `product_context` | object or null | The full product object if the user is on a product page |
| `user_id` | string or null | The logged-in user's ID (for fetching order history) |
| `auth_token` | string or null | The user's JWT token (for authenticated order lookups) |

**Response:**
```json
{
  "response": "Here are some great picks for you!",
  "options": ["Wireless", "Wired", "True wireless"],
  "products": [
    {
      "product_id": 46354382,
      "name": "boAt Rockerz 330 Bluetooth Wireless in Ear Earphones",
      "image": "https://...",
      "sub_category": "Headphones",
      "price": 10.37,
      "was": 37.64,
      "discount_pct": 72,
      "rating": 4.1,
      "no_of_ratings": 114950,
      "stock": 54
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `response` | Vera's conversational reply text |
| `options` | Clickable choice buttons (empty array if no clarifying question) |
| `products` | Product cards to display below the reply (empty array if no products recommended) |

---

## Frontend Pages

| Route | Page | Login Required |
|-------|------|----------------|
| `/` | **Home** — hero banner, USP strip (free delivery, returns, authenticity), category grid, live search with results, Top Rated and Best Deals sections, per-category recommendation strips | No |
| `/shop` | **All Products** — complete catalogue with filters for category, price range, and minimum rating; sort by price or rating | No |
| `/product/:id` | **Product Detail** — image gallery, full description, star rating, stock level, quantity selector, Add to Cart button, related products | No |
| `/category/:name` | **Category Page** — products filtered to a single category, with price range slider and sort controls | No |
| `/cart` | **Cart** — list of items with quantity controls, subtotal, and proceed to checkout button | No |
| `/checkout` | **Checkout** — select payment method, review order summary, place order | **Yes** |
| `/account` | **Account** — view account details and full order history | **Yes** |
| `/login` | **Login** — email and password sign-in form | No |
| `/register` | **Register** — create a new account | No |

Pages marked as login required redirect to `/login` if the user is not authenticated. After login, the user is redirected back to their original destination.

---

## AI Assistant — Vera

Vera is the AI shopping assistant integrated into every page as a floating chat bubble (bottom-right corner). It is powered by Google Gemini and is designed to behave like a knowledgeable sales assistant.

### How to use

1. Click the blue chat bubble in the bottom-right corner of any page.
2. Type a message or tap one of the suggestion buttons that appear in the opening greeting.
3. When Vera asks a clarifying question (e.g. "Are you looking for men's or women's clothing?"), clickable option buttons appear below her message — tap one to answer without typing.
4. Product recommendations appear as visual cards with images, ratings, prices, and direct links to the product page.

### What Vera can do

| Query type | Example | What happens |
|-----------|---------|--------------|
| Product search | "I want headphones under £50" | Searches the catalogue and shows matching product cards |
| Clarifying questions | "I want a shirt" | Asks follow-up questions via option buttons before recommending |
| Product Q&A | Asked on a product page | Uses that product's data to answer questions about it |
| Order history | "Where is my order?" (logged in) | Looks up and displays your recent orders |
| Policy questions | "What is your return policy?" | Answers from Velour's policy data in the system prompt |
| General support | "How do I contact you?" | Provides support email and phone number |

### Gemini API quota

The Vera assistant uses the Google Gemini API. The free tier allows approximately **1,500 requests per day** on `gemini-2.0-flash`. If the quota is exhausted, Vera will respond with "I'm a little busy right now — please try again in a moment." The quota resets at midnight UTC.

To remove quota limits, add billing to your Google AI Studio project at [aistudio.google.com](https://aistudio.google.com).

---

## Search System

The search engine is built entirely in Python and runs inside the Recommendation Service. It scores every product against the query and returns the top matches — no external search index is required.

### How scoring works

Each product receives a relevance score based on the following factors:

| Signal | Points |
|--------|--------|
| Exact query phrase in product name | +150 |
| Each search word found in product name | +30 per word |
| Search word at start of product name | +10 bonus |
| Search word in sub-category | +22 per word |
| Search word in main category | +15 per word |
| Category alias match (see below) | +25 per word |
| Product is within the price ceiling | +40 bonus |
| Product is well over the price ceiling | ×0.15 penalty |
| Rating (tiebreaker) | rating × 4 |
| Popularity (tiebreaker) | up to +5 (based on review count) |
| Discount depth (tiebreaker) | up to +12 |

Products with a score of zero are excluded. The remaining products are sorted by score and the top `top_k` are returned.

### Category aliases

The engine maps common search words to their canonical category names, so searches like "headphones", "bluetooth", or "earphones" all correctly match the "TV, Audio & Cameras" category. Some examples:

| Search word | Maps to category |
|------------|-----------------|
| `headphones`, `earphones`, `bluetooth`, `wireless` | TV, Audio & Cameras |
| `kitchen`, `cookware` | Home & Kitchen |
| `yoga`, `gym`, `workout`, `running` | Sports & Fitness |
| `fridge`, `washing`, `microwave` | Appliances |
| `skincare`, `makeup`, `perfume` | Beauty & Health |
| `bag`, `backpack`, `suitcase` | Bags & Luggage |
| `dog`, `cat`, `pet` | Pet Supplies |
| `shoes`, `trainers`, `sneakers`, `boots` | Men's Shoes |

### Price constraint parsing

The engine automatically detects price limits in natural language queries:

```
"wireless headphones under £50"   → only scores products priced ≤ £50
"laptop below £400"                → only scores laptops priced ≤ £400
"yoga mat less than £25"           → only scores mats priced ≤ £25
```

Patterns recognised: `under`, `below`, `less than`, `max`, `cheaper than`, `budget of` — followed by an optional `£` or `$` symbol and a number.

### Hugging Face fallback (optional)

If a `HF_API_TOKEN` is configured and a query returns fewer than 6 local results, the service makes a single call to the Hugging Face `sentence-transformers/all-MiniLM-L6-v2` model for semantic similarity scoring across the first 300 products. This is an optional enhancement — the local engine works well on its own for the vast majority of queries.

---

## Database Schema

Each service owns its own isolated MongoDB database. No service reads another service's database directly.

### `auth_db.users`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | MongoDB auto-generated primary key |
| `username` | String | Display name |
| `email` | String | Unique — used as login identifier |
| `password` | String | bcrypt hash — the plain-text password is never stored |
| `address` | String | Delivery address |
| `phone_number` | String | Contact number |

---

### `products_db.products`

| Field | Type | Notes |
|-------|------|-------|
| `product_id` | Integer | Unique numeric ID (from source data) |
| `name` | String | Full product name |
| `main_category` | String | Top-level category (e.g. "TV, Audio & Cameras") |
| `sub_category` | String | More specific category (e.g. "Headphones") |
| `image` | String | URL to product image (hosted on Amazon CDN) |
| `ratings` | Float | Average star rating (0.0 – 5.0) |
| `no_of_ratings` | Integer | Total number of customer reviews |
| `actual_price` | Float | Original price in INR |
| `discount_price` | Float | Discounted price in INR |
| `stock` | Integer | Current stock level; updated atomically on cart operations |

All prices are stored in INR and converted to GBP at 106:1 in the frontend using the `toGBP()` utility.

---

### `cart_db.carts`

| Field | Type | Notes |
|-------|------|-------|
| `user_id` | String | MongoDB `_id` of the user (as string) |
| `items` | Array | Each item: `{ product_id, quantity, price }` |
| `updated_at` | DateTime | Last modification timestamp |

---

### `cart_db.transactions`

| Field | Type | Notes |
|-------|------|-------|
| `order_id` | Integer | Auto-incremented order number |
| `user_id` | String | MongoDB `_id` of the user (as string) |
| `product_cart` | Array | Snapshot of items at time of order: `{ product_id, name, quantity, price }` |
| `total_amount` | Float | Total order value in INR |
| `payment_method` | String | `credit_card`, `paypal`, or `cod` |
| `created_at` | DateTime | Order placement timestamp |

---

## Troubleshooting

### Products are not showing on first run

The seed container needs MongoDB to be fully healthy before it can insert data. If products are missing, wait 30 seconds and refresh the page. If the problem persists, restart everything with a fresh database:

```bash
docker-compose down -v
docker-compose up --build
```

The `-v` flag removes the MongoDB data volume, forcing a clean seed on the next start.

---

### Vera says "I'm a little busy right now"

This means the Gemini API has returned a 429 rate-limit error. The free tier allows approximately 1,500 requests per day. After extensive use (including development and testing), this quota can be exhausted.

**Solutions:**
- Wait for the quota to reset at midnight UTC — it will start working automatically.
- Add billing to your Google AI Studio account at [aistudio.google.com](https://aistudio.google.com) to increase the limit significantly.

---

### Login stops working after a restart

JWT tokens expire after 30 minutes. If you are logged in and the token expires, you will be redirected to the login page — simply sign in again.

If you see an "invalid token" error immediately after logging in, it usually means the `JWT_SECRET_KEY` in your `.env` file changed between runs. The token was signed with the old key and cannot be verified with the new one. Clear your browser's localStorage (open DevTools → Application → Local Storage → clear all) and log in again.

---

### Port 3000 is already in use

Change the port in `docker-compose.yml`:

```yaml
frontend:
  ports:
    - "3001:80"   # change 3000 to any available port
```

Then access the site at `http://localhost:3001`.

---

### A backend service fails to start

Check the logs for that specific service:

```bash
docker logs products_service
docker logs cart_service
docker logs auth_service
docker logs recommendation_service
docker logs assistant_service
```

Common causes:
- MongoDB is not yet healthy — the service will restart automatically once it is.
- A required environment variable (`JWT_SECRET_KEY`, `GEMINI_API_KEY`) is missing from the `.env` file.
- A Python dependency is missing from `requirements.txt` — run `docker-compose up --build` to rebuild the image.

---

### Making API calls directly (for development)

When running the full stack with Docker Compose, the individual service ports are also exposed:

| Service | Direct URL |
|---------|-----------|
| Products | `http://localhost:8001` |
| Cart | `http://localhost:8002` |
| Recommendation | `http://localhost:8003` |
| Auth | `http://localhost:8004` |
| AI Assistant | `http://localhost:8005` |

You can also view the auto-generated API documentation for any service at:
```
http://localhost:8001/docs   # Products service Swagger UI
http://localhost:8002/docs   # Cart service Swagger UI
```
