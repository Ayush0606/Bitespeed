#!/bin/bash

# Run Prisma migrations with retry logic
echo "⏳ Running database migrations..."

MAX_RETRIES=3
RETRY_DELAY=5

for ((i=1; i<=MAX_RETRIES; i++)); do
  echo "Migration attempt $i of $MAX_RETRIES..."
  
  if npx prisma migrate deploy; then
    echo "✅ Migrations completed successfully"
    exit 0
  fi
  
  if [ $i -lt $MAX_RETRIES ]; then
    echo "⚠️  Migration failed, retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  fi
done

echo "❌ Migration failed after $MAX_RETRIES attempts"
exit 1
