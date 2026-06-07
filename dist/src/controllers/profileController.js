"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeProfile = analyzeProfile;
exports.getAllProfiles = getAllProfiles;
exports.getProfileByUsername = getProfileByUsername;
exports.reanalyzeProfile = reanalyzeProfile;
exports.deleteProfile = deleteProfile;
const db_1 = require("../config/db");
const githubService = __importStar(require("../services/githubService"));
/**
 * Analyze a GitHub profile and save to DB
 * POST /api/profiles/analyze
 */
async function analyzeProfile(req, res, next) {
    try {
        const { username } = req.body;
        // Validation
        if (!username || typeof username !== 'string' || username.trim() === '') {
            const err = new Error('Username is required and must be a valid string.');
            err.statusCode = 400;
            return next(err);
        }
        const trimmedUsername = username.trim();
        // Check if user already exists to prevent duplicate entries
        const [existing] = await db_1.pool.query('SELECT id, username FROM github_profiles WHERE username = ?', [trimmedUsername]);
        if (existing.length > 0) {
            const err = new Error(`Profile for '${trimmedUsername}' has already been analyzed. Use PUT /api/profiles/${trimmedUsername}/reanalyze to fetch fresh insights.`);
            err.statusCode = 409;
            return next(err);
        }
        // Call service to fetch and analyze GitHub profile data
        const insights = await githubService.analyzeProfile(trimmedUsername);
        // Insert into database
        const [result] = await db_1.pool.query(`INSERT INTO github_profiles (
        github_id, username, name, bio, company, location, blog,
        followers, following, public_repos, public_gists, account_created_at,
        total_stars_received, total_forks, total_watchers,
        most_starred_repo, most_starred_repo_stars,
        average_stars_per_repo, average_forks_per_repo,
        total_repo_size, latest_repo_updated_at, analysis_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
        ]);
        // Get the inserted profile
        const [newProfile] = await db_1.pool.query('SELECT * FROM github_profiles WHERE id = ?', [result.insertId]);
        return res.status(201).json({
            success: true,
            message: 'Profile analyzed and saved successfully.',
            data: newProfile[0]
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get all analyzed profiles with filtering, sorting and pagination
 * GET /api/profiles
 */
async function getAllProfiles(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search;
        const sortBy = req.query.sortBy;
        const sortOrder = req.query.sortOrder;
        const minFollowers = req.query.minFollowers;
        const maxFollowers = req.query.maxFollowers;
        // Building query parts
        let whereClause = 'WHERE 1=1';
        const params = [];
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
        const [countResult] = await db_1.pool.query(countQuery, params);
        const totalItems = countResult[0].total;
        // Query to select data
        const selectQuery = `SELECT * FROM github_profiles ${whereClause} ORDER BY ${sortByField} ${sortOrderDir} LIMIT ? OFFSET ?`;
        // Convert limit and offset to numbers for mysql2 parameterization to avoid binding issues
        const queryParams = [...params, limit, offset];
        const [profiles] = await db_1.pool.query(selectQuery, queryParams);
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
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get a single analyzed profile by username
 * GET /api/profiles/:username
 */
async function getProfileByUsername(req, res, next) {
    try {
        const username = req.params.username;
        const [rows] = await db_1.pool.query('SELECT * FROM github_profiles WHERE username = ?', [username]);
        if (rows.length === 0) {
            const err = new Error(`Profile with username '${username}' not found in database.`);
            err.statusCode = 404;
            return next(err);
        }
        return res.status(200).json({
            success: true,
            data: rows[0]
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Reanalyze/Refresh GitHub data for an existing profile
 * PUT /api/profiles/:username/reanalyze
 */
async function reanalyzeProfile(req, res, next) {
    try {
        const username = req.params.username;
        // Check if the profile exists in db first
        const [existing] = await db_1.pool.query('SELECT id FROM github_profiles WHERE username = ?', [username]);
        if (existing.length === 0) {
            const err = new Error(`Profile for '${username}' does not exist in our database. Run POST /api/profiles/analyze to analyze it first.`);
            err.statusCode = 404;
            return next(err);
        }
        // Call service to fetch fresh data
        const insights = await githubService.analyzeProfile(username);
        // Update in database
        await db_1.pool.query(`UPDATE github_profiles SET
        name = ?, bio = ?, company = ?, location = ?, blog = ?,
        followers = ?, following = ?, public_repos = ?, public_gists = ?,
        total_stars_received = ?, total_forks = ?, total_watchers = ?,
        most_starred_repo = ?, most_starred_repo_stars = ?,
        average_stars_per_repo = ?, average_forks_per_repo = ?,
        total_repo_size = ?, latest_repo_updated_at = ?, analysis_date = ?
      WHERE username = ?`, [
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
        ]);
        // Retrieve updated profile
        const [updatedProfile] = await db_1.pool.query('SELECT * FROM github_profiles WHERE username = ?', [username]);
        return res.status(200).json({
            success: true,
            message: 'Profile reanalyzed and updated successfully.',
            data: updatedProfile[0]
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Delete a profile from db
 * DELETE /api/profiles/:username
 */
async function deleteProfile(req, res, next) {
    try {
        const username = req.params.username;
        const [existing] = await db_1.pool.query('SELECT id FROM github_profiles WHERE username = ?', [username]);
        if (existing.length === 0) {
            const err = new Error(`Profile for '${username}' does not exist in our database.`);
            err.statusCode = 404;
            return next(err);
        }
        await db_1.pool.query('DELETE FROM github_profiles WHERE username = ?', [username]);
        return res.status(200).json({
            success: true,
            message: `Profile for '${username}' deleted successfully from database.`
        });
    }
    catch (error) {
        next(error);
    }
}
