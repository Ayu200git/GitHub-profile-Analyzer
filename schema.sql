-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `github_analyzer`;
USE `github_analyzer`;

-- Drop table if it exists to allow re-runs
DROP TABLE IF EXISTS `github_profiles`;

-- Create GitHub Profiles table
CREATE TABLE `github_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `github_id` BIGINT UNIQUE NOT NULL,
  `username` VARCHAR(100) UNIQUE NOT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `company` VARCHAR(255) DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `blog` VARCHAR(255) DEFAULT NULL,
  `followers` INT DEFAULT 0,
  `following` INT DEFAULT 0,
  `public_repos` INT DEFAULT 0,
  `public_gists` INT DEFAULT 0,
  `account_created_at` DATETIME DEFAULT NULL,
  `total_stars_received` INT DEFAULT 0,
  `total_forks` INT DEFAULT 0,
  `total_watchers` INT DEFAULT 0,
  `most_starred_repo` VARCHAR(255) DEFAULT NULL,
  `most_starred_repo_stars` INT DEFAULT 0,
  `average_stars_per_repo` DECIMAL(10, 2) DEFAULT 0.00,
  `average_forks_per_repo` DECIMAL(10, 2) DEFAULT 0.00,
  `total_repo_size` INT DEFAULT 0,
  `latest_repo_updated_at` DATETIME DEFAULT NULL,
  `analysis_date` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_followers` (`followers`),
  INDEX `idx_public_repos` (`public_repos`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
