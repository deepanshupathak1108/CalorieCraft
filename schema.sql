-- CalorieCraft MySQL 8+ schema
CREATE DATABASE IF NOT EXISTS caloriecraft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE caloriecraft;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(190) UNIQUE,
  password_hash VARCHAR(255),
  gender ENUM('male','female','other') DEFAULT 'other',
  age TINYINT UNSIGNED,
  height_cm DECIMAL(5,2),
  current_weight_kg DECIMAL(6,2),
  activity_level DECIMAL(4,3),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE goals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  goal_type ENUM('weight_loss','weight_gain','muscle_gain','fat_loss_recomp') NOT NULL,
  target_weight_kg DECIMAL(6,2),
  calorie_target INT UNSIGNED NOT NULL,
  protein_g DECIMAL(6,1) NOT NULL,
  carbs_g DECIMAL(6,1) NOT NULL,
  fat_g DECIMAL(6,1) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_goals_user_active (user_id, active)
);

CREATE TABLE body_measurements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  logged_date DATE NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  waist_cm DECIMAL(6,2),
  chest_cm DECIMAL(6,2),
  biceps_cm DECIMAL(6,2),
  forearms_cm DECIMAL(6,2),
  thighs_cm DECIMAL(6,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_measurement_date (user_id, logged_date),
  INDEX idx_measurements_user_date (user_id, logged_date)
);

CREATE TABLE diet_preferences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  diet_type ENUM('vegetarian','non_vegetarian','vegan','eggetarian','other') NOT NULL,
  cuisine VARCHAR(80) DEFAULT 'Indian',
  liked_foods TEXT,
  allergies TEXT,
  daily_budget DECIMAL(10,2),
  meals_per_day TINYINT UNSIGNED DEFAULT 4,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE foods (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  cuisine VARCHAR(80),
  diet_type ENUM('vegetarian','non_vegetarian','vegan','eggetarian','other') NOT NULL,
  serving_g DECIMAL(7,2) NOT NULL,
  calories DECIMAL(8,2) NOT NULL,
  protein_g DECIMAL(7,2) NOT NULL,
  carbs_g DECIMAL(7,2) NOT NULL,
  fat_g DECIMAL(7,2) NOT NULL,
  estimated_cost DECIMAL(10,2),
  allergens VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_food_name_serving (name, serving_g),
  INDEX idx_foods_diet_cuisine (diet_type, cuisine)
);

CREATE TABLE meal_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  goal_id BIGINT UNSIGNED,
  plan_date DATE NOT NULL,
  target_calories INT UNSIGNED NOT NULL,
  target_protein_g DECIMAL(7,2) NOT NULL,
  target_carbs_g DECIMAL(7,2) NOT NULL,
  target_fat_g DECIMAL(7,2) NOT NULL,
  estimated_cost DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
  INDEX idx_meal_plans_user_date (user_id, plan_date)
);

CREATE TABLE meal_plan_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  meal_plan_id BIGINT UNSIGNED NOT NULL,
  food_id BIGINT UNSIGNED NOT NULL,
  meal_type ENUM('breakfast','lunch','snack','dinner','other') NOT NULL,
  servings DECIMAL(6,2) DEFAULT 1,
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE RESTRICT
);

-- Optional daily nutrition log for the next version
CREATE TABLE daily_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  logged_date DATE NOT NULL,
  calories INT UNSIGNED DEFAULT 0,
  protein_g DECIMAL(7,2) DEFAULT 0,
  carbs_g DECIMAL(7,2) DEFAULT 0,
  fat_g DECIMAL(7,2) DEFAULT 0,
  water_liters DECIMAL(4,2),
  steps INT UNSIGNED,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_daily_log (user_id, logged_date)
);
