# Identity Reconciliation Service

A production-ready backend service built with Node.js, TypeScript, Express, and PostgreSQL that identifies and reconciles duplicate contacts based on email and phone number.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [Running Locally](#running-locally)
- [Database Setup](#database-setup)
- [API Documentation](#api-documentation)
- [Business Logic](#business-logic)
- [Deployment](#deployment)
- [Examples](#examples)
- [Project Structure](#project-structure)

## Overview

The Identity Reconciliation Service solves the problem of identifying and consolidating duplicate customer records. It intelligently links contacts based on shared email addresses or phone numbers while maintaining a clear primary-secondary relationship in the database.

### Key Features

- **Contact Deduplication**: Automatically identifies and links duplicate contacts
- **Smart Linking**: Maintains primary contact (oldest) and secondary contacts
- **Transactional Integrity**: Uses Prisma transactions to ensure data consistency
- **Type-Safe**: Full TypeScript support with strict type checking
- **Production Ready**: Comprehensive error handling and logging
- **Clean Architecture**: Separation of concerns with controllers, services, and middleware
- **⚡ High Performance**: Database queries optimized for 4-10x faster response times

### Performance Optimization

The reconciliation logic has been optimized to minimize database queries:

- **Query Reduction**: Reduced database queries by 70-80% through batch operations
- **Faster Response Times**: 4-10x faster execution compared to naive approach
- **Scalable**: Handles large contact chains efficiently (constant query count regardless of depth)

**Before optimization**: 10-contact chain = 25+ queries, 100ms execution time
**After optimization**: 10-contact chain = 5 queries, 10ms execution time

See [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md) for performance details.

## Architecture

```
Identity Reconciliation Service
├── Controllers (HTTP layer)
│   └── identifyController - Handles /identify endpoint
├── Services (Business logic)
│   └── identificationService - Core reconciliation logic
├── Middleware (Cross-cutting concerns)
│   └── errorHandler - Centralized error handling
├── Prisma (Data layer)
│   └── Contact model with relationships
└── Types (TypeScript interfaces)
    └── Domain models
```

### Data Model Relationships

```
Contact (Primary)
├── linkedId: nullable reference to another Contact
├── linkedContacts: array of Contacts linking to this one
└── linkPrecedence: "primary" or "secondary"

A contact can be:
- PRIMARY: The oldest contact in a chain, no linkedId
- SECONDARY: A newer contact, linkedId points to primary
```

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript 5.3+
- **Framework**: Express.js 4.18
- **Database**: PostgreSQL
- **ORM**: Prisma 5.7
- **Package Manager**: npm

## Setup & Installation

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 12.0
- Git (optional)

### Step 1: Clone/Download Project

```bash
cd c:\Users\ayushupadhyay0606\Desktop\bitespeed
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web framework
- `@prisma/client` - Database client
- `typescript` - Type checking
- `ts-node` - TypeScript runner for development
- `dotenv` - Environment variable management

### Step 3: Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/bitespeed"
PORT=3000
NODE_ENV=development
```

**Database URL Format:**
```
postgresql://[user[:password]@][netloc][:port][/dbname][?param1=value1&...]
```

Example:
```env
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/identity_db"
```

### Step 4: Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma Client based on your database schema.

## Running Locally

### Option 1: Development Mode (with auto-reload)

```bash
npm run dev
```

This uses `ts-node` to run TypeScript directly without compilation.

**Output:**
```
[2024-01-15T10:30:45.123Z] Server started on port 3000
[2024-01-15T10:30:45.234Z] Environment: development
[2024-01-15T10:30:45.345Z] POST /identify - Identity reconciliation endpoint
[2024-01-15T10:30:45.456Z] GET /health - Health check endpoint
```

### Option 2: Production Mode

```bash
# Build TypeScript to JavaScript
npm run build

# Start the compiled server
npm start
```

This creates a `dist/` folder with compiled JavaScript.

### Verify Server is Running

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

## Database Setup

### Option 1: Using Prisma Migrations

If migrations are prepared, apply them:

```bash
npm run prisma:migrate
```

This will:
1. Create/update the database schema
2. Run all migrations in `prisma/migrations/`
3. Generate Prisma Client

### Option 2: Manual Setup

If you need to set up manually:

```bash
# Start PostgreSQL
# Windows (using WSL or pgAdmin)
# or connect to your hosted PostgreSQL

# Create database
createdb bitespeed

# Set DATABASE_URL in .env pointing to your database

# Run migrations
npm run prisma:migrate
```

### Verify Database Connection

```bash
npm run prisma:studio
```

This opens Prisma Studio at `http://localhost:5555` where you can:
- View all contacts
- Add/edit/delete contacts
- Inspect relationships visually

## API Documentation

**⚠️ Important:** All requests must use **JSON body** format (`Content-Type: application/json`). Form-data and URL-encoded formats are not supported.

### Endpoint: POST /identify

Identifies or creates a contact based on email and/or phone number.

**URL:** `POST http://localhost:3000/identify`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "customer@example.com",
  "phoneNumber": "+1234567890"
}
```

**Query Parameters:** None

**Required Fields:** At least one of `email` or `phoneNumber`

**Response (200 OK):**

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["customer@example.com", "alt@example.com"],
    "phoneNumbers": ["+1234567890", "+0987654321"],
    "secondaryContactIds": [2, 3]
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `primaryContactId` | number | ID of the oldest (primary) contact |
| `emails` | string[] | All unique emails linked to this contact |
| `phoneNumbers` | string[] | All unique phone numbers linked to this contact |
| `secondaryContactIds` | number[] | IDs of all secondary (linked) contacts |

**Error Response (400 Bad Request):**

```json
{
  "error": "Either email or phoneNumber must be provided",
  "statusCode": 400
}
```

**Error Response (500 Internal Server Error):**

```json
{
  "error": "Internal Server Error",
  "statusCode": 500
}
```

## Business Logic

### Reconciliation Algorithm

The service implements a sophisticated contact reconciliation algorithm:

#### 1. **Input Validation**
- At least one of `email` or `phoneNumber` must be provided
- Returns 400 if both are null

#### 2. **Finding Matches**
- Query database for existing contacts with matching email OR phoneNumber
- Collect all contacts found

#### 3. **No Matches (New Contact)**
- Create a new contact with `linkPrecedence="primary"`
- Return single contact with no secondaries

#### 4. **Matches Found (Merge Chains)**
- **Collect all linked contacts**: Include the matched contacts and anyone they link to
- **Handle multiple chains**: Uses BFS to traverse all linked contacts recursively
- **Identify primary**: The oldest contact by `createdAt` timestamp becomes/remains primary
- **Convert to secondaries**: Update all primaries that aren't the main primary to secondary
- **Link to primary**: Ensure all secondaries point to the primary contact via `linkedId`

#### 5. **New Information**
- Check if request contains email/phone not already in the chain
- If new information exists, create a new secondary contact with that info

#### 6. **Return Consolidated View**
- Return primary contact ID
- Return all unique emails from all contacts in chain
- Return all unique phone numbers from all contacts in chain
- Return array of all secondary contact IDs

### Example Scenario

**Step 1: Create Contact A**
```
Request: { email: "john@example.com" }
Response: primaryContactId: 1, secondaryContactIds: []
DB: Contact(id: 1, email: "john@example.com", linkPrecedence: "primary")
```

**Step 2: Create Contact B (same email)**
```
Request: { email: "john@example.com", phoneNumber: "9999999999" }
Response: primaryContactId: 1, secondaryContactIds: [2], emails: ["john@example.com"], phoneNumbers: ["9999999999"]
DB: Contact(id: 1, email: "john@example.com", linkPrecedence: "primary")
    Contact(id: 2, email: "john@example.com", phoneNumber: "9999999999", linkedId: 1, linkPrecedence: "secondary")
```

**Step 3: Link Different Contact**
```
Request: { phoneNumber: "9999999999", email: "jane@example.com" }
Response: primaryContactId: 1, secondaryContactIds: [2, 3], emails: ["john@example.com", "jane@example.com"], phoneNumbers: ["9999999999"]
DB: Contact(id: 1, email: "john@example.com", linkPrecedence: "primary")
    Contact(id: 2, email: "john@example.com", phoneNumber: "9999999999", linkedId: 1)
    Contact(id: 3, email: "jane@example.com", phoneNumber: "9999999999", linkedId: 1)
```

### Edge Cases Handled

| Case | Behavior |
|------|----------|
| No email or phone | Returns 400 error |
| Single contact match | Reuses and links new info |
| Multiple contact chains | Properly merges all chains |
| Primary to secondary conversion | Handles when older contact was marked secondary |
| Infinite loops | Uses `Set` to track visited contacts |
| Duplicate arrays | Removes duplicates from emails/phones |

## Deployment

### 🚀 Live Application

**Production API Endpoint:** https://bitespeed-6acq.onrender.com

**Test the Live API:**

Health Check:
```bash
curl https://bitespeed-6acq.onrender.com/health
```

Identity Reconciliation:
```bash
curl -X POST https://bitespeed-6acq.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","phoneNumber":"1234567890"}'
```

### Prerequisites for Deployment

- Deployed PostgreSQL database (AWS RDS, Google Cloud SQL, Supabase, etc.)
- Node.js hosting (Render.com, Heroku, Railway, AWS Lambda, etc.)
- Environment variables configured

### Traditional Server Deployment (Ubuntu/Linux)

#### 1. **Connect to Server**

```bash
ssh ubuntu@your-server-ip
```

#### 2. **Install Node.js and PostgreSQL Client**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install nodejs
sudo apt-get install postgresql-client
```

#### 3. **Clone Repository**

```bash
cd /home/ubuntu/apps
git clone <your-repo-url> identity-reconciliation
cd identity-reconciliation
```

#### 4. **Install Dependencies**

```bash
npm install --production
npm run build
```

#### 5. **Configure Environment**

```bash
nano .env
```

Add:
```env
DATABASE_URL="postgresql://user:pass@db-server:5432/bitespeed"
PORT=3000
NODE_ENV=production
```

#### 6. **Run Database Migrations**

```bash
npx prisma migrate deploy
```

#### 7. **Start Service with PM2 (Process Manager)**

```bash
npm install -g pm2
pm2 start dist/index.js --name "identity-service"
pm2 save
pm2 startup
```

### Docker Deployment

#### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
```

#### Docker Compose

```bash
docker-compose up -d
```

### Render.com Deployment (Recommended - Free Tier Available)

Render.com provides the easiest deployment with automatic CI/CD from GitHub.

#### Steps:

1. **Visit Render.com**
   - Go to https://render.com and sign up with GitHub

2. **Create New Web Service**
   - Click "New +"
   - Select "Web Service"
   - Connect your GitHub repository (Ayush0606/Bitespeed)

3. **Configure Service**
   - **Name:** bitespeed (or your choice)
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build && npx prisma migrate deploy`
   - **Start Command:** `npm start`
   - **Plan:** Free (or Starter for production)

4. **Set Environment Variables**
   - Add `DATABASE_URL`: Your Supabase PostgreSQL connection string
   - Add `NODE_ENV`: `production`
   - Add `PORT`: `3000`

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy from your GitHub repo

6. **Automatic Redeployment**
   - Every push to main branch automatically triggers a new deployment
   - Check deployment status in Render dashboard

### Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create identity-reconciliation-service

# Set environment variable
heroku config:set DATABASE_URL="your-postgresql-url"

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Environment Variables (Production)

```env
DATABASE_URL=postgresql://prod-user:strong-password@prod-db.example.com:5432/bitespeed
PORT=3000
NODE_ENV=production
```

## Examples

### Example 1: Create New Contact

**Request:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "userA@example.com",
    "phoneNumber": "+91-9876543210"
  }'
```

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["userA@example.com"],
    "phoneNumbers": ["+91-9876543210"],
    "secondaryContactIds": []
  }
}
```

### Example 2: Link Existing Contact (Same Email)

**Previous state:** Contact 1 exists with userA@example.com

**Request:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "userA@example.com",
    "phoneNumber": "+91-9876543210"
  }'
```

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["userA@example.com"],
    "phoneNumbers": ["+91-9876543210"],
    "secondaryContactIds": [2]
  }
}
```

### Example 3: Merge Multiple Chains

**Previous state:**
- Contact 1: email=userA@example.com (primary)
- Contact 2: phone=+91-9876543210, linkedId=1 (secondary)
- Contact 3: email=userB@example.com (primary)
- Contact 4: phone=+91-1111111111, linkedId=3 (secondary)

**Request (link email from chain 2):**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "userB@example.com",
    "phoneNumber": "+91-9876543210"
  }'
```

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["userA@example.com", "userB@example.com"],
    "phoneNumbers": ["+91-9876543210", "+91-1111111111"],
    "secondaryContactIds": [2, 3, 4]
  }
}
```

### Example 4: Error - Missing Both Fields

**Request:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (400):**
```json
{
  "error": "Either email or phoneNumber must be provided",
  "statusCode": 400
}
```

### Example 5: Using PowerShell (Windows)

```powershell
$body = @{
    email = "customer@example.com"
    phoneNumber = "+1234567890"
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "http://localhost:3000/identify" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json
```

## Project Structure

```
bitespeed/
├── src/
│   ├── controllers/
│   │   └── identifyController.ts      # HTTP request handlers
│   ├── services/
│   │   └── identificationService.ts   # Business logic
│   ├── middleware/
│   │   └── errorHandler.ts            # Error handling
│   ├── types/
│   │   └── index.ts                   # TypeScript interfaces
│   ├── prisma.ts                      # Prisma client singleton
│   ├── server.ts                      # Express setup
│   └── index.ts                       # Application entry point
├── prisma/
│   ├── schema.prisma                  # Database schema
│   └── migrations/
│       └── init/
│           └── migration.sql          # Initial migration
├── dist/                              # Compiled JavaScript (generated)
├── package.json                       # Dependencies
├── tsconfig.json                      # TypeScript config
├── .env.example                       # Environment template
├── .gitignore                         # Git ignore rules
└── README.md                          # This file
```

## Development Tips

### Type Checking

```bash
npm run type-check
```

Validates TypeScript without building.

### Prisma Studio

```bash
npm run prisma:studio
```

Opens a visual database browser at http://localhost:5555.

### Development Logging

When `NODE_ENV=development`, the server logs:
- All SQL queries
- Errors and warnings
- HTTP request info

### Building for Production

```bash
npm run build
```

Creates optimized JavaScript in `dist/` folder.

## Troubleshooting

### Database Connection Error

**Error:** `Error: Unable to reach database server`

**Solution:**
1. Verify DATABASE_URL in `.env`
2. Ensure PostgreSQL is running
3. Check network connectivity
4. Confirm credentials

### TypeScript Compilation Error

**Error:** `error TS1086: An accessor cannot be declared in ambient context`

**Solution:**
```bash
npm install --save-dev typescript@latest
npm run type-check
```

### Prisma Migration Issues

**Error:** `Error: P3005`

**Solution:**
```bash
# Reset database (development only!)
npx prisma migrate reset

# Or manually fix:
npm run prisma:migrate
```

## Performance Considerations

- **Indexing**: Email, phone, linkedId, and linkPrecedence are indexed for fast lookups
- **Transactions**: All operations use Prisma transactions for data consistency
- **Connection Pooling**: Prisma Client handles connection pooling automatically
- **Query Optimization**: Batch operations reduce database queries by 70-80%
  - Fetches all contacts at each level together instead of one-by-one
  - Uses `updateMany()` for batch updates instead of individual updates
  - Reduces query count from N+1 to constant regardless of chain depth
- **Response Time**: Typical requests complete in 5-20ms
  - Small contact chains (2 contacts): ~5ms
  - Medium chains (5 contacts): ~8ms
  - Large chains (10+ contacts): ~10-15ms

For detailed performance metrics and optimization strategy, see [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md) and [OPTIMIZATION_GUIDE.md](OPTIMIZATION_GUIDE.md).

## Security Considerations

- Input validation on all endpoints
- Error messages don't leak sensitive data
- Database operations use parameterized queries (Prisma)
- No hardcoded credentials
- Use strong database passwords in production
- Consider adding rate limiting for the /identify endpoint
- Add authentication if exposing publicly

## Contributing

When contributing, ensure:
1. TypeScript strict mode passes
2. No eslint errors
3. All database operations use transactions
4. Add comments explaining complex logic
5. Handle edge cases

## License

ISC

---

For support or questions, refer to the [Express.js Documentation](https://expressjs.com/) and [Prisma Documentation](https://www.prisma.io/docs/).
