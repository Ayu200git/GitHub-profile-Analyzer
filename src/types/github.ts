export interface GitHubUserProfile {
  id: number;
  login: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  followers: number;
  following: number;
  public_repos: number;
  public_gists: number;
  created_at: string;
}

export interface GitHubRepo {
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  size: number;
  name: string;
  updated_at: string | null;
}

export interface ProfileInsights {
  github_id: number;
  username: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  followers: number;
  following: number;
  public_repos: number;
  public_gists: number;
  account_created_at: string | null;
  total_stars_received: number;
  total_forks: number;
  total_watchers: number;
  most_starred_repo: string | null;
  most_starred_repo_stars: number;
  average_stars_per_repo: number;
  average_forks_per_repo: number;
  total_repo_size: number;
  latest_repo_updated_at: string | null;
  analysis_date: string | null;
}

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}
