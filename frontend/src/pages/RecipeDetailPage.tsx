import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Clock, Users, ExternalLink, Trash2, Tag } from "lucide-react";
import { api } from "../lib/api";
import type { Recipe } from "../lib/api";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (id) {
      api.getRecipe(parseInt(id)).then(setRecipe);
    }
  }, [id]);

  if (!recipe) return <div className="page"><p>Cargando...</p></div>;

  const tags: string[] = (() => {
    try {
      return JSON.parse(recipe.tags || "[]");
    } catch {
      return [];
    }
  })();

  const handleDelete = async () => {
    if (!confirm("Eliminar esta receta?")) return;
    await api.deleteRecipe(recipe.id);
    navigate("/recipes");
  };

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/recipes" className="back-link">
          <ArrowLeft size={20} /> Volver
        </Link>
        <button className="btn-danger" onClick={handleDelete}>
          <Trash2 size={16} /> Eliminar
        </button>
      </div>

      <div className="recipe-detail">
        {recipe.image_url && (
          <div className="recipe-hero">
            <img src={recipe.image_url} alt={recipe.name} />
          </div>
        )}

        <h2>{recipe.name}</h2>
        {recipe.description && <p className="recipe-desc">{recipe.description}</p>}

        <div className="recipe-meta">
          <span className="badge">
            <Users size={14} /> {recipe.servings} raciones
          </span>
          {recipe.prep_time_min && (
            <span className="badge">
              <Clock size={14} /> Prep: {recipe.prep_time_min} min
            </span>
          )}
          {recipe.cook_time_min && (
            <span className="badge">
              <Clock size={14} /> Coccion: {recipe.cook_time_min} min
            </span>
          )}
          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noreferrer" className="badge badge-link">
              <ExternalLink size={14} /> Fuente
            </a>
          )}
        </div>

        {tags.length > 0 && (
          <div className="tags">
            {tags.map((tag, i) => (
              <span key={i} className="tag">
                <Tag size={12} /> {tag}
              </span>
            ))}
          </div>
        )}

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="recipe-section">
            <h3>Ingredientes</h3>
            <ul className="ingredient-list">
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>
                  {ing.quantity && <strong>{ing.quantity}</strong>} {ing.unit}{" "}
                  {ing.name}
                  {ing.notes && <em> ({ing.notes})</em>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recipe.steps && recipe.steps.length > 0 && (
          <div className="recipe-section">
            <h3>Preparacion</h3>
            <ol className="steps-list">
              {recipe.steps.map((step) => (
                <li key={step.step_number}>{step.instruction}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
