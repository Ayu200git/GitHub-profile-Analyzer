-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `github_analyzer`;
USE `github_analyzer`;

DROP TABLE IF EXISTS `profile_languages`;
DROP TABLE IF EXISTS `top_repositories`;
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
  `account_age_years` DECIMAL(4, 1) DEFAULT 0.0,
  `total_stars_received` INT DEFAULT 0,
  `total_forks` INT DEFAULT 0,
  `total_watchers` INT DEFAULT 0,
  `most_starred_repo` VARCHAR(255) DEFAULT NULL,
  `most_starred_repo_stars` INT DEFAULT 0,
  `average_stars_per_repo` DECIMAL(10, 2) DEFAULT 0.00,
  `average_forks_per_repo` DECIMAL(10, 2) DEFAULT 0.00,
  `fork_to_star_ratio` DECIMAL(10, 2) DEFAULT 0.00,
  `total_repo_size` INT DEFAULT 0,
  `latest_repo_updated_at` DATETIME DEFAULT NULL,
  `developer_score` DECIMAL(10, 2) DEFAULT 0.00,
  `profile_completeness` INT DEFAULT 0,
  `analysis_date` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_followers` (`followers`),
  INDEX `idx_public_repos` (`public_repos`),
  INDEX `idx_developer_score` (`developer_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Language distribution table (one-to-many: profile -> languages)
CREATE TABLE `profile_languages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `profile_id` INT NOT NULL,
  `language` VARCHAR(100) NOT NULL,
  `repo_count` INT DEFAULT 1,
  `percentage` DECIMAL(5, 2) DEFAULT 0.00,
  FOREIGN KEY (`profile_id`) REFERENCES `github_profiles`(`id`) ON DELETE CASCADE,
  INDEX `idx_profile_id` (`profile_id`),
  INDEX `idx_language` (`language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Top repositories table (one-to-many: profile -> top repos by stars)
CREATE TABLE `top_repositories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `profile_id` INT NOT NULL,
  `repo_name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `url` VARCHAR(500) NOT NULL,
  `language` VARCHAR(100) DEFAULT NULL,
  `stars` INT DEFAULT 0,
  `forks` INT DEFAULT 0,
  `watchers` INT DEFAULT 0,
  `is_fork` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`profile_id`) REFERENCES `github_profiles`(`id`) ON DELETE CASCADE,
  INDEX `idx_profile_id` (`profile_id`),
  INDEX `idx_stars` (`stars`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


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

-- Language distribution table (one-to-many relationship with github_profiles)
CREATE TABLE `profile_languages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `profile_id` INT NOT NULL,
  `language` VARCHAR(100) NOT NULL,
  `repo_count` INT DEFAULT 1,
  `percentage` DECIMAL(5, 2) DEFAULT 0.00,
  FOREIGN KEY (`profile_id`) REFERENCES `github_profiles`(`id`) ON DELETE CASCADE,
  INDEX `idx_profile_id` (`profile_id`),
  INDEX `idx_language` (`language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
