import { Router, Request, Response } from "express";
import db from "./db.js";
import { scrapeRecipe } from "./scraper.js";

const router = Router();

// ─── Recipes ────────────────────────────────────────────────

// GET /api/recipes - list all recipes
router.get("/recipes", (_req: Request, res: Response) => {
  const recipes = db.prepare(`
    SELECT r.*, 
      (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id) as ingredient_count
    FROM recipes r 
    ORDER BY r.updated_at DESC
  `).all();
  res.json(recipes);
});

// GET /api/recipes/:id - get recipe with ingredients and steps
router.get("/recipes/:id", (req: Request, res: Response) => {
  const recipe = db.prepare("SELECT * FROM recipes WHERE id = ?").get(req.params.id);
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });

  const ingredients = db
    .prepare("SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY id")
    .all(req.params.id);
  const steps = db
    .prepare("SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY step_number")
    .all(req.params.id);

  res.json({ ...(recipe as any), ingredients, steps });
});

// POST /api/recipes - create recipe
router.post("/recipes", (req: Request, res: Response) => {
  const { name, description, servings, prep_time_min, cook_time_min, image_url, source_url, tags, ingredients, steps } = req.body;

  const result = db.prepare(`
    INSERT INTO recipes (name, description, servings, prep_time_min, cook_time_min, image_url, source_url, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, description || null, servings || 2, prep_time_min || null, cook_time_min || null, image_url || null, source_url || null, JSON.stringify(tags || []));

  const recipeId = result.lastInsertRowid;

  if (ingredients?.length) {
    const insertIngredient = db.prepare(
      "INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, notes) VALUES (?, ?, ?, ?, ?)"
    );
    for (const ing of ingredients) {
      insertIngredient.run(recipeId, ing.name, ing.quantity || null, ing.unit || null, ing.notes || null);
    }
  }

  if (steps?.length) {
    const insertStep = db.prepare(
      "INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES (?, ?, ?)"
    );
    steps.forEach((instruction: string, idx: number) => {
      insertStep.run(recipeId, idx + 1, instruction);
    });
  }

  res.status(201).json({ id: recipeId });
});

// PUT /api/recipes/:id - update recipe
router.put("/recipes/:id", (req: Request, res: Response) => {
  const { name, description, servings, prep_time_min, cook_time_min, image_url, source_url, tags, ingredients, steps } = req.body;

  db.prepare(`
    UPDATE recipes SET name=?, description=?, servings=?, prep_time_min=?, cook_time_min=?, 
    image_url=?, source_url=?, tags=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name, description || null, servings || 2, prep_time_min || null, cook_time_min || null, image_url || null, source_url || null, JSON.stringify(tags || []), req.params.id);

  // Replace ingredients
  db.prepare("DELETE FROM recipe_ingredients WHERE recipe_id = ?").run(req.params.id);
  if (ingredients?.length) {
    const insertIngredient = db.prepare(
      "INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, notes) VALUES (?, ?, ?, ?, ?)"
    );
    for (const ing of ingredients) {
      insertIngredient.run(req.params.id, ing.name, ing.quantity || null, ing.unit || null, ing.notes || null);
    }
  }

  // Replace steps
  db.prepare("DELETE FROM recipe_steps WHERE recipe_id = ?").run(req.params.id);
  if (steps?.length) {
    const insertStep = db.prepare(
      "INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES (?, ?, ?)"
    );
    steps.forEach((instruction: string, idx: number) => {
      insertStep.run(req.params.id, idx + 1, instruction);
    });
  }

  res.json({ success: true });
});

// DELETE /api/recipes/:id
router.delete("/recipes/:id", (req: Request, res: Response) => {
  db.prepare("DELETE FROM recipes WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// POST /api/recipes/scrape - scrape recipe from URL
router.post("/recipes/scrape", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    const recipe = await scrapeRecipe(url);
    res.json(recipe);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to scrape recipe" });
  }
});

// ─── Meal Plan ──────────────────────────────────────────────

// GET /api/meal-plan?week_start=2024-01-15
router.get("/meal-plan", (req: Request, res: Response) => {
  const { week_start } = req.query;
  if (!week_start) return res.status(400).json({ error: "week_start is required" });

  // Get 7 days from week_start
  const start = new Date(week_start as string);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const plans = db.prepare(`
    SELECT mp.*, r.name as recipe_name, r.image_url as recipe_image, 
           r.cook_time_min as recipe_cook_time, r.prep_time_min as recipe_prep_time
    FROM meal_plan mp
    LEFT JOIN recipes r ON mp.recipe_id = r.id
    WHERE mp.date BETWEEN ? AND ?
    ORDER BY mp.date, mp.meal_type
  `).all(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));

  res.json(plans);
});

// PUT /api/meal-plan - upsert a meal
router.put("/meal-plan", (req: Request, res: Response) => {
  const { date, meal_type, recipe_id, custom_meal, notes } = req.body;

  db.prepare(`
    INSERT INTO meal_plan (date, meal_type, recipe_id, custom_meal, notes)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date, meal_type) DO UPDATE SET
      recipe_id = excluded.recipe_id,
      custom_meal = excluded.custom_meal,
      notes = excluded.notes
  `).run(date, meal_type, recipe_id || null, custom_meal || null, notes || null);

  res.json({ success: true });
});

// DELETE /api/meal-plan/:id
router.delete("/meal-plan/:id", (req: Request, res: Response) => {
  db.prepare("DELETE FROM meal_plan WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ─── Cooking Session (Meal Prep View) ───────────────────────

// GET /api/cooking-session?date=2024-01-15
// Returns what to cook tonight: tonight's dinner + tomorrow's lunch
router.get("/cooking-session", (req: Request, res: Response) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date is required" });

  const today = date as string;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const tonightDinner = db.prepare(`
    SELECT mp.*, r.name as recipe_name, r.image_url as recipe_image,
           r.cook_time_min, r.prep_time_min, r.description as recipe_description
    FROM meal_plan mp
    LEFT JOIN recipes r ON mp.recipe_id = r.id
    WHERE mp.date = ? AND mp.meal_type = 'dinner'
  `).get(today);

  const tomorrowLunch = db.prepare(`
    SELECT mp.*, r.name as recipe_name, r.image_url as recipe_image,
           r.cook_time_min, r.prep_time_min, r.description as recipe_description
    FROM meal_plan mp
    LEFT JOIN recipes r ON mp.recipe_id = r.id
    WHERE mp.date = ? AND mp.meal_type = 'lunch'
  `).get(tomorrowStr);

  // Get full recipes with ingredients/steps if they exist
  const getFullRecipe = (recipeId: number) => {
    const ingredients = db
      .prepare("SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY id")
      .all(recipeId);
    const steps = db
      .prepare("SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY step_number")
      .all(recipeId);
    return { ingredients, steps };
  };

  let dinnerDetails = null;
  let lunchDetails = null;

  if (tonightDinner && (tonightDinner as any).recipe_id) {
    dinnerDetails = getFullRecipe((tonightDinner as any).recipe_id);
  }
  if (tomorrowLunch && (tomorrowLunch as any).recipe_id) {
    lunchDetails = getFullRecipe((tomorrowLunch as any).recipe_id);
  }

  res.json({
    date: today,
    tonight_dinner: tonightDinner ? { ...(tonightDinner as any), ...dinnerDetails } : null,
    tomorrow_lunch: tomorrowLunch ? { ...(tomorrowLunch as any), ...lunchDetails } : null,
  });
});

// ─── Shopping List ──────────────────────────────────────────

// POST /api/shopping-list/generate - generate from a week's meal plan
router.post("/shopping-list/generate", (req: Request, res: Response) => {
  const { week_start } = req.body;
  if (!week_start) return res.status(400).json({ error: "week_start is required" });

  const start = new Date(week_start);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  // Get all recipe IDs for the week
  const meals = db.prepare(`
    SELECT mp.recipe_id, r.name as recipe_name
    FROM meal_plan mp
    JOIN recipes r ON mp.recipe_id = r.id
    WHERE mp.date BETWEEN ? AND ? AND mp.recipe_id IS NOT NULL
  `).all(startStr, endStr) as any[];

  // Aggregate ingredients
  const ingredientMap = new Map<string, { quantity: number; unit: string | null; recipes: Set<string> }>();

  for (const meal of meals) {
    const ingredients = db
      .prepare("SELECT * FROM recipe_ingredients WHERE recipe_id = ?")
      .all(meal.recipe_id) as any[];

    for (const ing of ingredients) {
      const key = ing.name.toLowerCase();
      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!;
        if (ing.quantity && existing.unit === ing.unit) {
          existing.quantity += ing.quantity;
        }
        existing.recipes.add(meal.recipe_name);
      } else {
        ingredientMap.set(key, {
          quantity: ing.quantity || 0,
          unit: ing.unit,
          recipes: new Set([meal.recipe_name]),
        });
      }
    }
  }

  // Clear previous list for this week and insert new
  db.prepare("DELETE FROM shopping_list WHERE week_start = ?").run(week_start);

  const insert = db.prepare(
    "INSERT INTO shopping_list (week_start, ingredient_name, quantity, unit, recipe_names) VALUES (?, ?, ?, ?, ?)"
  );

  for (const [name, data] of ingredientMap) {
    insert.run(week_start, name, data.quantity || null, data.unit, [...data.recipes].join(", "));
  }

  res.json({ success: true, count: ingredientMap.size });
});

// GET /api/shopping-list?week_start=2024-01-15
router.get("/shopping-list", (req: Request, res: Response) => {
  const { week_start } = req.query;
  if (!week_start) return res.status(400).json({ error: "week_start is required" });

  const items = db.prepare(
    "SELECT * FROM shopping_list WHERE week_start = ? ORDER BY ingredient_name"
  ).all(week_start);

  res.json(items);
});

// PATCH /api/shopping-list/:id/toggle - toggle checked
router.patch("/shopping-list/:id/toggle", (req: Request, res: Response) => {
  db.prepare(
    "UPDATE shopping_list SET checked = CASE WHEN checked = 0 THEN 1 ELSE 0 END WHERE id = ?"
  ).run(req.params.id);
  res.json({ success: true });
});

export default router;
