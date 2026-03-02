# QUICKSTART - Get Running in 5 Minutes

This guide gets you from zero to a running Identity Reconciliation Service in under 5 minutes.

## Prerequisites

- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- PostgreSQL 12+ running locally

## 5-Minute Setup

### Step 1: Install Dependencies (1 min)

```bash
cd c:\Users\ayushupadhyay0606\Desktop\bitespeed
npm install
```

### Step 2: Setup Database (2 min)

#### Option A: Using Docker (Recommended if you have Docker installed)

```bash
# Start PostgreSQL in Docker
docker run -d \
  --name postgres-bitespeed \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=bitespeed \
  -p 5432:5432 \
  postgres:15-alpine

# Create .env file
cp .env.example .env

# Update .env if needed (or keep default for Docker):
# DATABASE_URL="postgresql://postgres:password123@localhost:5432/bitespeed"
```

#### Option B: PostgreSQL Already Running Locally

```bash
# Create database
createdb bitespeed

# Create user and grant permissions
psql -d bitespeed -c "CREATE USER bitespeed_user WITH PASSWORD 'password123';"
psql -d bitespeed -c "GRANT ALL PRIVILEGES ON DATABASE bitespeed TO bitespeed_user;"

# Create .env file
cp .env.example .env

# Update .env with your connection details (example):
# DATABASE_URL="postgresql://bitespeed_user:password123@localhost:5432/bitespeed"
```

### Step 3: Run Migrations (1 min)

```bash
npm run prisma:migrate
```

This creates the Contact table with all required indexes.

**Verification**: You should see:
```
✓ Generated Prisma Client

✓ Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "bitespeed", schema "public"

1 migration found, and it was already applied to the database.
```

### Step 4: Start the Server (1 min)

```bash
npm run dev
```

**Expected output**:
```
[2024-01-15T10:30:45.123Z] Server started on port 3000
[2024-01-15T10:30:45.234Z] Environment: development
[2024-01-15T10:30:45.345Z] POST /identify - Identity reconciliation endpoint
[2024-01-15T10:30:45.456Z] GET /health - Health check endpoint
```

## Test It Works

### In a New Terminal:

```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"2024-01-15T10:30:45.123Z"}
```

### Make Your First Request:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com"}'

# Should return:
# {"contact":{"primaryContactId":1,"emails":["customer@example.com"],"phoneNumbers":[],"secondaryContactIds":[]}}
```

✅ **You're done!** The service is running.

---

## Common Commands

```bash
# Start development server (with auto-reload)
npm run dev

# Build for production
npm run build

# Run production server (after build)
npm start

# Type checking
npm run type-check

# Database browser (visual UI)
npm run prisma:studio

# View database schema
npm run prisma:generate

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

---

## Project Structure at a Glance

```
bitespeed/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Express setup
│   ├── prisma.ts             # Database client
│   ├── controllers/          # HTTP handlers
│   ├── services/             # Business logic
│   ├── middleware/           # Error handling
│   ├── types/                # TypeScript interfaces
│   └── config/               # Constants
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── .env.example              # Environment template
├── package.json              # Dependencies
└── README.md                 # Full documentation
```

---

## Next Steps

1. **Read the API Documentation**: See [API_EXAMPLES.md](API_EXAMPLES.md) for example requests
2. **Understand the Logic**: Check [README.md](README.md#business-logic) for how reconciliation works
3. **Explore Database**: Run `npm run prisma:studio` to browse your data
4. **Deploy**: Follow deployment guide in [README.md](README.md#deployment)

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Use a different port
PORT=3001 npm run dev
```

### Database Connection Error

```bash
# Check database is running
psql -U postgres -d postgres -c "SELECT 1"

# If error, start PostgreSQL:
# macOS: brew services start postgresql@15
# Linux: sudo systemctl start postgresql
# Windows (WSL): sudo service postgresql start
# Docker: docker start postgres-bitespeed
```

### Prisma Migration Error

```bash
# Reset everything (⚠️ deletes data)
npx prisma migrate reset

# Then run again
npm run prisma:migrate
```

### "MODULE_NOT_FOUND" Error

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Quick Reference: Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/identify` | Reconcile contacts |
| GET | `/health` | Health check |

---

## Example Workflow

```bash
# 1. Start server
npm run dev

# 2. In another terminal, create first contact
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","phoneNumber":"+1234567890"}'

# Response: primaryContactId: 1, secondaryContactIds: []

# 3. Link second contact
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","phoneNumber":"+9876543210"}'

# Response: primaryContactId: 1, secondaryContactIds: [2]
# Notice: Both phone numbers in response!

# 4. View database with Prisma Studio
npm run prisma:studio
# Opens http://localhost:5555 - see your contacts visually
```

---

## Congratulations! 🎉

Your Identity Reconciliation Service is ready. Start integrating and happy coding!

For more details, see [README.md](README.md).
