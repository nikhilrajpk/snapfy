er: Daphne (ASGI)
Database: Assumed PostgreSQL/SQLite (update as applicable)
Frontend: In progress (update with specifics if applicable, e.g., React)
Setup Instructions
Prerequisites
Python 3.8+
Redis Server (127.0.0.1:6379)
Cloudinary account
Gmail account with App Password
Installation
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
Install Dependencies:
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
Start the Application:
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
Test the API:
Register: POST /api/register/ with email and other fields.
Check logs for OTP and email status.
Current Status
Completed: User auth, profiles, posts, stories, reels, follow/block, explore page, suggested users.
In Progress: Real-time chat system with Django Channels.
Next Steps: Finalize chat, enhance frontend, optimize email deliverability (e.g., SendGrid), add notifications.
Contributing
Contributions are welcome! Fork the repo, submit issues, or send pull requests to help improve Snapfy.


Contact
Author: Nikhil Raj PK
GitHub: nikhilrajpk
