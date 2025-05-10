#!/bin/bash

# Function to wait for database
wait_for_db() {
    echo "Waiting for database to be ready..."
    while ! python -c "import psycopg2; psycopg2.connect(host='${DB_HOST}', user='${DB_USER}', password='${DB_PASSWORD}', database='${DB_NAME}')" 2>/dev/null; do
        sleep 1
    done
    echo "Database is ready"
}

# Only run migrations if this is the web container
if [[ "$1" == "daphne" ]]; then
    wait_for_db
    
    # Apply database migrations
    echo "Applying database migrations..."
    python manage.py migrate --noinput
    
    # Create superuser if environment variables are set
    if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
        echo "Creating superuser..."
        python manage.py createsuperuser --noinput || echo "Superuser already exists"
    fi
    
    # Collect static files
    echo "Collecting static files..."
    python manage.py collectstatic --noinput
fi

# Execute the command passed to docker run
exec "$@"