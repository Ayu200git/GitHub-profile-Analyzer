import { Request, Response, NextFunction } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/db';
import * as githubService from '../services/githubService';
import { CustomError } from '../types/github';

/**
 * Analyze a GitHub profile and save to DB
 * POST /api/profiles/analyze
 */
export async function analyzeProfile(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const { username } = req.body;

    // Validation
    if (!username || typeof username !== 'string' || username.trim() === '') {
      const err: CustomError = new Error('Username is required and must be a valid string.');
      err.statusCode = 400;
      return next(err);
    }

    const trimmedUsername = username.trim();

    // Check if user already exists to prevent duplicate entries
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id, username FROM github_profiles WHERE username = ?',
      [trimmedUsername]
    );

    if (existing.length > 0) {
      const err: CustomError = new Error(`Profile for '${trimmedUsername}' has already been analyzed. Use PUT /api/profiles/${trimmedUsername}/reanalyze to fetch fresh insights.`);
      err.statusCode = 409;
      return next(err);
    }

    // Call service to fetch and analyze GitHub profile data
    const insights = await githubService.analyzeProfile(trimmedUsername);

    // Insert into database
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO github_profiles (
        github_id, username, name, bio, company, location, blog,
        followers, following, public_repos, public_gists, account_created_at,
        total_stars_received, total_forks, total_watchers,
        most_starred_repo, most_starred_repo_stars,
        average_stars_per_repo, average_forks_per_repo,
        total_repo_size, latest_repo_updated_at, analysis_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        insights.total_stars_received,
        insights.total_forks,
        insights.total_watchers,
        insights.most_starred_repo,
        insights.most_starred_repo_stars,
        insights.average_stars_per_repo,
        insights.average_forks_per_repo,
        insights.total_repo_size,
        insights.latest_repo_updated_at,
        insights.analysis_date
      ]
    );

    // Get the inserted profile
    const [newProfile] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM github_profiles WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Profile analyzed and saved successfully.',
      data: newProfile[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all analyzed profiles with filtering, sorting and pagination
 * GET /api/profiles
 */
export async function getAllProfiles(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as string | undefined;
    const minFollowers = req.query.minFollowers as string | undefined;
    const maxFollowers = req.query.maxFollowers as string | undefined;

    // Building query parts
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    // Filter by search (username or name)
    if (search && search.trim() !== '') {
      whereClause += ' AND (username LIKE ? OR name LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    // Filter by minimum followers
    if (minFollowers && !isNaN(parseInt(minFollowers))) {
      whereClause += ' AND followers >= ?';
      params.push(parseInt(minFollowers));
    }

    // Filter by maximum followers
    if (maxFollowers && !isNaN(parseInt(maxFollowers))) {
      whereClause += ' AND followers <= ?';
      params.push(parseInt(maxFollowers));
    }

    // Safe sorting whitelist to prevent SQL injection
    const allowedSortFields = ['followers', 'public_repos', 'total_stars_received', 'created_at', 'analysis_date'];
    const sortByField = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'analysis_date';
    const sortOrderDir = sortOrder && sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Query to count total results matching filters
    const countQuery = `SELECT COUNT(*) as total FROM github_profiles ${whereClause}`;
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, params);
    const totalItems = countResult[0].total;

    // Query to select data
    const selectQuery = `SELECT * FROM github_profiles ${whereClause} ORDER BY ${sortByField} ${sortOrderDir} LIMIT ? OFFSET ?`;

    // Convert limit and offset to numbers for mysql2 parameterization to avoid binding issues
    const queryParams = [...params, limit, offset];
    const [profiles] = await pool.query<RowDataPacket[]>(selectQuery, queryParams);

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
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single analyzed profile by username
 * GET /api/profiles/:username
 */
export async function getProfileByUsername(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const username = req.params.username as string;

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM github_profiles WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      const err: CustomError = new Error(`Profile with username '${username}' not found in database.`);
      err.statusCode = 404;
      return next(err);
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reanalyze/Refresh GitHub data for an existing profile
 * PUT /api/profiles/:username/reanalyze
 */
export async function reanalyzeProfile(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const username = req.params.username as string;

    // Check if the profile exists in db first
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM github_profiles WHERE username = ?',
      [username]
    );

    if (existing.length === 0) {
      const err: CustomError = new Error(`Profile for '${username}' does not exist in our database. Run POST /api/profiles/analyze to analyze it first.`);
      err.statusCode = 404;
      return next(err);
    }

    // Call service to fetch fresh data
    const insights = await githubService.analyzeProfile(username);

    // Update in database
    await pool.query<ResultSetHeader>(
      `UPDATE github_profiles SET
        name = ?, bio = ?, company = ?, location = ?, blog = ?,
        followers = ?, following = ?, public_repos = ?, public_gists = ?,
        total_stars_received = ?, total_forks = ?, total_watchers = ?,
        most_starred_repo = ?, most_starred_repo_stars = ?,
        average_stars_per_repo = ?, average_forks_per_repo = ?,
        total_repo_size = ?, latest_repo_updated_at = ?, analysis_date = ?
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
        insights.total_stars_received,
        insights.total_forks,
        insights.total_watchers,
        insights.most_starred_repo,
        insights.most_starred_repo_stars,
        insights.average_stars_per_repo,
        insights.average_forks_per_repo,
        insights.total_repo_size,
        insights.latest_repo_updated_at,
        insights.analysis_date,
        username
      ]
    );

    // Retrieve updated profile
    const [updatedProfile] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM github_profiles WHERE username = ?',
      [username]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile reanalyzed and updated successfully.',
      data: updatedProfile[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a profile from db
 * DELETE /api/profiles/:username
 */
export async function deleteProfile(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const username = req.params.username as string;

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM github_profiles WHERE username = ?',
      [username]
    );

    if (existing.length === 0) {
      const err: CustomError = new Error(`Profile for '${username}' does not exist in our database.`);
      err.statusCode = 404;
      return next(err);
    }

    await pool.query<ResultSetHeader>(
      'DELETE FROM github_profiles WHERE username = ?',
      [username]
    );

    return res.status(200).json({
      success: true,
      message: `Profile for '${username}' deleted successfully from database.`
    });
  } catch (error) {
    next(error);
  }
}
