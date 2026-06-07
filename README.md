# GitHub Profile Analyzer API

A clean, high-performance Node.js & Express REST API that analyzes a GitHub user's public profile and repository data, computes useful developer statistics, and stores those insights in a MySQL database.

Designed to be simple, robust, and clean—ideal as an interview take-home project.

---

## Features

- **Analyze GitHub Profiles**: Fetches basic user information and paginates through all their public repositories to calculate aggregates.
- **Aggregated Insights**: Calculates total stars received, forks count, watchers count, largest repository size, most starred repository (and its stars), average stars/forks per repository, and the last time they updated any repo.
- **RESTful CRUD**:
  - `POST /api/profiles/analyze`: Fetches and stores profile insights (blocks duplicates).
  - `GET /api/profiles`: Lists all profiles with search, filter (by follower count), pagination, and sort queries.
  - `GET /api/profiles/:username`: Retrieves a single profile's records.
  - `PUT /api/profiles/:username/reanalyze`: Refetches and updates db row.
  - `DELETE /api/profiles/:username`: Removes a record from the database.
- **Security & Stability**:
  - Rate limiting (max 100 requests per 15 minutes per IP).
  - SQL Injection protection using prepared parameterized queries.
  - Strict type checking and body validation.
- **Interactive Documentation**: Swagger UI dashboard mounted at `/api-docs`.
- **Logging**: Morgan HTTP logger for server activity monitoring.

---

## Project Structure

```text
GitHub-profile-Analyzer/
├── src/
│   ├── config/
│   │   ├── db.js              # MySQL connection pool
│   │   └── swagger.js         # Swagger OpenAPI docs JSON
│   ├── controllers/
│   │   └── profileController.js # API Controller routing actions
│   ├── routes/
│   │   └── profileRoutes.js   # Route definitions
│   ├── services/
│   │   └── githubService.js   # GitHub API requests & metrics calculator
│   ├── middleware/
│   │   └── errorHandler.js    # Express central error handler
│   └── app.js                 # Express app setup and middleware
├── .env.example               # Config template
├── package.json               # Node dependencies and npm scripts
├── schema.sql                 # MySQL setup commands
├── server.js                  # Entry point to connect to DB and start listening
├── postman_collection.json    # Ready-to-import Postman test requests
└── README.md                  # Documentation
```

---

## Installation & Setup

### 1. Prerequisites
- **Node.js** (v18+)
- **NPM** (v9+)
- **MySQL Server** (v8.0+)

### 2. Clone and Install Dependencies
Navigate to the directory and install npm packages:
```bash
npm install
```

### 3. Database Setup
Log in to your MySQL server and execute the initialization script:
```bash
mysql -u root -p < schema.sql
```
*Alternatively, you can copy the contents of [schema.sql](schema.sql) and run it inside your database IDE (like MySQL Workbench, phpMyAdmin, DBeaver, etc.).*

### 4. Configuration
Duplicate `.env.example` to create a `.env` file:
```bash
cp .env.example .env
```
Open `.env` and fill in your MySQL server credentials and port:
```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=github_analyzer

# Optional: Add GitHub PAT to prevent hitting rate limits (60/hr for unauthenticated, 5000/hr for authenticated)
# GITHUB_TOKEN=ghp_yourpersonaltokenhere
```

---

## Running the Application

### Development Mode (with hot-reloading)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```
Once started, the server is available at `http://localhost:3000`.  
Visit the Swagger documentation panel at `http://localhost:3000/api-docs` to interact with the endpoints directly.

---

## API Endpoints

### 1. Analyze Profile
- **Endpoint**: `POST /api/profiles/analyze`
- **Request Body**:
```json
{
  "username": "octocat"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Profile analyzed and saved successfully.",
  "data": {
    "id": 1,
    "github_id": 5832347,
    "username": "octocat",
    "name": "The Octocat",
    "bio": "Testing branch merges",
    "company": "GitHub",
    "location": "San Francisco",
    "blog": "https://github.blog",
    "followers": 9820,
    "following": 9,
    "public_repos": 8,
    "public_gists": 8,
    "account_created_at": "2011-01-25 18:44:36",
    "total_stars_received": 250,
    "total_forks": 120,
    "total_watchers": 250,
    "most_starred_repo": "Spoon-Knife",
    "most_starred_repo_stars": 150,
    "average_stars_per_repo": 31.25,
    "average_forks_per_repo": 15.00,
    "total_repo_size": 1420,
    "latest_repo_updated_at": "2024-05-12 11:20:45",
    "analysis_date": "2026-06-06 07:15:30",
    "created_at": "2026-06-06T01:45:00.000Z",
    "updated_at": "2026-06-06T01:45:00.000Z"
  }
}
```

### 2. Get All Analyzed Profiles (Paginated & Filterable)
- **Endpoint**: `GET /api/profiles`
- **Query Parameters (Optional)**:
  - `page`: Page number (default: `1`)
  - `limit`: Results per page (default: `10`)
  - `search`: Filter by username or name matching substring.
  - `minFollowers`: Show users with followers $\ge$ value.
  - `maxFollowers`: Show users with followers $\le$ value.
  - `sortBy`: Fields `followers`, `public_repos`, `total_stars_received`, `created_at`, `analysis_date` (default: `analysis_date`)
  - `sortOrder`: `ASC` or `DESC` (default: `DESC`)
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "totalItems": 1,
    "totalPages": 1,
    "currentPage": 1,
    "itemsPerPage": 10,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### 3. Get Single Profile
- **Endpoint**: `GET /api/profiles/:username`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": { ... }
}
```

### 4. Reanalyze Existing Profile
- **Endpoint**: `PUT /api/profiles/:username/reanalyze`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Profile reanalyzed and updated successfully.",
  "data": { ... }
}
```

### 5. Delete Profile
- **Endpoint**: `DELETE /api/profiles/:username`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Profile for 'octocat' deleted successfully from database."
}
```

---

## Future Improvements

1. **GitHub Activity Score**: Combine recent commit counts, issue submissions, and pull requests to calculate a weighted activity score.
2. **Languages Breakdown Table**: Store language metrics (e.g. percentages of JS, Python, etc.) in a relational one-to-many child table `profile_languages` to enable searching by primary language expertise.
3. **Queueing System**: Use BullMQ/Redis to process analysis tasks asynchronously if the profile has hundreds of repositories, preventing request timeout.
