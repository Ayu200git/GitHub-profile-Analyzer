"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeProfile = analyzeProfile;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Create axios instance with base URL and authorization headers if token exists
const githubClient = axios_1.default.create({
    baseURL: "https://api.github.com",
    headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "github-profile-analyzer-api",
    },
});
// Attach GitHub token if configured in environment variables
if (process.env.GITHUB_TOKEN) {
    githubClient.defaults.headers.common["Authorization"] =
        `token ${process.env.GITHUB_TOKEN}`;
}
/**
 * Fetch basic user profile details from GitHub API
 * @param username
 * @returns User details
 */
async function fetchUserProfile(username) {
    try {
        const response = await githubClient.get(`/users/${username}`);
        return response.data;
    }
    catch (error) {
        handleGitHubError(error, username);
    }
}
/**
 * Fetch all repositories of a user, resolving pagination
 * @param username
 * @returns List of repositories
 */
async function fetchUserRepos(username) {
    const repos = [];
    let page = 1;
    let hasMore = true;
    try {
        while (hasMore) {
            const response = await githubClient.get(`/users/${username}/repos`, {
                params: {
                    per_page: 100,
                    page: page,
                },
            });
            const data = response.data;
            repos.push(...data);
            if (data.length < 100) {
                hasMore = false;
            }
            else {
                page++;
            }
        }
        return repos;
    }
    catch (error) {
        handleGitHubError(error, username);
    }
}
/**
 * Analyze user profile and repositories to calculate insights
 * @param username
 * @returns Aggregated profile insights
 */
async function analyzeProfile(username) {
    // Fetch user profile and repos in parallel
    const [profileData, repos] = await Promise.all([
        fetchUserProfile(username),
        fetchUserRepos(username),
    ]);
    // Insights calculation variables
    let totalStars = 0;
    let totalForks = 0;
    let totalWatchers = 0;
    let totalRepoSize = 0;
    let mostStarredRepo = null;
    let mostStarredRepoStars = 0;
    let latestRepoUpdatedAt = null;
    if (repos && repos.length > 0) {
        repos.forEach((repo) => {
            totalStars += repo.stargazers_count || 0;
            totalForks += repo.forks_count || 0;
            totalWatchers += repo.watchers_count || 0;
            totalRepoSize += repo.size || 0;
            // Track most starred repository
            if (repo.stargazers_count >= mostStarredRepoStars) {
                mostStarredRepoStars = repo.stargazers_count;
                mostStarredRepo = repo.name;
            }
            // Track latest updated repository
            if (repo.updated_at) {
                const repoUpdateDate = new Date(repo.updated_at);
                if (!latestRepoUpdatedAt || repoUpdateDate > latestRepoUpdatedAt) {
                    latestRepoUpdatedAt = repoUpdateDate;
                }
            }
        });
    }
    const publicReposCount = profileData.public_repos || 0;
    const averageStarsPerRepo = publicReposCount > 0 ? totalStars / publicReposCount : 0;
    const averageForksPerRepo = publicReposCount > 0 ? totalForks / publicReposCount : 0;
    // Format date strings to MySQL compatible YYYY-MM-DD HH:mm:ss format
    const formatMySQLDate = (isoStringOrDate) => {
        if (!isoStringOrDate)
            return null;
        return new Date(isoStringOrDate)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");
    };
    return {
        github_id: profileData.id,
        username: profileData.login,
        name: profileData.name || null,
        bio: profileData.bio || null,
        company: profileData.company || null,
        location: profileData.location || null,
        blog: profileData.blog || null,
        followers: profileData.followers || 0,
        following: profileData.following || 0,
        public_repos: publicReposCount,
        public_gists: profileData.public_gists || 0,
        account_created_at: formatMySQLDate(profileData.created_at),
        total_stars_received: totalStars,
        total_forks: totalForks,
        total_watchers: totalWatchers,
        most_starred_repo: mostStarredRepo,
        most_starred_repo_stars: mostStarredRepoStars,
        average_stars_per_repo: parseFloat(averageStarsPerRepo.toFixed(2)),
        average_forks_per_repo: parseFloat(averageForksPerRepo.toFixed(2)),
        total_repo_size: totalRepoSize,
        latest_repo_updated_at: formatMySQLDate(latestRepoUpdatedAt),
        analysis_date: formatMySQLDate(new Date()),
    };
}
/**
 * Handle axios and GitHub API error scenarios
 */
function handleGitHubError(error, username) {
    if (error.response) {
        const status = error.response.status;
        if (status === 404) {
            const err = new Error(`GitHub user '${username}' not found`);
            err.statusCode = 404;
            throw err;
        }
        else if (status === 403) {
            const rateLimitRemaining = error.response.headers["x-ratelimit-remaining"];
            if (rateLimitRemaining === "0") {
                const err = new Error("GitHub API rate limit exceeded. Please add a GITHUB_TOKEN to the server configuration.");
                err.statusCode = 429;
                throw err;
            }
        }
        const err = new Error(error.response.data?.message || "Error communicating with GitHub API");
        err.statusCode = status;
        throw err;
    }
    else if (error.request) {
        const err = new Error("No response received from GitHub API. Please check your network connection.");
        err.statusCode = 503;
        throw err;
    }
    else {
        throw error;
    }
}
