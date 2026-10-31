# Brightloop - Subscription Management System

Complete integrated hackathon foundation for Brightloop, incorporating full feature sets across:
- **Haritt Moothedan(HarittOnGit)**: Authentication, JWT session security, RBAC (Admin, Staff, Customer), user management, and customer portal.
- **Midhun Milton(therealmcube)**: Catalog engine (Products, multi-attribute Variants, Plans with auto/early close, Quotation Templates with dynamic lines).
- **Febin Shaibu(sreya5214)**: Subscriptions lifecycle state machine, Taxes, Discounts (fixed & percentage, product & subscription level), and precision paise pricing calculation engine.
- **Jeremiah Thomas Bency(jeremiahbency2497)**: Automated & on-demand Billing engine ("never billed twice or skipped"), Invoices, Payments, Finance Dashboard with Recharts, and realistic database seed script.

---

## 🚀 Step-by-Step Setup Instructions

Run the following commands in your terminal in order:

### 1. Start the PostgreSQL 16 Database
```bash
docker compose up -d
```

### 2. Configure, Migrate & Seed the Backend Server
```bash
cd server
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```
*(Optionally, if you just want an initial admin without the 1000+ invoices dataset, run `npm run create-admin` instead of `npm run seed`)*

### 3. Start the Frontend Client
In a separate terminal window:
```bash
cd client
npm install
npm run dev
```

---

## 🔑 Demo Login Accounts

All test accounts seeded by `npm run seed` use the password: `Password@123`

| Role | Email | Access Scope |
| :--- | :--- | :--- |
| **Admin** | `admin@brightloop.com` | Full administrative access: Dashboard, Products, Plans, Templates, Taxes, Discounts, Staff, Subscriptions, Invoices, Payments |
| **Staff** | `staff@brightloop.com` | Operational access: Dashboard, Customers, Subscriptions, Invoices, Payments |
| **Customer** | `customer1@example.com` | Customer portal: My Subscriptions, My Invoices, Printable receipts |

---

## 🔍 Verification & Health Endpoints

- **Server Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
  - Returns `{ "status": "ok", "users": 42 }` after seeding.
- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
  - Directs unauthenticated users to `/login`.
  - Logging in as Admin, Staff, or Customer automatically redirects to their respective authorized home route.
- **Billing Engine Test**:
  - In `/invoices`, click the indigo **Run Billing** button.
  - The first run processes any active due cycles; clicking it a second time displays `Created 0, skipped N`—proving the idempotency and "never billed twice" guarantee.
