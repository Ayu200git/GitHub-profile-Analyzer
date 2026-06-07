import { Request, Response, NextFunction } from "express";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db";
import * as githubService from "../services/githubService";
import { CustomError } from "../types/github";

// save language rows to profile_languages
async function saveLanguages(
  profileId: number,
  languages: { language: string; repo_count: number; percentage: number }[],
) {
  if (languages.length === 0) return;
  const values = languages.map((l) => [
    profileId,
    l.language,
    l.repo_count,
    l.percentage,
  ]);
  await pool.query(
    "INSERT INTO profile_languages (profile_id, language, repo_count, percentage) VALUES ?",
    [values],
  );
}

// save top repos to top_repositories
async function saveTopRepos(
  profileId: number,
  topRepos: {
    repo_name: string;
    description: string | null;
    url: string;
    language: string | null;
    stars: number;
    forks: number;
    watchers: number;
    is_fork: boolean;
  }[],
) {
  if (topRepos.length === 0) return;
  const values = topRepos.map((r) => [
    profileId,
    r.repo_name,
    r.description,
    r.url,
    r.language,
    r.stars,
    r.forks,
    r.watchers,
    r.is_fork ? 1 : 0,
  ]);
  await pool.query(
    "INSERT INTO top_repositories (profile_id, repo_name, description, url, language, stars, forks, watchers, is_fork) VALUES ?",
    [values],
  );
}

// Helper: fetch language + top repo rows for a given profile id
async function fetchRelatedData(profileId: number) {
  const [languages] = await pool.query<RowDataPacket[]>(
    "SELECT language, repo_count, percentage FROM profile_languages WHERE profile_id = ? ORDER BY percentage DESC",
    [profileId],
  );
  const [top_repos] = await pool.query<RowDataPacket[]>(
    "SELECT repo_name, description, url, language, stars, forks, watchers, is_fork FROM top_repositories WHERE profile_id = ? ORDER BY stars DESC",
    [profileId],
  );
  return { languages, top_repos };
}

/**
 * Analyze a GitHub profile and save to DB
 * POST /api/profiles/analyze
 */
export async function analyzeProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  try {
    const { username } = req.body;

    if (!username || typeof username !== "string" || username.trim() === "") {
      const err: CustomError = new Error(
        "Username is required and must be a valid string.",
      );
      err.statusCode = 400;
      return next(err);
    }

    const trimmedUsername = username.trim();

    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM github_profiles WHERE username = ?",
      [trimmedUsername],
    );

    if (existing.length > 0) {
      const err: CustomError = new Error(
        `Profile for '${trimmedUsername}' has already been analyzed. Use PUT /api/profiles/${trimmedUsername}/reanalyze to fetch fresh insights.`,
      );
      err.statusCode = 409;
      return next(err);
    }

    const insights = await githubService.analyzeProfile(trimmedUsername);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO github_profiles (
        github_id, username, name, bio, company, location, blog,
        followers, following, public_repos, public_gists, account_created_at,
        account_age_years, total_stars_received, total_forks, total_watchers,
        most_starred_repo, most_starred_repo_stars, average_stars_per_repo,
        average_forks_per_repo, fork_to_star_ratio, total_repo_size,
        latest_repo_updated_at, developer_score, profile_completeness, analysis_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        insights.github_id,
        insights.username,
        insights.name,
        insights.bio,
        insights.company,
        insights.location,
        insights.blog,
        insights.followers,
        insights.following,
        insights.public_repos,
        insights.public_gists,
        insights.account_created_at,
        insights.account_age_years,
        insights.total_stars_received,
        insights.total_forks,
        insights.total_watchers,
        insights.most_starred_repo,
        insights.most_starred_repo_stars,
        insights.average_stars_per_repo,
        insights.average_forks_per_repo,
        insights.fork_to_star_ratio,
        insights.total_repo_size,
        insights.latest_repo_updated_at,
        insights.developer_score,
        insights.profile_completeness,
        insights.analysis_date,
      ],
    );

    const profileId = result.insertId;
    await saveLanguages(profileId, insights.languages);
    await saveTopRepos(profileId, insights.top_repos);

    const [newProfile] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM github_profiles WHERE id = ?",
      [profileId],
    );
    const related = await fetchRelatedData(profileId);

    return res.status(201).json({
      success: true,
      message: "Profile analyzed and saved successfully.",
      data: { ...newProfile[0], ...related },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all analyzed profiles with filtering, sorting and pagination
 * GET /api/profiles
 */
export async function getAllProfiles(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as string | undefined;
    const minFollowers = req.query.minFollowers as string | undefined;
    const maxFollowers = req.query.maxFollowers as string | undefined;

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (search && search.trim() !== "") {
      whereClause += " AND (username LIKE ? OR name LIKE ?)";
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    if (minFollowers && !isNaN(parseInt(minFollowers))) {
      whereClause += " AND followers >= ?";
      params.push(parseInt(minFollowers));
    }

    if (maxFollowers && !isNaN(parseInt(maxFollowers))) {
      whereClause += " AND followers <= ?";
      params.push(parseInt(maxFollowers));
    }

    const allowedSortFields = [
      "followers",
      "public_repos",
      "total_stars_received",
      "developer_score",
      "created_at",
      "analysis_date",
    ];
    const sortByField =
      sortBy && allowedSortFields.includes(sortBy) ? sortBy : "analysis_date";
    const sortOrderDir =
      sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM github_profiles ${whereClause}`,
      params,
    );
    const totalItems = countResult[0].total;

    const [profiles] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM github_profiles ${whereClause} ORDER BY ${sortByField} ${sortOrderDir} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      success: true,
      data: profiles,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single analyzed profile by username (includes languages + top repos)
 * GET /api/profiles/:username
 */
export async function getProfileByUsername(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  try {
    const username = req.params.username as string;

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM github_profiles WHERE username = ?",
      [username],
    );

    if (rows.length === 0) {
      const err: CustomError = new Error(
        `Profile with username '${username}' not found in database.`,
      );
      err.statusCode = 404;
      return next(err);
    }

    const related = await fetchRelatedData(rows[0].id);

    return res.status(200).json({
      success: true,
      data: { ...rows[0], ...related },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reanalyze/Refresh GitHub data for an existing profile
 * PUT /api/profiles/:username/reanalyze
 */
export async function reanalyzeProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  try {
    const username = req.params.username as string;

    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM github_profiles WHERE username = ?",
      [username],
    );

    if (existing.length === 0) {
      const err: CustomError = new Error(
        `Profile for '${username}' does not exist. Run POST /api/profiles/analyze to analyze it first.`,
      );
      err.statusCode = 404;
      return next(err);
    }

    const profileId = existing[0].id;
    const insights = await githubService.analyzeProfile(username);

    await pool.query<ResultSetHeader>(
      `UPDATE github_profiles SET
        name = ?, bio = ?, company = ?, location = ?, blog = ?,
        followers = ?, following = ?, public_repos = ?, public_gists = ?,
        account_age_years = ?, total_stars_received = ?, total_forks = ?,
        total_watchers = ?, most_starred_repo = ?, most_starred_repo_stars = ?,
        average_stars_per_repo = ?, average_forks_per_repo = ?, fork_to_star_ratio = ?,
        total_repo_size = ?, latest_repo_updated_at = ?,
        developer_score = ?, profile_completeness = ?, analysis_date = ?
      WHERE username = ?`,
      [
        insights.name,
        insights.bio,
        insights.company,
        insights.location,
        insights.blog,
        insights.followers,
        insights.following,
        insights.public_repos,
        insights.public_gists,
        insights.account_age_years,
        insights.total_stars_received,
        insights.total_forks,
        insights.total_watchers,
        insights.most_starred_repo,
        insights.most_starred_repo_stars,
        insights.average_stars_per_repo,
        insights.average_forks_per_repo,
        insights.fork_to_star_ratio,
        insights.total_repo_size,
        insights.latest_repo_updated_at,
        insights.developer_score,
        insights.profile_completeness,
        insights.analysis_date,
        username,
      ],
    );

    // Refresh related tables
    await pool.query("DELETE FROM profile_languages WHERE profile_id = ?", [
      profileId,
    ]);
    await pool.query("DELETE FROM top_repositories WHERE profile_id = ?", [
      profileId,
    ]);
    await saveLanguages(profileId, insights.languages);
    await saveTopRepos(profileId, insights.top_repos);

    const [updatedProfile] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM github_profiles WHERE username = ?",
      [username],
    );
    const related = await fetchRelatedData(profileId);

    return res.status(200).json({
      success: true,
      message: "Profile reanalyzed and updated successfully.",
      data: { ...updatedProfile[0], ...related },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a profile from db
 * DELETE /api/profiles/:username
 */
export async function deleteProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  try {
    const username = req.params.username as string;

    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM github_profiles WHERE username = ?",
      [username],
    );

    if (existing.length === 0) {
      const err: CustomError = new Error(
        `Profile for '${username}' does not exist in our database.`,
      );
      err.statusCode = 404;
      return next(err);
    }

    // ON DELETE CASCADE handles profile_languages and top_repositories automatically
    await pool.query<ResultSetHeader>(
      "DELETE FROM github_profiles WHERE username = ?",
      [username],
    );

    return res.status(200).json({
      success: true,
      message: `Profile for '${username}' deleted successfully from database.`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get top N developers ranked by developer_score
 * GET /api/profiles/leaderboard?limit=10
 */
export async function getLeaderboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        username, name, avatar_url, location, followers, public_repos,
        total_stars_received, total_forks, developer_score,
        profile_completeness, account_age_years, analysis_date
       FROM github_profiles
       ORDER BY developer_score DESC
       LIMIT ?`,
      [limit],
    );

    return res.status(200).json({
      success: true,
      message: `Top ${rows.length} developers ranked by Developer Score.`,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get platform-wide aggregate statistics across all analyzed profiles
 * GET /api/stats
 */
export async function getPlatformStats(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<Response | void> {
  try {
    // Aggregate stats from github_profiles
    const [profileStats] = await pool.query<RowDataPacket[]>(`
      SELECT
        COUNT(*)                              AS total_profiles_analyzed,
        SUM(followers)                        AS total_followers_indexed,
        ROUND(AVG(followers), 0)              AS avg_followers,
        MAX(followers)                        AS max_followers,
        SUM(total_stars_received)             AS total_stars_indexed,
        ROUND(AVG(total_stars_received), 0)   AS avg_stars_per_profile,
        MAX(total_stars_received)             AS max_stars_single_profile,
        SUM(public_repos)                     AS total_repos_indexed,
        ROUND(AVG(public_repos), 0)           AS avg_repos_per_user,
        ROUND(AVG(developer_score), 2)        AS avg_developer_score,
        MAX(developer_score)                  AS highest_developer_score,
        ROUND(AVG(profile_completeness), 0)   AS avg_profile_completeness,
        ROUND(AVG(account_age_years), 1)      AS avg_account_age_years
      FROM github_profiles
    `);

    // Most common language across all profiles
    const [topLanguages] = await pool.query<RowDataPacket[]>(`
      SELECT language, SUM(repo_count) AS total_repos
      FROM profile_languages
      GROUP BY language
      ORDER BY total_repos DESC
      LIMIT 5
    `);

    // Top scorer
    const [topScorer] = await pool.query<RowDataPacket[]>(`
      SELECT username, developer_score, total_stars_received, followers
      FROM github_profiles
      ORDER BY developer_score DESC
      LIMIT 1
    `);

    // Most followed
    const [mostFollowed] = await pool.query<RowDataPacket[]>(`
      SELECT username, followers
      FROM github_profiles
      ORDER BY followers DESC
      LIMIT 1
    `);

    const stats = profileStats[0];

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          total_profiles_analyzed: Number(stats.total_profiles_analyzed),
          total_followers_indexed: Number(stats.total_followers_indexed),
          total_stars_indexed: Number(stats.total_stars_indexed),
          total_repos_indexed: Number(stats.total_repos_indexed),
        },
        averages: {
          avg_followers: Number(stats.avg_followers),
          avg_stars_per_profile: Number(stats.avg_stars_per_profile),
          avg_repos_per_user: Number(stats.avg_repos_per_user),
          avg_developer_score: Number(stats.avg_developer_score),
          avg_profile_completeness_pct: Number(stats.avg_profile_completeness),
          avg_account_age_years: Number(stats.avg_account_age_years),
        },
        records: {
          highest_developer_score: Number(stats.highest_developer_score),
          max_followers: Number(stats.max_followers),
          max_stars_single_profile: Number(stats.max_stars_single_profile),
          top_scorer: topScorer[0] || null,
          most_followed: mostFollowed[0] || null,
        },
        top_5_languages: topLanguages.map((r) => ({
          language: r.language,
          total_repos: Number(r.total_repos),
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve platform statistics.",
    });
  }
}

/*  GET /api/health
 */
export async function healthCheck(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<Response | void> {
  try {
    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeHuman = `${hours}h ${minutes}m ${seconds}s`;

    // Quick DB ping
    const dbStart = Date.now();
    await pool.query("SELECT 1");
    const dbLatencyMs = Date.now() - dbStart;

    // Count total analyzed profiles
    const [countRow] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM github_profiles",
    );

    return res.status(200).json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: uptimeHuman,
      uptime_seconds: uptimeSeconds,
      database: {
        status: "connected",
        latency_ms: dbLatencyMs,
        total_profiles: Number(countRow[0].total),
      },
      api: {
        name: "GitHub Profile Analyzer API",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
      },
    });
  } catch (error) {
    // Return degraded status instead of 500
    return res.status(503).json({
      success: false,
      status: "degraded",
      timestamp: new Date().toISOString(),
      database: { status: "disconnected" },
      error: "Database connection failed",
    });
  }
}
