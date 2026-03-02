# Database Setup Guide

This guide covers setting up PostgreSQL for the Identity Reconciliation Service.

## Table of Contents

- [Local PostgreSQL Setup](#local-postgresql-setup)
- [Docker PostgreSQL Setup](#docker-postgresql-setup)
- [Cloud Database Setup](#cloud-database-setup)
- [Connection Verification](#connection-verification)
- [Backup and Restore](#backup-and-restore)

## Local PostgreSQL Setup

### Windows (Using WSL2 Recommended)

#### Prerequisites
- Windows 10/11 with WSL2 enabled
- Ubuntu or Debian in WSL2

#### Installation

```bash
# Update package list
sudo apt update
sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Verify installation
psql --version
```

#### Starting PostgreSQL

```bash
# Start the service
sudo service postgresql start

# Check status
sudo service postgresql status

# Stop the service
sudo service postgresql stop
```

#### Create Database and User

```bash
# Connect to PostgreSQL default admin
sudo -u postgres psql

# In the PostgreSQL prompt:
CREATE USER bitespeed_user WITH PASSWORD 'secure_password_123';
CREATE DATABASE bitespeed OWNER bitespeed_user;
GRANT ALL PRIVILEGES ON DATABASE bitespeed TO bitespeed_user;
\q
```

#### Update .env

```env
DATABASE_URL="postgresql://bitespeed_user:secure_password_123@localhost:5432/bitespeed"
PORT=3000
NODE_ENV=development
```

#### Run Migrations

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

---

### macOS

#### Prerequisites
- Homebrew installed

#### Installation

```bash
# Install PostgreSQL using Homebrew
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Verify
psql --version
```

#### Create Database and User

```bash
# Connect as default user
psql postgres

# In PostgreSQL prompt:
CREATE USER bitespeed_user WITH PASSWORD 'secure_password_123';
CREATE DATABASE bitespeed OWNER bitespeed_user;
GRANT ALL PRIVILEGES ON DATABASE bitespeed TO bitespeed_user;
\q
```

#### Update .env

```env
DATABASE_URL="postgresql://bitespeed_user:secure_password_123@localhost:5432/bitespeed"
PORT=3000
NODE_ENV=development
```

---

### Linux (Ubuntu/Debian)

#### Installation

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Start on boot
```

#### Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE USER bitespeed_user WITH PASSWORD 'secure_password_123';
CREATE DATABASE bitespeed OWNER bitespeed_user;
GRANT ALL PRIVILEGES ON DATABASE bitespeed TO bitespeed_user;
\q
```

---

## Docker PostgreSQL Setup

### Docker Desktop Setup (Easiest)

#### Prerequisites
- Docker Desktop installed

#### Using docker-compose.yml

```bash
# In the project root
docker-compose up -d

# Verify it's running
docker ps
```

This starts:
- PostgreSQL on localhost:5432
- Username: postgres
- Password: password123
- Database: bitespeed

#### Using docker run

```bash
# Run PostgreSQL container
docker run -d \
  --name bitespeed_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=bitespeed \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

# Verify
docker logs bitespeed_postgres
```

#### .env for Docker

```env
DATABASE_URL="postgresql://postgres:password123@localhost:5432/bitespeed"
PORT=3000
NODE_ENV=development
```

#### Connecting from Host Machine

```bash
# Use psql to connect
psql -h localhost -U postgres -d bitespeed

# Enter password: password123
```

#### Container Management

```bash
# View logs
docker logs bitespeed_postgres

# Stop container
docker stop bitespeed_postgres

# Start container
docker start bitespeed_postgres

# Remove container
docker rm bitespeed_postgres

# View container info
docker inspect bitespeed_postgres
```

---

## Cloud Database Setup

### Amazon RDS

#### Step 1: Create RDS Instance

1. Go to AWS Management Console → RDS
2. Click "Create Database"
3. Select "PostgreSQL"
4. Choose template: "Free Tier"
5. Configure:
   - DB Instance Identifier: `bitespeed-db`
   - Master Username: `postgres`
   - Master Password: Generate strong password
   - DB Instance Class: `db.t3.micro` (free tier)
   - Storage: 20 GB
6. Click "Create Database"

#### Step 2: Configure Security Group

1. Go to the RDS instance
2. Click "Security Groups"
3. Add inbound rule:
   - Type: PostgreSQL
   - Port: 5432
   - Source: Your IP / 0.0.0.0/0 (for development only)

#### Step 3: Get Connection String

1. In RDS Dashboard, find your instance
2. Copy "Endpoint" (e.g., `bitespeed-db.xxxxx.us-east-1.rds.amazonaws.com`)
3. Note the port (usually 5432)

#### Step 4: Update .env

```env
DATABASE_URL="postgresql://postgres:your-password@bitespeed-db.xxxxx.us-east-1.rds.amazonaws.com:5432/bitespeed"
PORT=3000
NODE_ENV=production
```

#### Step 5: Run Migrations

```bash
npm run prisma:migrate
```

---

### Google Cloud SQL

#### Step 1: Create Instance

1. Go to Google Cloud Console → SQL
2. Click "Create Instance"
3. Select PostgreSQL
4. Configure:
   - Instance ID: `bitespeed-db`
   - Password: Generate strong password
   - Database version: PostgreSQL 15
   - Region: Choose closest region
5. Click "Create"

#### Step 2: Get Connection Info

```bash
# Public IP will be shown in the console
# Format: XXX.XXX.XXX.XXX
```

#### Step 3: Update .env

```env
DATABASE_URL="postgresql://postgres:your-password@your.ip.address:5432/bitespeed"
```

---

### Heroku PostgreSQL

#### Step 1: Create Heroku App

```bash
heroku create identity-reconciliation-service
```

#### Step 2: Add PostgreSQL Add-on

```bash
heroku addons:create heroku-postgresql:hobby-dev
```

#### Step 3: Get Database URL

```bash
heroku config:get DATABASE_URL
```

#### Step 4: Set in .env

```bash
heroku config:set DATABASE_URL="your-database-url"
```

---

## Connection Verification

### Test with psql

```bash
# Using Windows/Linux terminal
psql -h localhost -U bitespeed_user -d bitespeed -W

# Enter password when prompted

# If successful, you'll see the prompt:
bitespeed=>

# List tables
\dt

# Exit
\q
```

### Test with Node.js

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log('✅ Database connection successful:', result);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
```

### Test with Service

```bash
# Start the server
npm run dev

# In another terminal, test the health endpoint
curl http://localhost:3000/health

# Should return 200 OK
```

---

## Database Initialization

### First Time Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Create/migrate database
npm run prisma:migrate

# Verify tables exist
npm run prisma:studio
```

This will:
- Apply `prisma/migrations/init/migration.sql`
- Create the `Contact` table with all required fields and indexes
- Set up foreign key relationships

### Database Schema

```sql
CREATE TABLE "Contact" (
    "id" SERIAL PRIMARY KEY,
    "phoneNumber" TEXT NULL,
    "email" TEXT NULL,
    "linkedId" INTEGER NULL,
    "linkPrecedence" TEXT NOT NULL DEFAULT 'primary',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3) NULL,
    CONSTRAINT "Contact_linkedId_fkey" 
        FOREIGN KEY ("linkedId") 
        REFERENCES "Contact"("id") 
        ON DELETE SET NULL
);

CREATE INDEX "Contact_phoneNumber_idx" ON "Contact"("phoneNumber");
CREATE INDEX "Contact_email_idx" ON "Contact"("email");
CREATE INDEX "Contact_linkedId_idx" ON "Contact"("linkedId");
CREATE INDEX "Contact_linkPrecedence_idx" ON "Contact"("linkPrecedence");
```

---

## Backup and Restore

### Backup Database

```bash
# Backup using pg_dump
pg_dump -h localhost -U bitespeed_user -d bitespeed > backup.sql

# With compression
pg_dump -h localhost -U bitespeed_user -d bitespeed | gzip > backup.sql.gz
```

### Restore Database

```bash
# Restore from backup
psql -h localhost -U bitespeed_user -d bitespeed < backup.sql

# From compressed backup
gunzip -c backup.sql.gz | psql -h localhost -U bitespeed_user -d bitespeed
```

### AWS RDS Backup

```bash
# Backup RDS
aws rds create-db-snapshot \
  --db-instance-identifier bitespeed-db \
  --db-snapshot-identifier bitespeed-backup-$(date +%Y%m%d)

# List snapshots
aws rds describe-db-snapshots --db-instance-identifier bitespeed-db

# Restore from RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier bitespeed-db-restored \
  --db-snapshot-identifier bitespeed-backup-20240115
```

---

## Troubleshooting

### Connection Refused

```bash
# Verify PostgreSQL is running
# Windows (WSL): sudo service postgresql status
# macOS: brew services list
# Linux: sudo systemctl status postgresql

# Check if port 5432 is listening
netstat -tuln | grep 5432  # Linux
netstat -ano | findstr :5432  # Windows
```

### Permission Denied

```bash
# Check user exists
psql -h localhost -U postgres -d postgres -c "\du"

# Recreate user
DROP USER IF EXISTS bitespeed_user;
CREATE USER bitespeed_user WITH PASSWORD 'new_password';
GRANT ALL PRIVILEGES ON DATABASE bitespeed TO bitespeed_user;
```

### Database Doesn't Exist

```bash
# List databases
psql -h localhost -U postgres -d postgres -c "\l"

# Recreate database
CREATE DATABASE bitespeed OWNER bitespeed_user;

# Run migrations
npm run prisma:migrate
```

---

## Performance Tuning

### Connection Pool Settings

In `.env` or `datasource` in `schema.prisma`:

```env
# Adjust connection pool size
DATABASE_URL="postgresql://user:pass@host/db?connection_limit=5"
```

### Index Performance

Your schema includes indexes on frequently queried fields:
- Email searches: Indexed
- Phone searches: Indexed
- LinkedId lookups: Indexed
- Precedence filtering: Indexed

---

## Monitoring

### View Connections

```bash
psql -d bitespeed -c "SELECT count(*) FROM pg_stat_activity;"
```

### Check Database Size

```bash
psql -d bitespeed -c "SELECT pg_size_pretty(pg_database_size('bitespeed'));"
```

### PostgreSQL Logs

```bash
# View recent logs
sudo tail -f /var/log/postgresql/postgresql.log  # Linux
# or check Postgres log directory
```

---

## Best Practices

✅ **Do:**
- Use strong passwords (min 16 characters)
- Restrict database access to application servers
- Regularly backup production databases
- Monitor connection pool usage
- Use connection pooling in production
- Enable SSL/TLS for remote connections

❌ **Don't:**
- Use default passwords
- Expose database credentials in code
- Allow world access (0.0.0.0/0) in production
- Store sensitive data unencrypted
- Run migrations manually in production

