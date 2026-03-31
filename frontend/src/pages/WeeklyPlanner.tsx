import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, X, Clock, UtensilsCrossed } from "lucide-react";
import { api } from "../lib/api";
import type { MealPlan, Recipe } from "../lib/api";
import { getWeekStart, getWeekDays, formatDate, formatDateShort } from "../lib/dates";

const MEAL_TYPES = ["almuerzo", "lunch", "merienda", "dinner"] as const;
const MEAL_LABELS: Record<string, string> = {
  almuerzo: "Almuerzo",
  lunch: "Comida",
  merienda: "Merienda",
  dinner: "Cena",
};

export default function WeeklyPlanner() {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showModal, setShowModal] = useState<{ date: string; meal_type: string } | null>(null);
  const [search, setSearch] = useState("");
  const [customMeal, setCustomMeal] = useState("");

  const days = getWeekDays(weekStart);

  const loadData = useCallback(async () => {
    const [mealData, recipeData] = await Promise.all([
      api.getMealPlan(weekStart),
      api.getRecipes(),
    ]);
    setMeals(mealData);
    setRecipes(recipeData);
  }, [weekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigateWeek = (delta: number) => {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(getWeekStart(d));
  };

  const getMeal = (date: string, mealType: string) =>
    meals.find((m) => m.date === date && m.meal_type === mealType);

  const assignMeal = async (recipeId?: number, custom?: string) => {
    if (!showModal) return;
    await api.setMeal({
      date: showModal.date,
      meal_type: showModal.meal_type,
      recipe_id: recipeId,
      custom_meal: custom,
    });
    setShowModal(null);
    setSearch("");
    setCustomMeal("");
    loadData();
  };

  const removeMeal = async (id: number) => {
    await api.deleteMeal(id);
    loadData();
  };

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="page page-wide">
      <div className="page-header">
        <h2>Planificador Semanal</h2>
        <div className="week-nav">
          <button className="btn-icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft size={20} />
          </button>
          <span className="week-label">
            Semana del {formatDate(days[0])}
          </span>
          <button className="btn-icon" onClick={() => navigateWeek(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Transposed grid: meal types as rows, days as columns */}
      <div className="weekly-grid-transposed">
        {/* Header row: empty corner + 7 day columns */}
        <div className="tgrid-header">
          <div className="tgrid-corner"></div>
          {days.map((date) => {
            const isToday = date === today;
            return (
              <div key={date} className={`tgrid-day-header ${isToday ? "today" : ""}`}>
                {formatDateShort(date)}
              </div>
            );
          })}
        </div>

        {/* One row per meal type */}
        {MEAL_TYPES.map((type) => (
          <div key={type} className="tgrid-row">
            <div className={`tgrid-meal-label ${type}`}>{MEAL_LABELS[type]}</div>
            {days.map((date) => {
              const meal = getMeal(date, type);
              const isToday = date === today;
              return (
                <div key={date} className={`tgrid-cell ${isToday ? "today-col" : ""}`}>
                  {meal ? (
                    <div
                      className={`meal-card-compact ${meal.recipe_image ? "has-thumb" : ""} ${meal.recipe_id ? "clickable" : ""}`}
                      onClick={() => meal.recipe_id && navigate(`/recipes/${meal.recipe_id}`)}
                    >
                      {meal.recipe_image && (
                        <div
                          className="meal-thumb"
                          style={{ backgroundImage: `url(${meal.recipe_image})` }}
                        />
                      )}
                      {!meal.recipe_image && meal.recipe_name && (
                        <div className="meal-thumb-placeholder">
                          <UtensilsCrossed size={14} />
                        </div>
                      )}
                      <div className="meal-card-info">
                        <span className="meal-name-compact">
                          {meal.recipe_name || meal.custom_meal}
                        </span>
                        {meal.recipe_cook_time && (
                          <span className="meal-time-compact">
                            <Clock size={10} /> {meal.recipe_cook_time}m
                          </span>
                        )}
                      </div>
                      <button
                        className="btn-remove-compact"
                        onClick={(e) => { e.stopPropagation(); removeMeal(meal.id); }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-add-meal-compact"
                      onClick={() => setShowModal({ date, meal_type: type })}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="prep-hint">
        <strong>Tu rutina:</strong> Cada tarde cocinas la cena de hoy + la comida de manana.
        Ve a <em>"Cocinar Hoy"</em> para ver que preparar.
      </div>

      {/* Modal for assigning meals */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {MEAL_LABELS[showModal.meal_type]} - {formatDate(showModal.date)}
              </h3>
              <button className="btn-icon" onClick={() => setShowModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <input
                type="text"
                placeholder="Buscar receta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
                autoFocus
              />

              <div className="recipe-list-modal">
                {filteredRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    className="recipe-option"
                    onClick={() => assignMeal(recipe.id)}
                  >
                    {recipe.image_url ? (
                      <img
                        src={recipe.image_url}
                        alt=""
                        className="recipe-option-thumb"
                      />
                    ) : (
                      <div className="recipe-option-thumb-placeholder">
                        <UtensilsCrossed size={16} />
                      </div>
                    )}
                    <div className="recipe-option-info">
                      <span className="recipe-option-name">{recipe.name}</span>
                      <span className="recipe-option-meta">
                        {recipe.cook_time_min && <>{recipe.cook_time_min} min</>}
                        {recipe.cook_time_min && recipe.ingredient_count ? " · " : ""}
                        {recipe.ingredient_count ? `${recipe.ingredient_count} ing.` : ""}
                      </span>
                    </div>
                  </button>
                ))}
                {filteredRecipes.length === 0 && (
                  <p className="empty-text">No hay recetas. Anade una desde la seccion Recetas.</p>
                )}
              </div>

              <div className="divider-text">o escribe algo personalizado</div>

              <div className="custom-meal-row">
                <input
                  type="text"
                  placeholder="Ej: Pizza del Telepizza"
                  value={customMeal}
                  onChange={(e) => setCustomMeal(e.target.value)}
                  className="search-input"
                />
                <button
                  className="btn-primary"
                  onClick={() => assignMeal(undefined, customMeal)}
                  disabled={!customMeal.trim()}
                >
                  Anadir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
