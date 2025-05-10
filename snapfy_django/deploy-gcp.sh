#!/bin/bash

# GCP Deployment Script for Snapfy
# Make sure you have gcloud CLI installed and configured

# Set variables
PROJECT_ID="your-project-id"
REGION="asia-south1"
SERVICE_NAME="snapfy-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Snapfy GCP Deployment...${NC}"

# Step 1: Set project
echo -e "${GREEN}Setting up GCP project...${NC}"
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION

# Step 2: Enable required APIs
echo -e "${GREEN}Enabling required APIs...${NC}"
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudstorage.googleapis.com

# Step 3: Create Cloud SQL instance
echo -e "${GREEN}Creating Cloud SQL instance...${NC}"
gcloud sql instances create snapfy-db \
  --database-version=POSTGRES_14 \
  --tier=db-custom-1-3840 \
  --region=$REGION \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=03:00

# Create database and user
gcloud sql databases create snapfy_db --instance=snapfy-db
gcloud sql users create snapfy_user --instance=snapfy-db --password=REPLACE_WITH_SECURE_PASSWORD

# Step 4: Create Redis instance
echo -e "${GREEN}Creating Redis instance...${NC}"
gcloud redis instances create snapfy-redis \
  --size=1 \
  --region=$REGION \
  --redis-version=redis_6_x

# Step 5: Create service account
echo -e "${GREEN}Creating service account...${NC}"
gcloud iam service-accounts create snapfy-backend \
  --display-name="Snapfy Backend Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:snapfy-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:snapfy-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/redis.editor"

# Step 6: Build and submit to Cloud Build
echo -e "${GREEN}Building and pushing Docker image...${NC}"
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME .

# Get Redis IP
REDIS_IP=$(gcloud redis instances describe snapfy-redis --region=$REGION --format="value(host)")
DB_INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe snapfy-db --format="value(connectionName)")

echo -e "${GREEN}Redis IP: $REDIS_IP${NC}"
echo -e "${GREEN}DB Connection: $DB_INSTANCE_CONNECTION_NAME${NC}"

# Step 7: Deploy to Cloud Run
echo -e "${GREEN}Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --region $REGION \
  --platform managed \
  --port 8000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --service-account "snapfy-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --add-cloudsql-instances $DB_INSTANCE_CONNECTION_NAME \
  --set-env-vars="DB_HOST=/cloudsql/$DB_INSTANCE_CONNECTION_NAME,DB_NAME=snapfy_db,DB_USER=snapfy_user,DB_PASSWORD=REPLACE_WITH_SECURE_PASSWORD,REDIS_HOST=$REDIS_IP,REDIS_PORT=6379,SECRET_KEY=REPLACE_WITH_SECRET_KEY,DEBUG=False,ALLOWED_HOSTS=.asia-south1.run.app;localhost;127.0.0.1" \
  --allow-unauthenticated

# Get the Cloud Run URL
CLOUD_RUN_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}Your API URL: $CLOUD_RUN_URL${NC}"
echo -e "${GREEN}Don't forget to:${NC}"
echo -e "1. Add $CLOUD_RUN_URL to your CORS_ALLOWED_ORIGINS in settings.py"
echo -e "2. Update your frontend environment variables"
echo -e "3. Add other environment variables (EMAIL, CLOUDINARY, etc.)"
echo -e "4. Deploy Celery worker and beat services"

echo -e "\n${GREEN}Deploy Celery worker:${NC}"
echo "gcloud run deploy ${SERVICE_NAME}-worker --image gcr.io/$PROJECT_ID/$SERVICE_NAME --cpu-throttling --command='celery,-A,snapfy_django,worker,-l,info' --set-env-vars="DB_HOST=/cloudsql/$DB_INSTANCE_CONNECTION_NAME" --add-cloudsql-instances $DB_INSTANCE_CONNECTION_NAME"

echo -e "\n${GREEN}Deploy Celery beat:${NC}"
echo "gcloud run deploy ${SERVICE_NAME}-beat --image gcr.io/$PROJECT_ID/$SERVICE_NAME --cpu-throttling --command='celery,-A,snapfy_django,beat,-l,info' --set-env-vars="DB_HOST=/cloudsql/$DB_INSTANCE_CONNECTION_NAME" --add-cloudsql-instances $DB_INSTANCE_CONNECTION_NAME"