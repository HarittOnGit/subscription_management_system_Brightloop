# Brightloop - Subscription Management System

Foundation codebase for Brightloop, a subscription management platform built with React, Vite, Tailwind CSS v4, Express, Prisma 6, and PostgreSQL 16.

## Quick Start Instructions

Run the following commands in your terminal in order:

### 1. Start the PostgreSQL 16 database
```bash
docker compose up -d
```

### 2. Configure, migrate, and start the Server
```bash
cd server && cp .env.example .env && npm i && npx prisma migrate dev --name init && npm run dev
```

### 3. Install dependencies and start the Client
Open a new terminal window:
```bash
cd client && npm i && npm run dev
```

## Health Check & Verification

- **API Health**: Visit `http://localhost:5000/api/health` to confirm server status and database connectivity (returns JSON with status `ok` and user count).
- **Client App**: Visit `http://localhost:5173` to view the Brightloop application shell with sidebar navigation, header profile, and responsive layout.
