FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir pymongo

# Build context is the repo root so we can reach products/products.json
COPY products/products.json ./products.json
COPY mongo-init/seed.py ./seed.py

CMD ["python", "seed.py"]
