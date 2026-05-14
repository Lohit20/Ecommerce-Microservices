# E-Commerce Microservices Platform

A full-stack e-commerce application built with a microservices architecture. The backend is composed of four independent FastAPI services, each responsible for a distinct domain, all backed by a shared MongoDB instance. The frontend is a React single-page application that communicates directly with each service.

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

```
                        ┌─────────────────────────┐
                        │   React Frontend          │
                        │   localhost:3000          │
                        └────────────┬────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                       │
   ┌──────────▼──────┐   ┌──────────▼──────┐   ┌──────────▼──────┐
   │  Auth Service   │   │Products Service  │   │  Cart Service   │
   │  localhost:8004 │   │  localhost:8001  │   │  localhost:8002 │
   └──────────┬──────┘   └──────────┬──────┘   └────────┬────────┘
              │                      │                    │
              │           ┌──────────▼──────┐            │ HTTP
              │           │ Recommendation  │            │ calls
              │           │  localhost:8003  │            │
              │           └──────────┬──────┘   ┌────────▼────────┐
              │                      │           │Products Service  │
              └──────────────────────┼───────────┤  (stock update) │
                                     │           └─────────────────┘
                              ┌──────▼──────┐
                              │   MongoDB   │
                              │  :27017     │
                              └─────────────┘
```

Each service runs in its own Docker container on the same bridge network (`ecommerce_network`). The frontend makes direct HTTP requests to each service using their exposed host ports. The Cart Service also makes internal service-to-service calls to the Products Service to validate and update stock.

---

## Repository Structure

```
Ecommerce-Microservices/
│
├── ecommerce-auth/                 # Authentication service
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── routes/user.py          # Register and login endpoints
│   │   ├── auth.py                 # Password hashing and JWT utilities
│   │   ├── models.py               # Pydantic request/response models
│   │   ├── database.py             # MongoDB connection
│   │   └── config.py               # Environment variable loading
│   ├── users.json                  # Seed data (20 test users)
│   ├── Dockerfile
│   └── requirements.txt
│
├── products/                       # Product catalog service
│   ├── main.py                     # FastAPI app with all product endpoints
│   ├── models.py                   # Product Pydantic model
│   ├── products.json               # Seed data (685 products)
│   ├── Dockerfile
│   └── requirements.txt
│
├── cart/                           # Cart and order service
│   ├── main.py                     # FastAPI app with cart/checkout endpoints
│   ├── models.py                   # Cart, Order, PaymentMethod models
│   ├── carts.json                  # Seed data (4 example carts)
│   ├── transactions.json           # Seed data (15 example orders)
│   ├── Dockerfile
│   └── requirements.txt
│
├── recommendation_and_search_system/   # Search and recommendation service
│   ├── main.py                         # FastAPI app with search endpoints
│   ├── models.py                       # Product model
│   ├── Dockerfile
│   └── requirements.txt
│
├── mongo-init/                     # Database seeding container
│   ├── seed.py                     # Inserts products.json into MongoDB
│   ├── products.json               # 685 product records
│   └── Dockerfile
│
├── Frontend/                       # React single-page application
│   ├── src/
│   │   ├── App.js                  # Root component, routing, context providers
│   │   ├── pages/                  # One component per route
│   │   ├── components/             # Reusable UI components
│   │   ├── context/                # Auth, Cart, and Search context providers
│   │   ├── services/api.js         # Axios client instances for each service
│   │   └── utils/                  # Helper utilities
│   ├── nginx.conf                  # Production Nginx config (SPA routing)
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml              # Orchestrates all services
```

---

## Services Overview

### Auth Service — Port 8004

Handles user registration and login. Issues signed JWT tokens that the frontend attaches to subsequent requests.

- Passwords are hashed with **bcrypt** before storage.
- Tokens are signed using **HS256** and expire after 30 minutes.
- Users are stored in the `ecommerce.users` MongoDB collection.

### Products Service — Port 8001

Manages the product catalog. Supports full CRUD operations and real-time stock tracking. On startup, 685 products are seeded from `products.json` via the `mongo-init` container.

The Cart Service calls this service internally to validate available stock and update quantities when items are added or removed from a cart.

### Cart Service — Port 8002

Manages shopping carts and order history. Key behaviors:

- Before adding an item, it checks stock availability by calling the Products Service.
- On successful add, it decrements stock via a `PATCH` call to the Products Service.
- On item removal, it restores stock.
- Checkout creates a permanent transaction record and clears the cart.

### Recommendation and Search Service — Port 8003

Provides two capabilities:

- **Semantic search:** Accepts a text query, fetches up to 100 products from MongoDB, then calls the Hugging Face Inference API (`sentence-transformers/all-MiniLM-L6-v2`) to compute similarity scores and return the most relevant products.
- **Category recommendations:** Runs a MongoDB aggregation that groups products by `main_category` and returns the top-rated items in each category.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Axios, Bootstrap 5, FontAwesome |
| Backend | FastAPI 0.115, Python 3.11, Uvicorn |
| Authentication | PyJWT 2.10, bcrypt 4.3, passlib 1.7 |
| Database | MongoDB with Motor 3.7 (async driver) |
| Inter-service HTTP | httpx 0.28 (async) |
| ML / Search | Hugging Face Inference API — `sentence-transformers/all-MiniLM-L6-v2` |
| Infrastructure | Docker, Docker Compose, Nginx (alpine) |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) — required to run the full stack
- [Node.js 20+](https://nodejs.org/) and npm — only needed if running the frontend outside Docker
- A Hugging Face account and API token — required for semantic search functionality

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

Also update the token in `recommendation_and_search_system/main.py` line 36 with your Hugging Face token (or set it via the environment variable once that refactor is done).

### 3. Start all services

```bash
docker-compose up --build
```

Docker Compose will:
1. Start MongoDB and wait for it to be healthy.
2. Run the seed container, which inserts 685 products into MongoDB (skipped on subsequent runs if data already exists).
3. Start the four backend services.
4. Build and serve the React frontend via Nginx.

### 4. Access the application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Auth Service | http://localhost:8004 |
| Products Service | http://localhost:8001 |
| Cart Service | http://localhost:8002 |
| Recommendation Service | http://localhost:8003 |

### Running without Docker (development)

Each backend service can be run individually with:

```bash
cd <service-directory>
pip install -r requirements.txt
uvicorn main:app --reload --port <port>
# For auth service: uvicorn app.main:app --reload --port 8004
```

For the frontend:

```bash
cd Frontend
npm install
npm start   # Starts dev server on http://localhost:3000
```

---

## Environment Variables

| Variable | Service | Description | Default |
|----------|---------|-------------|---------|
| `MONGO_URI` | All backend services | MongoDB connection string | `mongodb://localhost:27017` |
| `JWT_SECRET_KEY` | Auth | Secret key for signing JWT tokens | `supersecretkey_changeme_in_production` |
| `ALGORITHM` | Auth | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Auth | Token validity duration | `30` |
| `PRODUCTS_SERVICE_URL` | Cart | Internal URL for Products Service | `http://products_service:8000` |

> **Important:** Always set a strong, unique `JWT_SECRET_KEY` before deploying. The default value is intentionally weak and must not be used in production.

---

## API Reference

### Auth Service — `http://localhost:8004`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Login and receive a JWT token | No |

**Register / Login request body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Register additional fields:** `username`, `address`, `phone_number`

**Response:**
```json
{
  "token": "<jwt_token>",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "username": "...",
    "email": "...",
    "address": "...",
    "phone_number": "..."
  }
}
```

---

### Products Service — `http://localhost:8001`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/get_all_products/` | Retrieve all products | No |
| `GET` | `/get_product/{product_id}` | Retrieve a single product by ID | No |
| `PATCH` | `/update_stock/{product_id}` | Update stock quantity | No |
| `PUT` | `/update_product/{product_id}` | Update product details | No |
| `POST` | `/insert_new_product/` | Add a new product | No |
| `DELETE` | `/delete_product/{product_id}` | Delete a product | No |

---

### Cart Service — `http://localhost:8002`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/cart/{user_id}` | Get the user's current cart | Yes |
| `POST` | `/cart/{user_id}/add` | Add items to cart (validates stock) | Yes |
| `POST` | `/cart/{user_id}/remove/{product_id}` | Remove an item from cart | Yes |
| `POST` | `/cart/{user_id}/clear` | Clear the entire cart | Yes |
| `POST` | `/checkout/{user_id}` | Place an order and create a transaction | Yes |
| `GET` | `/transactions/{user_id}` | Retrieve the user's order history | Yes |

**Add to cart request body:**
```json
[
  { "product_id": 1, "quantity": 2 }
]
```

**Checkout request body:**
```json
{ "payment_method": "credit_card" }
```

Payment method options: `credit_card`, `paypal`, `cod`

---

### Recommendation Service — `http://localhost:8003`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/product_semantic_search` | Search products by text query | No |
| `GET` | `/recommendations` | Get top-rated products per category | No |

**Semantic search query parameters:**
- `query` (string) — the search term
- `top_k` (integer, optional) — number of results to return

---

## Frontend Routes

| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Home — hero slider, category grid, recommendations | No |
| `/shop` | All products listing | No |
| `/product/:id` | Product detail page | No |
| `/category/:category` | Products filtered by category | No |
| `/cart` | Shopping cart review | No |
| `/checkout` | Payment and order confirmation | Yes |
| `/login` | Login form | No |
| `/register` | Registration form | No |
| `/account` | Order history and account details | Yes |

Protected routes redirect to `/login` if the user is not authenticated.

---

## Database Schema

### `ecommerce.users`
```
_id          ObjectId
username     String
email        String (unique)
password     String (bcrypt hash)
address      String
phone_number String
```

### `ecommerce_db.products`
```
product_id     Integer (unique)
name           String
main_category  String
sub_category   String
image          String (URL)
ratings        Float
no_of_ratings  Integer
actual_price   Float
discount_price Float
stock          Integer
```

### `ecommerce_db.carts`
```
user_id     String
items       Array of { product_id, quantity, price }
updated_at  DateTime
```

### `ecommerce_db.transactions`
```
order_id        Integer
user_id         Integer
product_cart    Array of { product_id, quantity, price }
total_amount    Float
payment_method  Enum: credit_card | paypal | cod
created_at      DateTime
```

---

## Future Enhancements

- **API Gateway** — Route all frontend requests through a single gateway (e.g., Nginx or Traefik) instead of exposing each service on a separate port.
- **Independent databases** — Give each service its own MongoDB database to enforce true data isolation between microservices.
- **Asynchronous stock updates** — Replace synchronous Cart→Products HTTP calls with a message queue (e.g., RabbitMQ or Kafka) to improve resilience.
- **Payment gateway integration** — Connect to a real payment provider such as Stripe.
- **Admin dashboard** — Product management UI with filters, pagination, and inventory reporting.
- **Token refresh** — Implement refresh tokens to extend sessions without re-authentication.
- **Wishlist and reviews** — Allow users to save products and leave ratings.

---

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Manual](https://www.mongodb.com/docs/manual/)
- [Motor — Async MongoDB Driver](https://motor.readthedocs.io/)
- [Hugging Face — all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [React Documentation](https://react.dev/)
