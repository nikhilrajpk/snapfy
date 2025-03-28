# Snapfy - A Social Media Platform

Snapfy is a feature-rich social media platform built with **Django** and **React**, designed to connect users through posts, stories, reels, and real-time interactions. It combines a robust backend with asynchronous task processing, cloud-based media storage, and a dynamic frontend to deliver a scalable and engaging user experience.

## Features

### ✅ **User Management & Authentication**
- **User Registration:** Sign up via `/api/register/` with email verification using a 4-digit OTP.
- **OTP Verification:** Sends verification email using **Celery** and **Gmail SMTP**.
- **User Profiles:** View and edit user details with media support.
- **User Retrieval:** Fetch user data by ID via `/api/users/<id>/`.
- **Follow/Unfollow:** Curate your feed by following or unfollowing users.
- **Block Users:** Restrict unwanted interactions.
- **Suggested Users:** Algorithm-based user suggestions.

### 📸 **Content Creation & Interaction**
- **Posts:** Create, view, and engage with text/image posts.
- **Stories:** Share temporary stories that auto-delete after 24 hours.
- **Reels:** Upload and watch short video content.
- **Explore Page:** Discover trending content and users.
- **Media Storage:** Secure media uploads via **Cloudinary**.

### ⚙️ **Task Queue**
- **Celery with Redis:** Asynchronous task handling for emails and background jobs.
- **Windows Compatibility:** Uses `worker_pool='solo'` for **Celery** on Windows.

### 💬 **Real-Time Features (In Progress)**
- **Chat System:** Real-time messaging with **Django Channels** and **Redis**.
- **WebSocket Support:** Enables instant message delivery.

## 🔗 **API Endpoints**
Built with **Django REST Framework (DRF)** for full functionality.

**Examples:**
- `POST /api/register/` — Register a new user.
- `GET /api/users/<id>/` — Retrieve user details.

## 🛠️ **Logging**
- **Custom Logging:** INFO-level logs for debugging and monitoring.

## 🌍 **Deployment**
- **ASGI Server:** Powered by **Daphne** for HTTP and WebSocket support.
- **Environment Variables:** Secure management of sensitive data.

## 🏗️ **Tech Stack**
- **Backend:** Django, Django REST Framework
- **Frontend:** React with Axios
- **Task Queue:** Celery with Redis
- **Real-Time:** Django Channels with Redis
- **Media Storage:** Cloudinary
- **Email:** Django Email with Gmail SMTP
- **Server:** Daphne (ASGI)
- **Database:** PostgreSQL/SQLite (Specify as applicable)

## 🛑 **Prerequisites**
- Python 3.8+
- Node.js and npm
- Redis Server (127.0.0.1:6379)
- Cloudinary Account
- Gmail Account with App Password

## 🔨 **Installation**

### Backend Setup
```bash
# Clone the Repository
git clone https://github.com/nikhilrajpk/snapfy.git
cd snapfy

# Set Up Virtual Environment
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate

# Install Backend Dependencies
pip install -r requirements.txt

# Configure Environment Variables
# Create a .env file in the root
touch .env
```
**.env File Example:**
```env
EMAIL_HOST_USER=yourname@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
CLOUD_NAME=your-cloudinary-cloud-name
API_KEY=your-cloudinary-api-key
API_SECRET=your-cloudinary-api-secret
GOOGLE_CLIENT_ID=your-google-client-id  # Optional
```

### Apply Migrations
```bash
python manage.py migrate
```

### Run Redis
```bash
redis-server
```

### Start Backend
```bash
# Run ASGI server
daphne -b 0.0.0.0 -p 8000 snapfy_django.asgi:application

# Start Celery worker
celery -A snapfy_django worker -l info
```

### Frontend Setup
```bash
# Navigate to Frontend Directory
cd frontend

# Install Frontend Dependencies
npm install

# Start the Frontend
npm start
```
Access the app at **http://localhost:3000**.

## 🔍 **Testing the API**
1. Register a user via the React frontend.
2. Monitor backend logs for OTP and email status.

## 📈 **Current Status**
- **Completed:**
  - User authentication and profiles.
  - Posts, stories, and reels.
  - Follow/block functionality.
  - Explore page with suggested users.
  - React frontend with Axios.

- **In Progress:**
  - Real-time chat system with **Django Channels**.

- **Next Steps:**
  - Finalize chat system.
  - Enhance React UI/UX.
  - Optimize email deliverability (e.g., **SendGrid**).
  - Implement notifications.

## 🤝 **Contributing**
Contributions are welcome! Fork the repo, submit issues, or send pull requests to help improve Snapfy.

## 📫 **Contact**
- **Author:** Nikhilraj PK
- **GitHub:** [nikhilrajpk](https://github.com/nikhilrajpk)

