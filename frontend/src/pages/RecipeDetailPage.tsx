import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Clock, Users, ExternalLink, Trash2, Tag, Pencil, Upload } from "lucide-react";
import { api } from "../lib/api";
import type { Recipe } from "../lib/api";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formServings, setFormServings] = useState(2);
  const [formPrepTime, setFormPrepTime] = useState<number | "">("");
  const [formCookTime, setFormCookTime] = useState<number | "">("");
  const [formIngredients, setFormIngredients] = useState("");
  const [formSteps, setFormSteps] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formSourceUrl, setFormSourceUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadRecipe = () => {
    if (id) {
      api.getRecipe(parseInt(id)).then(setRecipe);
    }
  };

  useEffect(() => {
    loadRecipe();
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

  const startEditing = () => {
    setFormName(recipe.name);
    setFormDesc(recipe.description || "");
    setFormServings(recipe.servings);
    setFormPrepTime(recipe.prep_time_min || "");
    setFormCookTime(recipe.cook_time_min || "");
    setFormImageUrl(recipe.image_url || "");
    setFormSourceUrl(recipe.source_url || "");
    setFormIngredients(
      (recipe.ingredients || [])
        .map((i) => {
          let s = "";
          if (i.quantity) s += i.quantity + " ";
          if (i.unit) s += i.unit + " ";
          s += i.name;
          if (i.notes) s += ", " + i.notes;
          return s;
        })
        .join("\n")
    );
    setFormSteps(
      (recipe.steps || []).map((s) => s.instruction).join("\n\n")
    );
    setFormTags(tags.join(", "));
    setEditing(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    const ingredients = formIngredients
      .split("\n")
      .filter((l) => l.trim())
      .map((line) => ({ name: line.trim(), quantity: null, unit: null, notes: null }));

    const steps = formSteps
      .split("\n\n")
      .filter((s) => s.trim())
      .map((s) => s.trim());

    const parsedTags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await api.updateRecipe(recipe.id, {
      name: formName,
      description: formDesc,
      servings: formServings,
      prep_time_min: formPrepTime || null,
      cook_time_min: formCookTime || null,
      image_url: formImageUrl || null,
      source_url: formSourceUrl || null,
      tags: parsedTags,
      ingredients,
      steps,
    });

    setEditing(false);
    loadRecipe();
  };

  if (editing) {
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn-secondary" onClick={() => setEditing(false)}>
            <ArrowLeft size={16} /> Cancelar
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!formName.trim()}>
            Guardar Cambios
          </button>
        </div>

        <div className="recipe-detail">
          <h2 style={{ marginBottom: 16 }}>Editar Receta</h2>
          <div className="recipe-form">
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="search-input" />
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} />
            </div>
            <div className="form-group">
              <label>Foto</label>
              {formImageUrl && (
                <div style={{ marginBottom: 8 }}>
                  <img src={formImageUrl} alt="Preview" style={{ maxHeight: 120, borderRadius: 8, objectFit: "cover" }} />
                </div>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label className="btn-secondary" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Upload size={14} /> {uploading ? "Subiendo..." : "Subir foto"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      try {
                        const { url } = await api.uploadImage(file);
                        setFormImageUrl(url);
                      } catch (err: any) {
                        alert(err.message || "Error al subir imagen");
                      } finally {
                        setUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
                <span style={{ color: "#888", fontSize: "0.85em" }}>o</span>
                <input
                  type="url"
                  placeholder="URL de imagen"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="search-input"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
            <div className="form-group">
              <label>URL fuente (opcional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={formSourceUrl}
                onChange={(e) => setFormSourceUrl(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Raciones</label>
                <input type="number" value={formServings} onChange={(e) => setFormServings(parseInt(e.target.value) || 2)} min={1} />
              </div>
              <div className="form-group">
                <label>Prep (min)</label>
                <input type="number" value={formPrepTime} onChange={(e) => setFormPrepTime(e.target.value ? parseInt(e.target.value) : "")} />
              </div>
              <div className="form-group">
                <label>Coccion (min)</label>
                <input type="number" value={formCookTime} onChange={(e) => setFormCookTime(e.target.value ? parseInt(e.target.value) : "")} />
              </div>
            </div>
            <div className="form-group">
              <label>Ingredientes (uno por linea)</label>
              <textarea value={formIngredients} onChange={(e) => setFormIngredients(e.target.value)} rows={6} placeholder={"2 cups harina\n3 huevos\n200g queso rallado"} />
            </div>
            <div className="form-group">
              <label>Pasos (separados por linea en blanco)</label>
              <textarea value={formSteps} onChange={(e) => setFormSteps(e.target.value)} rows={6} placeholder={"Precalentar el horno a 180C\n\nMezclar los ingredientes secos"} />
            </div>
            <div className="form-group">
              <label>Tags (separados por coma)</label>
              <input type="text" value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="pasta, italiano, rapido" className="search-input" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/recipes" className="back-link">
          <ArrowLeft size={20} /> Volver
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={startEditing}>
            <Pencil size={16} /> Editar
          </button>
          <button className="btn-danger" onClick={handleDelete}>
            <Trash2 size={16} /> Eliminar
          </button>
        </div>
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
