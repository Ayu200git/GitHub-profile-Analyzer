# GitHub Profile Analyzer API

A TypeScript + Express.js + MySQL REST API that fetches GitHub profile data, computes deep developer insights, and stores them in a relational database.

---

## Live API

> **Base URL:** `https://<your-deployed-url>`
> **API Docs (Swagger):** `https://<your-deployed-url>/api-docs`

---

## Tech Stack

| Layer         | Technology                        |
| ------------- | --------------------------------- |
| Language      | TypeScript (strict mode)          |
| Runtime       | Node.js                           |
| Framework     | Express.js                        |
| Database      | MySQL (`mysql2/promise`)          |
| External API  | GitHub REST API v3                |
| Documentation | Swagger UI (`swagger-ui-express`) |
| Dev Server    | Nodemon + ts-node                 |

---

## Database Schema

**3 relational tables:**

```
github_profiles       ← main profile + all insight fields
profile_languages     ← language distribution (FK → github_profiles)
top_repositories      ← top 5 repos by stars (FK → github_profiles)
```

`ON DELETE CASCADE` is set on both child tables.
Full schema: [`schema.sql`](./schema.sql)

---

## Local Setup

### Prerequisites

- Node.js v18+
- MySQL 8.0+
- Git

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/GitHub-profile-Analyzer.git
cd GitHub-profile-Analyzer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=github_analyzer
GITHUB_TOKEN=your_github_personal_access_token
```

> **GITHUB_TOKEN is optional** but highly recommended — raises rate limit from 60 to 5000 requests/hour.
> Generate one at: https://github.com/settings/tokens (no scopes needed for public data)

### 4. Set up the database

```bash
npm run db:setup
```

This creates the `github_analyzer` database and all 3 tables automatically.

### 5. Start the development server

```bash
npm run dev
```

Server runs at: `http://localhost:3000`
Swagger docs at: `http://localhost:3000/api-docs`

---

## API Endpoints

| Method   | Endpoint                            | Description                                     |
| -------- | ----------------------------------- | ----------------------------------------------- |
| `GET`    | `/api/health`                       | Health check with DB status & uptime            |
| `GET`    | `/api/stats`                        | Platform-wide aggregate statistics              |
| `POST`   | `/api/profiles/analyze`             | Analyze & save a GitHub profile                 |
| `GET`    | `/api/profiles`                     | List all profiles (with filter/sort/pagination) |
| `GET`    | `/api/profiles/leaderboard`         | Top N developers by Developer Score             |
| `GET`    | `/api/profiles/:username`           | Get single profile with languages & top repos   |
| `PUT`    | `/api/profiles/:username/reanalyze` | Refresh profile with latest GitHub data         |
| `DELETE` | `/api/profiles/:username`           | Delete a profile from the database              |

---

## Computed Insights (per profile)

### Repository Aggregations

| Field                    | Description                      |
| ------------------------ | -------------------------------- |
| `total_stars_received`   | Sum of stars across all repos    |
| `total_forks`            | Sum of forks across all repos    |
| `total_watchers`         | Sum of watchers across all repos |
| `total_repo_size`        | Total size of all repos (KB)     |
| `most_starred_repo`      | Name of highest-starred repo     |
| `average_stars_per_repo` | `total_stars / public_repos`     |
| `average_forks_per_repo` | `total_forks / public_repos`     |
| `latest_repo_updated_at` | Most recently updated repo date  |

### Advanced Analytics

| Field                  | Formula                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `developer_score`      | `followers×2 + stars×1.5 + forks×1 + repos×0.5`                                               |
| `profile_completeness` | % of 8 key profile fields filled (name, bio, company, location, blog, email, twitter, avatar) |
| `account_age_years`    | Years since GitHub account creation                                                           |
| `fork_to_star_ratio`   | `total_forks / total_stars`                                                                   |

### Relational Data

| Table         | Description                                                           |
| ------------- | --------------------------------------------------------------------- |
| `languages[]` | Language distribution — language, repo_count, percentage              |
| `top_repos[]` | Top 5 repos by stars — name, url, description, language, stars, forks |

---

## Example Usage

### Analyze a GitHub profile

```bash
curl -X POST http://localhost:3000/api/profiles/analyze \
  -H "Content-Type: application/json" \
  -d '{"username": "torvalds"}'
```

### Get profile with all insights

```bash
curl http://localhost:3000/api/profiles/torvalds
```

### Get leaderboard (top 5)

```bash
curl "http://localhost:3000/api/profiles/leaderboard?limit=5"
```

### Get all profiles sorted by developer score

```bash
curl "http://localhost:3000/api/profiles?sortBy=developer_score&sortOrder=DESC"
```

### Filter by followers range

```bash
curl "http://localhost:3000/api/profiles?minFollowers=100&maxFollowers=5000"
```

### Platform statistics

```bash
curl http://localhost:3000/api/stats
```

### Health check

```bash
curl http://localhost:3000/api/health
```

---

## Project Structure

```
├── src/
│   ├── config/
│   │   ├── db.ts              # MySQL connection pool
│   │   └── swagger.ts         # Swagger/OpenAPI definition
│   ├── controllers/
│   │   └── profileController.ts  # All 8 endpoint handlers
│   ├── middleware/
│   │   └── errorHandler.ts    # Centralized error handler
│   ├── routes/
│   │   └── profileRoutes.ts   # Express router
│   ├── services/
│   │   └── githubService.ts   # GitHub API + insight calculations
│   ├── types/
│   │   └── github.ts          # TypeScript interfaces
│   └── app.ts                 # Express app (middleware, routes)
├── server.ts                  # Entry point
├── setup-db.ts                # DB initialization script
├── schema.sql                 # Full database schema
├── .env.example               # Environment variable template
├── tsconfig.json              # TypeScript configuration
└── package.json
```

---

## Available Scripts

| Script     | Command            | Description                      |
| ---------- | ------------------ | -------------------------------- |
| Dev server | `npm run dev`      | Start with nodemon (auto-reload) |
| DB setup   | `npm run db:setup` | Create database and tables       |
| Type check | `npx tsc --noEmit` | Check TypeScript types           |

---

## Features

- **Rate Limiting** — 100 requests per 15 minutes per IP
- **Pagination** — page, limit, hasNextPage, hasPrevPage
- **Search & Filter** — by username/name, min/max followers
- **Multi-field Sorting** — followers, repos, stars, developer_score
- **ON DELETE CASCADE** — child data auto-removed with parent profile
- **Swagger UI** — interactive API documentation
- **TypeScript strict mode** — full type safety
- **GitHub Token support** — optional, for higher API rate limits
- **CORS enabled** — accessible from any frontend
- **Morgan logging** — HTTP request logging in development

---

## Deployment

This API is deployed on [Railway](https://railway.app) / [Render](https://render.com).

Live URL: `https://<your-deployed-url>`

---

## Postman Collection

Import `postman_collection.json` from the root of this repository into Postman to test all endpoints with pre-configured examples.

---

## Author

Built by **Ayush** as a take-home assignment demonstrating Node.js, TypeScript, MySQL, REST API design, and GitHub API integration skills.
