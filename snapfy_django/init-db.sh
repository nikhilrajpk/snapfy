#!/bin/bash
# Wait for PostgreSQL to be ready
MAX_ATTEMPTS=30
ATTEMPT=1
until pg_isready -h localhost -p 5432 -U postgres || [ $ATTEMPT -gt $MAX_ATTEMPTS ]; do
  echo "Waiting for PostgreSQL to be ready... Attempt $ATTEMPT/$MAX_ATTEMPTS"
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
  echo "PostgreSQL is not ready after $MAX_ATTEMPTS attempts. Exiting."
  exit 1
fi

# Create the database if it doesn't exist
su - postgres -c "psql -c 'CREATE DATABASE snapfy;' || true"

# Run Django migrations
python manage.py migrate