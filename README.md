#  E-Commerce Microservices System

A scalable, modular, and secure e-commerce platform built using **FastAPI**, **MongoDB**, **Docker**, and **React.js**. This project is designed using microservices architecture to support user authentication, product management, transactions, and intelligent product recommendations.

---

## Repository Structure

```

ecommerce-microservices/
│
├── auth-service/              # User registration & authentication microservice
├── product-service/           # Product management microservice
├── cart-service/              # Cart & transaction microservice
├── recommendation-service/   # NLP-based recommendation microservice
├── frontend/                  # React-based client-side application
├── docker-compose.yml        # Service orchestration
└── .env                       # Environment configuration

````

---

## Features

- **User Authentication:** JWT-based login, password hashing with bcrypt, and role-based access control.
- **Product Management:** Full CRUD operations, category/subcategory classification, real-time stock handling.
- **Cart & Transactions:** Add/remove items, checkout process, order history, stock validation.
- **Recommendations & Search:** Semantic product search with Hugging Face Transformers and top-rated item suggestions.
- **Containerization:** Docker and Docker Compose for service isolation and orchestration.
- **Frontend UI:** Built with React.js, responsive design, cart integration, and protected routes.

---

## Technologies Used

- **Backend:** FastAPI, Python 3.11, MongoDB, Motor (async Mongo driver), HTTPX  
- **NLP & ML:** Hugging Face Transformers (`sentence-transformers/all-MiniLM-L6-v2`)  
- **Containerization:** Docker, Docker Compose  
- **Frontend:** React.js, Axios, Bootstrap  
- **Testing:** Pytest, Postman, Locust, OWASP ZAP  
- **Deployment:** Environment variables, `.env` files, VMware Horizon VM

---

## Architecture

Each microservice is independently containerized and communicates over REST or shared MongoDB. Services include:

- **Auth Service:** `/signup`, `/login`, secure JWT issuance  
- **Product Service:** `/get_all_products`, `/insert_new_product`, `/delete_product/{id}`  
- **Cart Service:** `/cart/{user_id}`, `/checkout/{user_id}`, `/transactions/{user_id}`  
- **Recommendation Service:** `/product_semantic_search`, `/recommendations`

> MongoDB runs natively on the host, microservices connect via host IP (`mongodb://172.17.0.1:27017`).

---

## Setup & Deployment

### Prerequisites

- Docker & Docker Compose
- Node.js & npm (for frontend)
- MongoDB (optional if already running externally)

### Build and Run

```bash
# Clone the repo
git clone https://github.com/Lohit20/Ecommerce-Microservices.git
cd Ecommerce-Microservices

# Set environment variables in .env files inside each service
# Example for MongoDB URI:
MONGO_URI=mongodb://172.17.0.1:27017/ecommerce_db

# Build and run all services
docker-compose up --build
````

### 🔗 Access Points

* Frontend: `http://localhost:3000`
* Backend Gateway (optional): `http://localhost:8080`

---

## Testing

* **Unit Testing:** Use `pytest` in each service directory.
* **Integration Testing:** Postman collections to simulate full user flow.
* **Load Testing:** Use Locust to simulate 50+ concurrent users.
* **Security Testing:** OWASP ZAP, JWT integrity checks, bcrypt, and CORS policies.

---

## Security Highlights

* JWT token-based authentication with expiry & refresh logic
* Role-based access control (Admin/User)
* Password hashing with **bcrypt**
* Strict **CORS** and input validation using **Pydantic**
* `.env` file-based secret handling and internal-only service access

---

## Future Enhancements

* Integrate third-party payment gateways (e.g., Stripe)
* Admin dashboard, product filters, pagination
* Wishlist, product reviews, shipping/tracking support
* Soft deletes, multilingual search, advanced personalization

---


## References

* [FastAPI Docs](https://fastapi.tiangolo.com/)
* [MongoDB Manual](https://www.mongodb.com/docs/manual/)
* [Hugging Face Transformers](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
* [Docker Compose Docs](https://docs.docker.com/compose/)
* [JWT Info](https://jwt.io/)

---
