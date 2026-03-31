const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// ─── Types ──────────────────────────────────────────────────

export interface Ingredient {
  id?: number;
  recipe_id?: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
}

export interface Recipe {
  id: number;
  name: string;
  description: string | null;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  image_url: string | null;
  source_url: string | null;
  tags: string;
  ingredient_count?: number;
  ingredients?: Ingredient[];
  steps?: { id: number; step_number: number; instruction: string }[];
  created_at: string;
  updated_at: string;
}

export interface MealPlan {
  id: number;
  date: string;
  meal_type: "almuerzo" | "lunch" | "merienda" | "dinner";
  recipe_id: number | null;
  custom_meal: string | null;
  notes: string | null;
  recipe_name?: string;
  recipe_image?: string;
  recipe_cook_time?: number;
  recipe_prep_time?: number;
}

export interface CookingSession {
  date: string;
  tonight_dinner: (MealPlan & { ingredients?: Ingredient[]; steps?: any[] }) | null;
  tomorrow_lunch: (MealPlan & { ingredients?: Ingredient[]; steps?: any[] }) | null;
}

export interface ShoppingItem {
  id: number;
  week_start: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  checked: number;
  recipe_names: string | null;
}

export interface ScrapedRecipe {
  name: string;
  description: string;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  image_url: string | null;
  source_url: string;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
}

// ─── API Functions ──────────────────────────────────────────

export const api = {
  // Recipes
  getRecipes: () => request<Recipe[]>("/recipes"),
  getRecipe: (id: number) => request<Recipe>(`/recipes/${id}`),
  createRecipe: (data: any) => request<{ id: number }>("/recipes", { method: "POST", body: JSON.stringify(data) }),
  updateRecipe: (id: number, data: any) => request<{ success: boolean }>(`/recipes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRecipe: (id: number) => request<{ success: boolean }>(`/recipes/${id}`, { method: "DELETE" }),
  scrapeRecipe: (url: string) => request<ScrapedRecipe>("/recipes/scrape", { method: "POST", body: JSON.stringify({ url }) }),

  // Meal Plan
  getMealPlan: (weekStart: string) => request<MealPlan[]>(`/meal-plan?week_start=${weekStart}`),
  setMeal: (data: { date: string; meal_type: string; recipe_id?: number; custom_meal?: string; notes?: string }) =>
    request<{ success: boolean }>("/meal-plan", { method: "PUT", body: JSON.stringify(data) }),
  deleteMeal: (id: number) => request<{ success: boolean }>(`/meal-plan/${id}`, { method: "DELETE" }),

  // Cooking Session
  getCookingSession: (date: string) => request<CookingSession>(`/cooking-session?date=${date}`),

  // Shopping List
  generateShoppingList: (weekStart: string) =>
    request<{ success: boolean; count: number }>("/shopping-list/generate", { method: "POST", body: JSON.stringify({ week_start: weekStart }) }),
  getShoppingList: (weekStart: string) => request<ShoppingItem[]>(`/shopping-list?week_start=${weekStart}`),
  toggleShoppingItem: (id: number) => request<{ success: boolean }>(`/shopping-list/${id}/toggle`, { method: "PATCH" }),
};
