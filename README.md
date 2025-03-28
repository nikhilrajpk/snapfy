Snapfy - A Social Media Platform

Snapfy is a feature-rich social media platform built with Django and React, designed to connect users through posts, stories, reels, and real-time interactions. It combines a robust backend with asynchronous task processing, cloud-based media storage, and a dynamic frontend to deliver a scalable and engaging user experience.

Features Completed
User Management & Authentication
User Registration: Sign up via /api/register/ with email verification using a 4-digit OTP.
OTP Email Verification: Sends a verification email with Celery and Gmail SMTP.
User Profile: View and edit user profiles with details and media.
User Retrieval: Fetch user data by ID via /api/users/<id>/.
Follow/Unfollow: Users can follow or unfollow others to curate their feed.
Block: Block unwanted users to restrict interactions.
Suggested Users: Algorithm-based user suggestions for networking.
Content Creation & Interaction
Posts: Create, view, and interact with posts (e.g., text, images).
Stories: Share temporary stories that expire after a set time.
Reels: Upload and watch short video content.
Add Post: Users can upload new posts with media support via Cloudinary.
Explore Page: Discover trending content and users.
Media Storage
Cloudinary Integration: Securely stores images, videos, and other media with environment variable-based configuration.
Task Queue
Celery with Redis: Handles asynchronous tasks like email sending (redis://127.0.0.1:6379/1).
Windows Compatibility: Uses worker_pool='solo' for Celery on Windows.
Real-Time Features (In Progress)
Chat System: Currently implementing real-time messaging with Django Channels and WebSocket support via Redis (127.0.0.1:6379).
API Endpoints
RESTful API: Built with Django REST Framework (DRF) for all major functionalities.
Examples:
POST /api/register/: Register a new user.
GET /api/users/<id>/: Retrieve user details.
Logging
Custom Logging: INFO-level logs to the console for debugging and monitoring.
Deployment
ASGI Server: Runs with Daphne for HTTP and WebSocket support.
Environment Variables: Securely manages sensitive data (e.g., email credentials, Cloudinary keys).
Tech Stack
Backend: Django, Django REST Framework
Frontend: React with Axios for API communication
Task Queue: Celery with Redis
Real-Time: Django Channels with Redis
Media Storage: Cloudinary
Email: Django Email with Gmail SMTP
Server: Daphne (ASGI)
Database: Assumed PostgreSQL/SQLite (update as applicable)
Setup Instructions
Prerequisites
Python 3.8+
Node.js and npm (for React frontend)
Redis Server (127.0.0.1:6379)
Cloudinary account
Gmail account with App Password
Installation
Backend
Clone the Repository:
bash

Collapse

Wrap

Copy
git clone https://github.com/nikhilrajpk/snapfy.git
cd snapfy
Set Up Virtual Environment:
bash

Collapse

Wrap

Copy
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
Install Backend Dependencies:
bash

Collapse

Wrap

Copy
pip install -r requirements.txt
Configure Environment Variables: Create a .env file in the root:
env

Collapse

Wrap

Copy
EMAIL_HOST_USER=yourname@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
CLOUD_NAME=your-cloudinary-cloud-name
API_KEY=your-cloudinary-api-key
API_SECRET=your-cloudinary-api-secret
GOOGLE_CLIENT_ID=your-google-client-id  # Optional
Apply Migrations:
bash

Collapse

Wrap

Copy
python manage.py migrate
Run Redis:
bash

Collapse

Wrap

Copy
redis-server
Start the Backend:
ASGI server:
bash

Collapse

Wrap

Copy
daphne -b 0.0.0.0 -p 8000 snapfy_django.asgi:application
Celery worker:
bash

Collapse

Wrap

Copy
celery -A snapfy_django worker -l info
Frontend
Navigate to Frontend Directory: Assuming your React code is in a frontend folder (adjust if different):
bash

Collapse

Wrap

Copy
cd frontend
Install Frontend Dependencies:
bash

Collapse

Wrap

Copy
npm install
Start the Frontend:
bash

Collapse

Wrap

Copy
npm start
The React app typically runs on http://localhost:3000 and communicates with the backend via Axios.
Test the API:
Register a user: POST /api/register/ via the React frontend.
Check backend logs for OTP and email status.
Current Status
Completed: User auth, profiles, posts, stories, reels, follow/block, explore page, suggested users, React frontend with Axios.
In Progress: Real-time chat system with Django Channels.
Next Steps: Finalize chat, enhance React UI/UX, optimize email deliverability (e.g., SendGrid), add notifications.
Contributing
Contributions are welcome! Fork the repo, submit issues, or send pull requests to help improve Snapfy.


Contact
Author: Nikhilraj PK
GitHub: nikhilrajpk
