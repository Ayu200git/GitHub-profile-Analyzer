export interface GitHubUserProfile {
  id: number;
  login: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  email: string | null;
  twitter_username: string | null;
  avatar_url: string | null;
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
  description: string | null;
  html_url: string;
  updated_at: string | null;
  language: string | null;
  fork: boolean;
}

export interface LanguageEntry {
  language: string;
  repo_count: number;
  percentage: number;
}

export interface TopRepository {
  repo_name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  watchers: number;
  is_fork: boolean;
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
  account_age_years: number;
  total_stars_received: number;
  total_forks: number;
  total_watchers: number;
  most_starred_repo: string | null;
  most_starred_repo_stars: number;
  average_stars_per_repo: number;
  average_forks_per_repo: number;
  fork_to_star_ratio: number;
  total_repo_size: number;
  latest_repo_updated_at: string | null;
  developer_score: number;
  profile_completeness: number;
  analysis_date: string | null;
  languages: LanguageEntry[];
  top_repos: TopRepository[];
}

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}
