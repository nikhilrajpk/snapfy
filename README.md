<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Snapfy - A Social Media Platform</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 20px auto;
            padding: 0 20px;
            color: #333;
            background-color: #f9f9f9;
        }
        h1, h2, h3 {
            color: #198754;
        }
        h1 {
            font-size: 2.5em;
            border-bottom: 2px solid #198754;
            padding-bottom: 10px;
        }
        h2 {
            font-size: 1.8em;
            margin-top: 30px;
        }
        h3 {
            font-size: 1.4em;
        }
        p, li {
            font-size: 1em;
            color: #444;
        }
        ul {
            list-style: none;
            padding: 0;
        }
        ul li {
            margin-bottom: 10px;
            position: relative;
            padding-left: 25px;
        }
        ul li:before {
            content: '✅';
            position: absolute;
            left: 0;
            color: #198754;
        }
        a {
            color: #198754;
            text-decoration: none;
            transition: color 0.2s;
        }
        a:hover {
            color: #157347;
            text-decoration: underline;
        }
        pre, code {
            background-color: #f4f4f4;
            border-radius: 5px;
            padding: 10px;
            font-family: 'Consolas', monospace;
            overflow-x: auto;
        }
        pre {
            margin: 10px 0;
        }
        details {
            margin: 15px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        summary {
            cursor: pointer;
            font-weight: bold;
            color: #198754;
        }
        .highlight {
            background-color: #e6f3e6;
            padding: 15px;
            border-left: 4px solid #198754;
            margin: 10px 0;
        }
        .icon {
            margin-right: 5px;
            vertical-align: middle;
        }
        @media (max-width: 600px) {
            h1 {
                font-size: 2em;
            }
            h2 {
                font-size: 1.5em;
            }
            body {
                padding: 0 10px;
            }
        }
    </style>
</head>
<body>
    <h1>Snapfy - A Social Media Platform</h1>
    <p>Snapfy is a feature-rich social media platform built with <strong>Django</strong> and <strong>React</strong>, designed to connect users through posts, stories, reels, and real-time interactions. It combines a robust backend with asynchronous task processing, cloud-based media storage, and a dynamic frontend to deliver a scalable and engaging user experience.</p>

    <section>
        <h2>Features</h2>
        <h3>✅ User Management & Authentication</h3>
        <ul>
            <li><strong>User Registration:</strong> Sign up via <code>/api/register/</code> with email verification using a 4-digit OTP.</li>
            <li><strong>OTP Verification:</strong> Sends verification email using <strong>Celery</strong> and <strong>Gmail SMTP</strong>.</li>
            <li><strong>User Profiles:</strong> View and edit user details with media support.</li>
            <li><strong>User Retrieval:</strong> Fetch user data by ID via <code>/api/users/&lt;id&gt;/</code>.</li>
            <li><strong>Follow/Unfollow:</strong> Curate your feed by following or unfollowing users.</li>
            <li><strong>Block Users:</strong> Restrict unwanted interactions.</li>
            <li><strong>Suggested Users:</strong> Algorithm-based user suggestions.</li>
        </ul>

        <h3>📸 Content Creation & Interaction</h3>
        <ul>
            <li><strong>Posts:</strong> Create, view, and engage with text/image posts.</li>
            <li><strong>Stories:</strong> Share temporary stories that auto-delete after 24 hours.</li>
            <li><strong>Reels:</strong> Upload and watch short video content.</li>
            <li><strong>Explore Page:</strong> Discover trending content and users.</li>
            <li><strong>Media Storage:</strong> Secure media uploads via <a href="https://cloudinary.com" target="_blank">Cloudinary</a>.</li>
        </ul>

        <h3>⚙️ Task Queue</h3>
        <ul>
            <li><strong>Celery with Redis:</strong> Asynchronous task handling for emails and background jobs.</li>
            <li><strong>Windows Compatibility:</strong> Uses <code>worker_pool='solo'</code> for <strong>Celery</strong> on Windows.</li>
        </ul>

        <h3>💬 Real-Time Features (In Progress)</h3>
        <ul>
            <li><strong>Chat System:</strong> Real-time messaging with <strong>Django Channels</strong> and <strong>Redis</strong>.</li>
            <li><strong>WebSocket Support:</strong> Enables instant message delivery.</li>
        </ul>

        <h3>🛡️ Admin Panel</h3>
        <div class="highlight">
            <p>The admin panel provides powerful tools for managing the platform, monitoring analytics, and curating content.</p>
        </div>
        <ul>
            <li><strong>Dashboard:</strong> Displays key metrics like total users, active users, blocked users, online users, and pending reports with interactive growth charts.</li>
            <li><strong>Analytics:</strong> Tracks user growth, post engagement, likes, comments, and hashtag trends with real-time charts and PDF report generation.</li>
            <li><strong>Export Reports:</strong> View, filter, and download saved PDF reports (e.g., user growth, post trends) with pagination.</li>
            <li><strong>Trending Songs:</strong> Manage music tracks for reels, including create, update, delete, audio trimming (3–30 seconds), and trending status toggling.</li>
        </ul>
    </section>

    <section>
        <h2>🔗 API Endpoints</h2>
        <p>Built with <strong>Django REST Framework (DRF)</strong> for full functionality.</p>
        <p><strong>Examples:</strong></p>
        <ul>
            <li><code>POST /api/register/</code> — Register a new user.</li>
            <li><code>GET /api/users/&lt;id&gt;/</code> — Retrieve user details.</li>
            <li><code>GET /api/admin/dashboard-stats/</code> — Fetch admin dashboard statistics.</li>
            <li><code>GET /api/admin/generate-report/</code> — Generate PDF reports for analytics.</li>
            <li><code>POST /api/admin/music-tracks/</code> — Create a music track.</li>
        </ul>
        <p>Explore all endpoints in the <a href="/docs/api">API documentation</a> (to be added).</p>
    </section>

    <section>
        <h2>🛠️ Logging</h2>
        <ul>
            <li><strong>Custom Logging:</strong> INFO-level logs for debugging and monitoring.</li>
        </ul>
    </section>

    <section>
        <h2>🌍 Deployment</h2>
        <ul>
            <li><strong>ASGI Server:</strong> Powered by <strong>Daphne</strong> for HTTP and WebSocket support.</li>
            <li><strong>Environment Variables:</strong> Secure management of sensitive data.</li>
        </ul>
    </section>

    <section>
        <h2>🏗️ Tech Stack</h2>
        <ul>
            <li><strong>Backend:</strong> Django, Django REST Framework</li>
            <li><strong>Frontend:</strong> React with Axios, Tailwind CSS, Recharts</li>
            <li><strong>Task Queue:</strong> Celery with Redis</li>
            <li><strong>Real-Time:</strong> Django Channels with Redis</li>
            <li><strong>Media Storage:</strong> <a href="https://cloudinary.com" target="_blank">Cloudinary</a></li>
            <li><strong>Email:</strong> Django Email with Gmail SMTP</li>
            <li><strong>PDF Generation:</strong> ReportLab</li>
            <li><strong>Server:</strong> Daphne (ASGI)</li>
            <li><strong>Database:</strong> PostgreSQL/SQLite (configurable)</li>
        </ul>
    </section>

    <section>
        <h2>🛑 Prerequisites</h2>
        <ul>
            <li>Python 3.8+</li>
            <li>Node.js and npm</li>
            <li><a href="https://redis.io" target="_blank">Redis Server</a> (127.0.0.1:6379)</li>
            <li><a href="https://cloudinary.com" target="_blank">Cloudinary Account</a></li>
            <li>Gmail Account with App Password</li>
        </ul>
    </section>

    <section>
        <h2>🔨 Installation</h2>
        <details>
            <summary>Backend Setup</summary>
            <pre><code>
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
            </code></pre>
            <p><strong>.env File Example:</strong></p>
            <pre><code>
EMAIL_HOST_USER=yourname@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
CLOUD_NAME=your-cloudinary-cloud-name
API_KEY=your-cloudinary-api-key
API_SECRET=your-cloudinary-api-secret
GOOGLE_CLIENT_ID=your-google-client-id  # Optional
            </code></pre>
            <p><strong>Apply Migrations</strong></p>
            <pre><code>
python manage.py migrate
            </code></pre>
            <p><strong>Run Redis</strong></p>
            <pre><code>
redis-server
            </code></pre>
            <p><strong>Start Backend</strong></p>
            <pre><code>
# Run ASGI server
daphne -b 0.0.0.0 -p 8000 snapfy_django.asgi:application

# Start Celery worker
celery -A snapfy_django worker -l info
            </code></pre>
        </details>

        <details>
            <summary>Frontend Setup</summary>
            <pre><code>
# Navigate to Frontend Directory
cd frontend

# Install Frontend Dependencies
npm install

# Start the Frontend
npm start
            </code></pre>
            <p>Access the app at <a href="http://localhost:3000">http://localhost:3000</a>.</p>
        </details>
    </section>

    <section>
        <h2>🔍 Testing the API</h2>
        <ol>
            <li>Register a user via the React frontend.</li>
            <li>Monitor backend logs for OTP and email status.</li>
            <li>Test admin features:
                <ul>
                    <li>Access <code>/admin/</code> to view the dashboard.</li>
                    <li>Generate PDF reports at <code>/admin/analytics</code>.</li>
                    <li>Manage music tracks at <code>/admin/trending-songs</code>.</li>
                </ul>
            </li>
        </ol>
    </section>

    <section>
        <h2>📈 Current Status</h2>
        <h3>Completed</h3>
        <ul>
            <li>User authentication and profiles.</li>
            <li>Posts, stories, and reels.</li>
            <li>Follow/block functionality.</li>
            <li>Explore page with suggested users.</li>
            <li>Admin panel with dashboard, analytics, report exports, and music track management.</li>
            <li>React frontend with Axios and Tailwind CSS.</li>
        </ul>
        <h3>In Progress</h3>
        <ul>
            <li>Real-time chat system with <strong>Django Channels</strong>.</li>
        </ul>
        <h3>Next Steps</h3>
        <ul>
            <li>Finalize chat system.</li>
            <li>Enhance React UI/UX.</li>
            <li>Optimize email deliverability (e.g., <a href="https://sendgrid.com" target="_blank">SendGrid</a>).</li>
            <li>Implement notifications.</li>
        </ul>
    </section>

    <section>
        <h2>🤝 Contributing</h2>
        <p>Contributions are welcome! Fork the repo, submit issues, or send pull requests to help improve Snapfy.</p>
        <ol>
            <li>Fork the repository.</li>
            <li>Create a feature branch (<code>git checkout -b feature/YourFeature</code>).</li>
            <li>Commit your changes (<code>git commit -m "Add YourFeature"</code>).</li>
            <li>Push to the branch (<code>git push origin feature/YourFeature</code>).</li>
            <li>Open a Pull Request.</li>
        </ol>
    </section>

    <section>
        <h2>📫 Contact</h2>
        <ul>
            <li><strong>Author:</strong> Nikhilraj PK</li>
            <li><strong>GitHub:</strong> <a href="https://github.com/nikhilrajpk" target="_blank">nikhilrajpk</a></li>
        </ul>
    </section>

</body>
</html>
