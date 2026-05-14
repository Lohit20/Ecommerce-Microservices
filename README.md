# E-Commerce Microservices Platform

A full-stack e-commerce application built with a microservices architecture. The backend is composed of four independent FastAPI services, each owning its own database and responsible for a distinct domain. The frontend is a React single-page application whose Nginx container also acts as an API gateway, routing all requests through a single entry point.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Repository Structure](#repository-structure)
3. [Services Overview](#services-overview)
4. [Technology Stack](#technology-stack)
5. [Prerequisites](#prerequisites)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [API Reference](#api-reference)
9. [Frontend Routes](#frontend-routes)
10. [Database Schema](#database-schema)
11. [Future Enhancements](#future-enhancements)

---

## Architecture

All traffic enters through a single port (3000). The frontend's Nginx container acts as an API gateway, proxying requests to the appropriate backend service by path prefix. Backend services communicate with each other over Docker's internal bridge network and are not directly reachable from the browser.

```
                     Browser
                        │
                        ▼
            ┌───────────────────────┐
            │  Frontend + Gateway   │
            │  Nginx — port 3000    │
            └───────────┬───────────┘
                        │  routes by path prefix
         ┌──────────────┼──────────────┬─────────────────┐
         │              │              │                  │
         ▼              ▼              ▼                  ▼
  /api/auth/     /api/products/   /api/cart/        /api/search/
         │              │              │                  │
┌────────▼──────┐ ┌─────▼──────┐ ┌────▼───────┐ ┌───────▼──────────┐
│ Auth Service  │ │  Products  │ │    Cart    │ │  Recommendation  │
│  :8000        │ │  Service   │ │  Service   │ │  Service  :8000  │
│               │ │  :8000     │ │  :8000     │ │                  │
└───────┬───────┘ └─────┬──────┘ └─────┬──────┘ └───────┬──────────┘
        │               │              │                 │
        ▼               ▼              │    HTTP call    │
   ┌─────────┐    ┌──────────┐         └────────────────▶│
   │ auth_db │    │products_db│              /get_all_   │
   └─────────┘    └──────────┘         ┌────products/────┘
                        ▲              ▼
                        │       ┌──────────┐
              /update_stock/    │  cart_db │
                        │       └──────────┘
                        └──────────────┘
                     Cart → Products
                  (atomic stock updates)
```

**Key design decisions:**
- The frontend Nginx proxy eliminates CORS issues — all API requests originate from the same origin.
- Stock updates use MongoDB's atomic `find_one_and_update` with a conditional filter, preventing race conditions under concurrent load.
- Every cart and order endpoint requires a valid JWT. The token is verified server-side, and user ownership is checked — a user cannot read or modify another user's cart.
- Each service owns an isolated database (`auth_db`, `products_db`, `cart_db`). The Recommendation Service fetches product data via the Products Service API rather than reading the database directly.

---

## Repository Structure

```
Ecommerce-Microservices/
│
├── ecommerce-auth/                 # Authentication service
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry point, CORS
│   │   ├── routes/user.py          # /register and /login endpoints
│   │   ├── auth.py                 # bcrypt hashing, JWT create/decode
│   │   ├── models.py               # UserRegister, UserLogin, TokenData
│   │   ├── database.py             # MongoDB connection → auth_db
│   │   └── config.py               # Environment variable loading
│   ├── Dockerfile
│   └── requirements.txt
│
├── products/                       # Product catalog service
│   ├── main.py                     # FastAPI app, all product endpoints
│   ├── models.py                   # Product Pydantic model
│   ├── dependencies/
│   │   └── auth.py                 # JWT verification dependency
│   ├── Dockerfile
│   └── requirements.txt
│
├── cart/                           # Cart and order service
│   ├── main.py                     # App factory — mounts routers, DB setup
│   ├── models.py                   # CartItem, Order, PaymentMethod models
│   ├── routers/
│   │   ├── cart.py                 # Cart endpoints (add, remove, get, clear)
│   │   └── orders.py               # Order endpoints (checkout, transactions)
│   ├── dependencies/
│   │   └── auth.py                 # JWT verification dependency
│   ├── Dockerfile
│   └── requirements.txt
│
├── recommendation_and_search_system/   # Search and recommendation service
│   ├── main.py                         # Semantic search + category recommendations
│   ├── models.py                       # Product model
│   ├── Dockerfile
│   └── requirements.txt
│
├── mongo-init/                     # One-time database seeding container
│   ├── seed.py                     # Inserts 685 products into products_db
│   ├── products.json               # 685 product records
│   └── Dockerfile
│
├── Frontend/                       # React single-page application
│   ├── src/
│   │   ├── App.js                  # Root component, routing, context providers
│   │   ├── pages/                  # One component per route (9 pages)
│   │   ├── components/             # Reusable UI components (Header, ProductCard, etc.)
│   │   ├── context/                # AuthContext, CartContext, SearchContext
│   │   ├── services/api.js         # Axios clients using relative /api/* paths
│   │   └── utils/                  # Price formatting, debug helpers
│   ├── nginx.conf                  # Nginx config: API gateway + SPA routing
│   ├── Dockerfile                  # Multi-stage: Node build → Nginx serve
│   └── package.json
│
└── docker-compose.yml              # Orchestrates all services
```

---

## Services Overview

### Auth Service — internal port 8000 (gateway: `/api/auth/`)

Handles user registration and login. Issues signed JWT tokens used by all other protected services.

- Passwords are hashed with **bcrypt** before storage.
- Tokens are signed using **HS256** and expire after 30 minutes.
- The token payload includes both `email` and `user_id`, so downstream services can verify ownership without a database lookup.
- Users are stored in the `auth_db` MongoDB database.

### Products Service — internal port 8000 (gateway: `/api/products/`)

Manages the product catalog. On first startup, 685 products are seeded from `mongo-init/products.json`.

- Read endpoints (`GET`) are public.
- Write endpoints (`PUT`, `POST`, `DELETE`) require a valid JWT.
- Stock updates use a single atomic `find_one_and_update` operation with a conditional filter (`stock >= requested_quantity`), returning HTTP 409 if stock is insufficient. This prevents race conditions when multiple users attempt to buy the last item simultaneously.
- Products are stored in the `products_db` MongoDB database.

### Cart Service — internal port 8000 (gateway: `/api/cart/`)

Manages shopping carts and completed orders. The service is split into two routers:

- **`routers/cart.py`** — temporary cart state: add, remove, get, clear
- **`routers/orders.py`** — permanent order records: checkout and transaction history

All endpoints require a valid JWT. User ownership is enforced — the `user_id` extracted from the token must match the `user_id` in the URL, preventing one user from accessing another's cart.

When an item is added, the service validates and atomically decrements stock via the Products Service. On removal, stock is restored.

Cart data lives in `cart_db.carts`; completed orders in `cart_db.transactions`.

### Recommendation and Search Service — internal port 8000 (gateway: `/api/search/`)

Provides two public endpoints:

- **Semantic search** — Accepts a text query, fetches up to 100 products from the Products Service API, then calls the Hugging Face Inference API (`sentence-transformers/all-MiniLM-L6-v2`) to score similarity and return the top-k results.
- **Category recommendations** — Fetches all in-stock products from the Products Service, groups them by `main_category` in Python, and returns the top-rated items per category.

This service has no direct database connection. All product data is retrieved through the Products Service API.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Axios, Bootstrap 5, FontAwesome |
| Backend | FastAPI 0.115, Python 3.11, Uvicorn |
| Authentication | python-jose 3.3, bcrypt 4.3, passlib 1.7 |
| Database | MongoDB with Motor 3.7 (async driver) |
| Inter-service HTTP | httpx 0.28 (async) |
| ML / Search | Hugging Face Inference API — `sentence-transformers/all-MiniLM-L6-v2` |
| Infrastructure | Docker, Docker Compose, Nginx alpine |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) — required to run the full stack
- [Node.js 20+](https://nodejs.org/) and npm — only needed when running the frontend outside Docker
- A [Hugging Face](https://huggingface.co/) account and API token — required for semantic search

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Lohit20/Ecommerce-Microservices.git
cd Ecommerce-Microservices
```

### 2. Configure environment variables

Create a `.env` file in the root directory (same level as `docker-compose.yml`):

```env
JWT_SECRET_KEY=your_strong_secret_key_here
HF_API_TOKEN=your_hugging_face_api_token_here
```

> **Important:** Always set a strong, unique `JWT_SECRET_KEY`. The fallback default in `docker-compose.yml` is intentionally weak and must not be used in production.

### 3. Start all services

```bash
docker-compose up --build
```

Docker Compose starts services in this order:
1. **MongoDB** — waits until healthy.
2. **Seed container** — inserts 685 products into `products_db` (skipped automatically on subsequent runs if data already exists).
3. **Products, Auth, and Recommendation services** — start after seed completes.
4. **Cart service** — starts after the Products service is ready.
5. **Frontend** — starts last, after all backend services are up.

### 4. Open the application

The application is available at a single URL:

```
http://localhost:3000
```

All API traffic is routed through the Nginx gateway on port 3000. The individual backend ports (8001–8004) are exposed for local development and debugging but are not required during normal use.

### Running without Docker (development)

Each backend service can be run individually:

```bash
cd <service-directory>
pip install -r requirements.txt

# Products, Cart, Recommendation:
uvicorn main:app --reload --port <port>

# Auth service:
uvicorn app.main:app --reload --port 8004
```

For the frontend:

```bash
cd Frontend
npm install
npm start   # Dev server on http://localhost:3000
```

When running outside Docker, set `MONGO_URI`, `JWT_SECRET_KEY`, `ALGORITHM`, and `PRODUCTS_SERVICE_URL` as shell environment variables or in a `.env` file inside each service directory.

---

## Environment Variables

| Variable | Service(s) | Description | Default |
|----------|-----------|-------------|---------|
| `MONGO_URI` | Auth, Products, Cart | MongoDB connection string | `mongodb://localhost:27017` |
| `JWT_SECRET_KEY` | Auth, Cart, Products | Secret key for signing and verifying JWT tokens | `supersecretkey_changeme_in_production` |
| `ALGORITHM` | Auth, Cart, Products | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Auth | Token validity duration in minutes | `30` |
| `PRODUCTS_SERVICE_URL` | Cart, Recommendation | Internal URL of the Products Service | `http://products_service:8000` |
| `HF_API_TOKEN` | Recommendation | Hugging Face API token for semantic search | *(empty — search will fail without this)* |

---

## API Reference

All endpoints are accessible through the gateway at `http://localhost:3000`. The gateway strips the `/api/<service>/` prefix before forwarding to the backend.

### Auth — `/api/auth/`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auth/auth/register` | Register a new user | No |
| `POST` | `/api/auth/auth/login` | Login and receive a JWT token | No |

**Register request body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "yourpassword",
  "address": "123 Main St",
  "phone_number": "555-1234"
}
```

**Login request body:**
```json
{
  "email": "john@example.com",
  "password": "yourpassword"
}
```

**Response (both endpoints):**
```json
{
  "token": "<jwt_token>",
  "token_type": "bearer",
  "user": {
    "id": "<mongodb_object_id>",
    "username": "johndoe",
    "email": "john@example.com",
    "address": "123 Main St",
    "phone_number": "555-1234"
  }
}
```

---

### Products — `/api/products/`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/products/get_all_products/` | Retrieve all 685 products | No |
| `GET` | `/api/products/get_product/{product_id}` | Retrieve a single product | No |
| `PATCH` | `/api/products/update_stock/{product_id}` | Atomically update stock quantity | No* |
| `PUT` | `/api/products/update_product/{product_id}` | Update product details | **Yes** |
| `POST` | `/api/products/insert_new_product/` | Add a new product | **Yes** |
| `DELETE` | `/api/products/delete_product/{product_id}` | Delete a product | **Yes** |

*`update_stock` is called internally by the Cart Service and is not intended for direct client use.

**`update_stock` request body:**
```json
{ "quantity": -2 }
```
Positive values add stock; negative values decrement. Returns HTTP 409 if the decrement would make stock negative.

---

### Cart — `/api/cart/`

All cart endpoints require a valid JWT in the `Authorization: Bearer <token>` header. The token's `user_id` must match the `{user_id}` in the URL.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/cart/cart/{user_id}` | Get the user's current cart | **Yes** |
| `POST` | `/api/cart/cart/{user_id}/add` | Add items to cart | **Yes** |
| `POST` | `/api/cart/cart/{user_id}/remove/{product_id}` | Remove an item from cart | **Yes** |
| `POST` | `/api/cart/cart/{user_id}/clear` | Empty the cart | **Yes** |
| `POST` | `/api/cart/checkout/{user_id}` | Place an order | **Yes** |
| `GET` | `/api/cart/transactions/{user_id}` | Retrieve order history | **Yes** |

**Add to cart request body:**
```json
[
  { "product_id": 83919804, "quantity": 2 }
]
```

**Checkout request body** (plain string, not an object):
```json
"credit_card"
```
Payment method options: `credit_card`, `paypal`, `cod`

---

### Recommendation & Search — `/api/search/`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/search/recommendations` | Top-rated products grouped by category | No |
| `GET` | `/api/search/product_semantic_search` | Semantic search over product names | No |

**Semantic search query parameters:**
- `query` (string, required) — the search term
- `top_k` (integer, optional, default 5) — number of results to return

---

## Frontend Routes

| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Home — hero slider, category grid, recommendations | No |
| `/shop` | All products listing | No |
| `/product/:id` | Product detail page | No |
| `/category/:category` | Products filtered by category | No |
| `/cart` | Shopping cart review | No |
| `/checkout` | Payment selection and order confirmation | Yes |
| `/login` | Login form | No |
| `/register` | Registration form | No |
| `/account` | Order history and account details | Yes |

Protected routes (`/checkout`, `/account`) redirect to `/login` if the user is not authenticated.

---

## Database Schema

Each service owns its own isolated MongoDB database.

### `auth_db.users`
```
_id          ObjectId
username     String
email        String  (unique)
password     String  (bcrypt hash — never stored in plain text)
address      String
phone_number String
```

### `products_db.products`
```
product_id     Integer  (unique)
name           String
main_category  String
sub_category   String
image          String   (URL)
ratings        Float
no_of_ratings  Integer
actual_price   Float
discount_price Float
stock          Integer  (updated atomically on cart operations)
```

### `cart_db.carts`
```
user_id     String
items       Array of { product_id: Integer, quantity: Integer, price: Float }
updated_at  DateTime
```

### `cart_db.transactions`
```
order_id        Integer
user_id         String
product_cart    Array of { product_id: Integer, quantity: Integer, price: Float }
total_amount    Float
payment_method  String  (credit_card | paypal | cod)
created_at      DateTime
```

---

## Future Enhancements

- **Payment gateway** — Integrate a real payment provider such as Stripe for card processing.
- **Admin dashboard** — A management UI for adding products, viewing inventory, and monitoring orders.
- **Token refresh** — Issue refresh tokens so users stay logged in beyond the 30-minute access token window.
- **Wishlist and reviews** — Allow users to save products and submit ratings.
- **Asynchronous stock updates** — Replace synchronous Cart→Products HTTP calls with a message queue (e.g., RabbitMQ) for better resilience under high load.
- **Pagination** — Add cursor-based pagination to the products and transaction listing endpoints.

---

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Manual](https://www.mongodb.com/docs/manual/)
- [Motor — Async MongoDB Driver](https://motor.readthedocs.io/)
- [Hugging Face — all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [React Documentation](https://react.dev/)
- [python-jose](https://python-jose.readthedocs.io/)
