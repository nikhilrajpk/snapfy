#🌟 Snapfy - A Social Media Platform
Snapfy is a modern, full-stack social media platform built with Django and React, offering a rich feature set including real-time messaging, content sharing (posts, stories, reels), background task handling, cloud media storage, and advanced admin analytics.

🚀 Features
✅ User Management & Authentication

User Registration: /api/register/ with OTP email verification.
OTP Verification: Email sent via Celery and Gmail SMTP.
User Profiles: View/edit with media support.
User Retrieval: /api/users/<id>/
Follow/Unfollow & Block: Manage user interactions.
Suggested Users: Smart suggestions using mutual connections.

📸 Content Creation & Interaction

Posts & Stories: Create, view, and interact with content.
Reels: Upload short videos with music (3–30s).
Explore Page: Trending content and user discovery.
Media Uploads: Handled via Cloudinary.

⚙️ Asynchronous Task Handling

Celery + Redis: Background jobs and email delivery.
Windows Support: Using worker_pool='solo'.

💬 Real-Time Features

Chat System: Real-time private and group messaging via Django Channels and Redis.
WebSockets: Instant message delivery with message history, online status indicators, read receipts, typing indicators, and media attachments (images, videos).

🛡️ Admin Panel

Dashboard: Active users, growth, online users, blocked users.
Analytics: Track growth, engagement, hashtags, PDF reports.
Trending Songs Management: CRUD operations with audio trimming.
Export Reports: Paginated and downloadable PDF analytics.


🔗 API Endpoints
Built using Django REST Framework (DRF).



Method
Endpoint
Description



POST
/api/register/
Register a new user


GET
/api/users/<id>/
Fetch user details


GET
/api/admin/dashboard-stats/
Get admin dashboard metrics


GET
/api/admin/generate-report/
Generate PDF report


POST
/api/admin/music-tracks/
Create music track


GET/POST
/api/chat/messages/
Retrieve or send chat messages


👉 Full API docs coming soon at /docs/api.

💠 Logging

Custom INFO-level logging for monitoring and debugging.


🌍 Deployment

ASGI Server: Powered by Daphne.
Secure Config: Uses environment variables for sensitive data.


🧱 Tech Stack



Layer
Technologies



Backend
Django, Django REST Framework


Frontend
React, Axios, Tailwind CSS, Recharts


Task Queue
Celery with Redis


Real-Time
Django Channels + Redis


Media
Cloudinary


Email
Django Email (Gmail SMTP)


Reports
ReportLab (PDF generation)


Server
Daphne (ASGI)


Database
PostgreSQL / SQLite (dev)



🪠 Prerequisites

Python 3.8+
Node.js & npm
Redis (localhost:6379)
Cloudinary Account
Gmail App Password (for SMTP)


👷️ Installation
Backend Setup
# Clone Repository
git clone https://github.com/nikhilrajpk/snapfy.git
cd snapfy

# Create Virtual Environment
python -m venv env
source env/bin/activate  # Windows: env\Scripts\activate

# Install Dependencies
pip install -r requirements.txt

Create a .env file:
EMAIL_HOST_USER=yourname@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
CLOUD_NAME=your-cloudinary-cloud-name
API_KEY=your-cloudinary-api-key
API_SECRET=your-cloudinary-api-secret
GOOGLE_CLIENT_ID=your-google-client-id  # optional

Run migrations and services:
python manage.py migrate
redis-server
daphne -b 0.0.0.0 -p 8000 snapfy_django.asgi:application
celery -A snapfy_django worker -l info

Frontend Setup
# Go to Frontend Directory
cd frontend

# Install Dependencies
npm install

# Run React App
npm start

App runs on: http://localhost:3000

🔍 Testing the API

Register a new user from the frontend.
Check backend logs to capture the OTP.
Complete email verification and explore features like posting, exploring, real-time messaging (private/group chats, read receipts, typing indicators, media attachments), and admin tools.


📜 License
This project is licensed under the MIT License.

🤝 Contributing
Pull requests are welcome! For major changes, open an issue first to discuss.

✨ Acknowledgments

Cloudinary
Redis
Django Channels
ReportLab
Tailwind CSS


Made with ❤️ by Nikhil Raj
