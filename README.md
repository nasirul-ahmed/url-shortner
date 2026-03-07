# ⚡ URL Shortener — Production-Ready with Real-Time Analytics

A high-concurrency URL shortening service built for scale, with a live analytics dashboard.

```
User → Nginx LB → Node.js × 3 → Redis (hot path) → MongoDB (persistence)
                                       ↓
                               Socket.io → Dashboard
```

---

## Architecture

### Request Flow

**Redirect (< 5ms target)**

```
GET /:shortCode
  → Nginx routes to round-robin API instance
  → Check Redis  →  HIT: 302 redirect (immediate)
                →  MISS: query MongoDB → backfill Redis → 302 redirect
  → (async) Analytics pipeline: Redis INCR + Socket.io emit
```

**URL Creation**

```
POST /api/shorten
  → Validate URL
  → Custom alias? → Redis SETNX lock → check DB uniqueness
  → Generate Base62 short code (nanoid)
  → Write to Redis (24h TTL) ← synchronous
  → Write to MongoDB ← async (non-blocking)
  → Return { shortUrl, shortCode }
```

### Component Responsibilities

| Component       | Role                                                                  |
| --------------- | --------------------------------------------------------------------- |
| **Nginx**       | TLS termination, load balancing (round-robin), WebSocket upgrades     |
| **Node.js × 3** | API handling, business logic, Socket.io                               |
| **Redis**       | URL mapping cache, analytics counters, sliding window, alias locks    |
| **MongoDB**     | Persistent URL storage, click counts, TTL expiry                      |
| **Socket.io**   | Real-time click events → dashboard (Redis adapter for multi-instance) |

---

## Redis Caching Strategy

```
Key                              TTL       Purpose
────────────────────────────────────────────────────────────────
url:{shortCode}                  24h       URL mapping (hot path)
analytics:clicks:{shortCode}     ∞         Total click counter (INCR)
analytics:country:{code}         ∞         Country hash (HINCRBY)
analytics:device:{code}          ∞         Device hash (HINCRBY)
analytics:window:{code}          2min      Sliding 60s window (sorted set)
alias:lock:{alias}               30s       Distributed alias creation lock
```

**Write-back cache**: URL mappings are written to Redis _before_ MongoDB responds, ensuring the first redirect is always cache-hot.

**Graceful degradation**: Redis failures fall through to MongoDB with automatic cache backfill. The redirect path never fails due to Redis being down.

---

## Project Structure

```
url-shortener/
├── backend/
│   └── src/
│       ├── config/          # Env-based configuration
│       ├── controllers/     # HTTP request handlers
│       ├── errors/          # AppError hierarchy + error codes
│       ├── interfaces/      # TypeScript interfaces
│       ├── loaders/         # App bootstrap (Fastify, Mongoose, DI)
│       ├── middleware/      # Error handling, logging
│       ├── models/          # Mongoose schemas
│       ├── redis/           # Redis client + repository
│       ├── repositories/    # MongoDB data access
│       ├── services/        # Business logic
│       └── utils/           # Logger, geo/device detection, helpers
├── frontend/
│   ├── hooks/               # useSocket, useAnalytics
│   └── pages/               # Next.js pages
├── nginx/
│   └── nginx.conf           # Load balancer config
├── scripts/
│   ├── deploy.sh            # Deployment helper
│   └── load-test.yml        # Artillery config
└── docker-compose.yml
```

---

## API Reference

### `POST /api/shorten`

Creates a short URL.

**Request**

```json
{
  "longUrl": "https://example.com/very/long/path",
  "customAlias": "my-link", // optional, 3-30 chars
  "expiresAt": "2025-12-31T00:00:00Z" // optional
}
```

**Response `201`**

```json
{
  "status": 1000,
  "message": "created",
  "data": {
    "shortCode": "my-link",
    "shortUrl": "http://localhost/my-link",
    "longUrl": "https://example.com/very/long/path",
    "createdAt": "2024-03-01T00:00:00Z"
  }
}
```

### `GET /:shortCode`

Redirects (302) to the original URL.

### `GET /api/analytics/:shortCode`

Returns aggregated analytics.

**Response `200`**

```json
{
  "status": 1000,
  "message": "success",
  "data": {
    "shortCode": "my-link",
    "totalClicks": 1482,
    "last60sClicks": 14,
    "deviceBreakdown": { "desktop": 900, "mobile": 500, "tablet": 82 },
    "countryBreakdown": { "US": 600, "GB": 200, "DE": 150 }
  }
}
```

### Error Codes

| Code | Meaning               | HTTP    |
| ---- | --------------------- | ------- |
| 1000 | Success               | 200/201 |
| 4000 | Validation error      | 400     |
| 4001 | Invalid URL           | 400     |
| 4002 | Alias already exists  | 409     |
| 4003 | URL not found         | 404     |
| 4004 | Rate limit exceeded   | 429     |
| 5000 | Internal server error | 500     |
| 5001 | Redis error           | 503     |
| 5002 | Database error        | 503     |

---

## Quick Start

### Prerequisites

- Docker 24+
- Docker Compose v2

### 1. Clone & Configure

```bash
git clone <repo>
cd url-shortener
cp backend/.env.example backend/.env
```

### 2. Launch

```bash
./scripts/deploy.sh start
```

Services:

- **Dashboard**: http://localhost
- **API**: http://localhost/api
- **Health**: http://localhost/api/health

### 3. Seed test data

```bash
./scripts/deploy.sh seed
```

### 4. Load test

```bash
npm install -g artillery
./scripts/deploy.sh load-test
```

---

## Load Testing

Artillery simulates realistic traffic patterns:

| Phase     | Rate     | Duration |
| --------- | -------- | -------- |
| Warm-up   | 5→50 RPS | 30s      |
| Sustained | 100 RPS  | 60s      |
| Spike     | 500 RPS  | 30s      |
| Cool-down | 10 RPS   | 15s      |

Traffic distribution:

- 60% redirects (hot path)
- 20% URL creation
- 20% analytics reads

**Target SLAs**: p95 < 200ms, p99 < 500ms, error rate < 1%

---

## Scaling Strategy

### Horizontal Scaling

Increase API instances in `docker-compose.yml` and add to Nginx upstream — no code changes needed.

### Redis Cluster

For production at scale, replace single Redis with Redis Cluster or Redis Sentinel (update `ioredis` config in `src/redis/client.ts`).

### MongoDB Sharding

Shard on `shortCode` field for horizontal data scaling.

### CDN Layer

Add Cloudflare or AWS CloudFront in front of Nginx to cache popular redirects at the edge.

---

## Concurrency Safety

Custom alias creation uses Redis `SETNX` (atomic set-if-not-exists) as a distributed lock, preventing duplicate aliases even under concurrent requests across multiple API instances.

---

## Development

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```
