import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_DIR = process.env.DB_DIR || path.join(__dirname, "..", "data");
const DB_PATH = path.join(DB_DIR, "meal-planner.db");

// Ensure data directory exists
fs.mkdirSync(DB_DIR, { recursive: true });

const db: InstanceType<typeof Database> = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      servings INTEGER DEFAULT 2,
      prep_time_min INTEGER,
      cook_time_min INTEGER,
      image_url TEXT,
      source_url TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      notes TEXT,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recipe_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      step_number INTEGER NOT NULL,
      instruction TEXT NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shopping_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      ingredient_name TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      checked INTEGER DEFAULT 0,
      recipe_names TEXT
    );
  `);

  // meal_plan: recreate if constraint is outdated (migration)
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='meal_plan'").get() as any;
  if (!tableInfo) {
    db.exec(`
      CREATE TABLE meal_plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL CHECK(meal_type IN ('almuerzo', 'lunch', 'merienda', 'dinner')),
        recipe_id INTEGER,
        custom_meal TEXT,
        notes TEXT,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
        UNIQUE(date, meal_type)
      );
    `);
  } else if (!tableInfo.sql.includes("almuerzo")) {
    // Migrate: old table only had lunch/dinner
    db.exec(`
      ALTER TABLE meal_plan RENAME TO meal_plan_old;
      CREATE TABLE meal_plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL CHECK(meal_type IN ('almuerzo', 'lunch', 'merienda', 'dinner')),
        recipe_id INTEGER,
        custom_meal TEXT,
        notes TEXT,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
        UNIQUE(date, meal_type)
      );
      INSERT INTO meal_plan (id, date, meal_type, recipe_id, custom_meal, notes)
        SELECT id, date, meal_type, recipe_id, custom_meal, notes FROM meal_plan_old;
      DROP TABLE meal_plan_old;
    `);
  }
}

export default db;
