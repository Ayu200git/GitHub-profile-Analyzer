import axios, { AxiosInstance } from "axios";
import dotenv from "dotenv";
import {
  GitHubUserProfile,
  GitHubRepo,
  ProfileInsights,
  LanguageEntry,
  TopRepository,
  CustomError,
} from "../types/github";

dotenv.config();

// Create axios instance with base URL and authorization headers if token exists
const githubClient: AxiosInstance = axios.create({
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

async function fetchUserProfile(username: string): Promise<GitHubUserProfile> {
  try {
    const response = await githubClient.get<GitHubUserProfile>(
      `/users/${username}`,
    );
    return response.data;
  } catch (error: any) {
    handleGitHubError(error, username);
  }
}

async function fetchUserRepos(username: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  let hasMore = true;

  try {
    while (hasMore) {
      const response = await githubClient.get<GitHubRepo[]>(
        `/users/${username}/repos`,
        {
          params: { per_page: 100, page },
        },
      );
      const data = response.data;
      repos.push(...data);
      if (data.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }
    return repos;
  } catch (error: any) {
    handleGitHubError(error, username);
  }
}

export async function analyzeProfile(
  username: string,
): Promise<ProfileInsights> {
  const [profileData, repos] = await Promise.all([
    fetchUserProfile(username),
    fetchUserRepos(username),
  ]);

  // ── Aggregation accumulators ─────────────────────────────────────────────
  let totalStars = 0;
  let totalForks = 0;
  let totalWatchers = 0;
  let totalRepoSize = 0;
  let mostStarredRepo: string | null = null;
  let mostStarredRepoStars = 0;
  let latestRepoUpdatedAt: Date | null = null;
  const languageCounts: Record<string, number> = {};

  if (repos && repos.length > 0) {
    repos.forEach((repo: GitHubRepo) => {
      totalStars += repo.stargazers_count || 0;
      totalForks += repo.forks_count || 0;
      totalWatchers += repo.watchers_count || 0;
      totalRepoSize += repo.size || 0;

      if (repo.stargazers_count >= mostStarredRepoStars) {
        mostStarredRepoStars = repo.stargazers_count;
        mostStarredRepo = repo.name;
      }

      if (repo.updated_at) {
        const d = new Date(repo.updated_at);
        if (!latestRepoUpdatedAt || d > latestRepoUpdatedAt) {
          latestRepoUpdatedAt = d;
        }
      }

      if (repo.language) {
        languageCounts[repo.language] =
          (languageCounts[repo.language] || 0) + 1;
      }
    });
  }

  const publicReposCount = profileData.public_repos || 0;
  const averageStarsPerRepo =
    publicReposCount > 0 ? totalStars / publicReposCount : 0;
  const averageForksPerRepo =
    publicReposCount > 0 ? totalForks / publicReposCount : 0;
  const forkToStarRatio =
    totalStars > 0 ? parseFloat((totalForks / totalStars).toFixed(2)) : 0;

  // ── Account age in years ─────────────────────────────────────────────────
  const accountCreatedDate = new Date(profileData.created_at);
  const nowDate = new Date();
  const accountAgeYears = parseFloat(
    (
      (nowDate.getTime() - accountCreatedDate.getTime()) /
      (1000 * 60 * 60 * 24 * 365.25)
    ).toFixed(1),
  );

  // ── Language distribution ────────────────────────────────────────────────
  const totalLangRepos = Object.values(languageCounts).reduce(
    (s, c) => s + c,
    0,
  );
  const languages: LanguageEntry[] = Object.entries(languageCounts)
    .map(([language, repo_count]) => ({
      language,
      repo_count,
      percentage: parseFloat(((repo_count / totalLangRepos) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // ── Top 5 repositories by star count ────────────────────────────────────
  const top_repos: TopRepository[] = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map((repo) => ({
      repo_name: repo.name,
      description: repo.description || null,
      url: repo.html_url,
      language: repo.language || null,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      is_fork: repo.fork,
    }));

  // ── Developer Score ────────────────────────────────

  const developerScore = parseFloat(
    (
      profileData.followers * 2 +
      totalStars * 1.5 +
      totalForks * 1 +
      publicReposCount * 0.5
    ).toFixed(2),
  );

  // ── Profile Completeness % ───────────────────────────────────────────────

  const completenessFields = [
    profileData.name,
    profileData.bio,
    profileData.company,
    profileData.location,
    profileData.blog,
    profileData.email ?? null,
    profileData.twitter_username ?? null,
    profileData.avatar_url ?? null,
  ];
  const filledFields = completenessFields.filter(
    (f) => f !== null && f !== undefined && String(f).trim() !== "",
  ).length;
  const profileCompleteness = Math.round(
    (filledFields / completenessFields.length) * 100,
  );

  // ── Date formatter ───────────────────────────────────────────────────────
  const formatMySQLDate = (d: string | Date | null): string | null => {
    if (!d) return null;
    return new Date(d).toISOString().slice(0, 19).replace("T", " ");
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
    account_age_years: accountAgeYears,
    total_stars_received: totalStars,
    total_forks: totalForks,
    total_watchers: totalWatchers,
    most_starred_repo: mostStarredRepo,
    most_starred_repo_stars: mostStarredRepoStars,
    average_stars_per_repo: parseFloat(averageStarsPerRepo.toFixed(2)),
    average_forks_per_repo: parseFloat(averageForksPerRepo.toFixed(2)),
    fork_to_star_ratio: forkToStarRatio,
    total_repo_size: totalRepoSize,
    latest_repo_updated_at: formatMySQLDate(latestRepoUpdatedAt),
    developer_score: developerScore,
    profile_completeness: profileCompleteness,
    analysis_date: formatMySQLDate(new Date()),
    languages,
    top_repos,
  };
}

function handleGitHubError(error: any, username: string): never {
  if (error.response) {
    const status = error.response.status;
    if (status === 404) {
      const err: CustomError = new Error(`GitHub user '${username}' not found`);
      err.statusCode = 404;
      throw err;
    } else if (status === 403) {
      const rateLimitRemaining =
        error.response.headers["x-ratelimit-remaining"];
      if (rateLimitRemaining === "0") {
        const err: CustomError = new Error(
          "GitHub API rate limit exceeded. Please add a GITHUB_TOKEN to the server configuration.",
        );
        err.statusCode = 429;
        throw err;
      }
    }
    const err: CustomError = new Error(
      error.response.data?.message || "Error communicating with GitHub API",
    );
    err.statusCode = status;
    throw err;
  } else if (error.request) {
    const err: CustomError = new Error(
      "No response received from GitHub API. Please check your network connection.",
    );
    err.statusCode = 503;
    throw err;
  } else {
    throw error;
  }
}
