import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Loader2, Globe, Clock, Trash2, Upload, ImageIcon } from "lucide-react";
import { api } from "../lib/api";
import type { Recipe, ScrapedRecipe } from "../lib/api";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showScrape, setShowScrape] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [scrapedData, setScrapedData] = useState<ScrapedRecipe | null>(null);

  // Manual recipe form
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

  const loadRecipes = async () => {
    const data = await api.getRecipes();
    setRecipes(data);
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeError("");
    try {
      const data = await api.scrapeRecipe(scrapeUrl);
      setScrapedData(data);
      setFormName(data.name);
      setFormDesc(data.description);
      setFormServings(data.servings);
      setFormPrepTime(data.prep_time_min || "");
      setFormCookTime(data.cook_time_min || "");
      setFormIngredients(
        data.ingredients
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
      setFormSteps(data.steps.join("\n\n"));
      setFormTags(data.tags.join(", "));
      setFormImageUrl(data.image_url || "");
      setFormSourceUrl(data.source_url || scrapeUrl);
      setShowScrape(false);
      setShowAdd(true);
    } catch (err: any) {
      setScrapeError(err.message || "Error al importar receta");
    } finally {
      setScraping(false);
    }
  };

  const handleManualFromUrl = () => {
    setFormSourceUrl(scrapeUrl);
    setShowScrape(false);
    setShowAdd(true);
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

    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const recipeData = scrapedData
      ? {
          name: formName,
          description: formDesc,
          servings: formServings,
          prep_time_min: formPrepTime || null,
          cook_time_min: formCookTime || null,
          image_url: formImageUrl || scrapedData.image_url,
          source_url: formSourceUrl || scrapedData.source_url,
          tags,
          ingredients: scrapedData.ingredients,
          steps: scrapedData.steps,
        }
      : {
          name: formName,
          description: formDesc,
          servings: formServings,
          prep_time_min: formPrepTime || null,
          cook_time_min: formCookTime || null,
          image_url: formImageUrl || null,
          source_url: formSourceUrl || null,
          tags,
          ingredients,
          steps,
        };

    await api.createRecipe(recipeData);
    resetForm();
    loadRecipes();
  };

  const resetForm = () => {
    setShowAdd(false);
    setScrapedData(null);
    setFormName("");
    setFormDesc("");
    setFormServings(2);
    setFormPrepTime("");
    setFormCookTime("");
    setFormIngredients("");
    setFormSteps("");
    setFormTags("");
    setFormImageUrl("");
    setFormSourceUrl("");
  };

  const deleteRecipe = async (id: number) => {
    if (!confirm("Eliminar esta receta?")) return;
    await api.deleteRecipe(id);
    loadRecipes();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Recetas</h2>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowScrape(true)}>
            <Globe size={16} /> Importar URL
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Nueva Receta
          </button>
        </div>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Buscar recetas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No hay recetas aun. Importa una desde una URL o crea una manualmente.</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {filtered.map((recipe) => (
            <div key={recipe.id} className="recipe-card">
              {recipe.image_url && (
                <div
                  className="recipe-card-image"
                  style={{ backgroundImage: `url(${recipe.image_url})` }}
                />
              )}
              <div className="recipe-card-body">
                <Link to={`/recipes/${recipe.id}`}>
                  <h3>{recipe.name}</h3>
                </Link>
                {recipe.description && (
                  <p className="recipe-card-desc">
                    {recipe.description.slice(0, 100)}
                    {recipe.description.length > 100 ? "..." : ""}
                  </p>
                )}
                <div className="recipe-card-meta">
                  {recipe.cook_time_min && (
                    <span className="badge">
                      <Clock size={14} /> {recipe.cook_time_min} min
                    </span>
                  )}
                  {recipe.ingredient_count !== undefined && (
                    <span className="badge">{recipe.ingredient_count} ingredientes</span>
                  )}
                </div>
              </div>
              <button className="btn-remove card-delete" onClick={() => deleteRecipe(recipe.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Scrape Modal */}
      {showScrape && (
        <div className="modal-overlay" onClick={() => setShowScrape(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Importar Receta desde URL</h3>
            </div>
            <div className="modal-body">
              <p className="modal-hint">
                Pega la URL de una receta (funciona con la mayoria de sitios de cocina que usan schema.org).
              </p>
              <input
                type="url"
                placeholder="https://www.recetasgratis.net/..."
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                className="search-input"
                autoFocus
              />
              {scrapeError && (
                <div>
                  <p className="error-text">{scrapeError}</p>
                  <button
                    className="btn-secondary full-width"
                    style={{ marginTop: "8px" }}
                    onClick={handleManualFromUrl}
                  >
                    Crear manualmente (conservar URL)
                  </button>
                </div>
              )}
              <button
                className="btn-primary full-width"
                onClick={handleScrape}
                disabled={scraping || !scrapeUrl.trim()}
              >
                {scraping ? (
                  <>
                    <Loader2 size={16} className="spin" /> Importando...
                  </>
                ) : (
                  "Importar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Recipe Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{scrapedData ? "Revisar receta importada" : "Nueva Receta"}</h3>
            </div>
            <div className="modal-body recipe-form">
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="form-group">
                <label>Descripcion</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                />
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
                  <input
                    type="number"
                    value={formServings}
                    onChange={(e) => setFormServings(parseInt(e.target.value) || 2)}
                    min={1}
                  />
                </div>
                <div className="form-group">
                  <label>Prep (min)</label>
                  <input
                    type="number"
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(e.target.value ? parseInt(e.target.value) : "")}
                  />
                </div>
                <div className="form-group">
                  <label>Coccion (min)</label>
                  <input
                    type="number"
                    value={formCookTime}
                    onChange={(e) => setFormCookTime(e.target.value ? parseInt(e.target.value) : "")}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Ingredientes (uno por linea)</label>
                <textarea
                  value={formIngredients}
                  onChange={(e) => setFormIngredients(e.target.value)}
                  rows={6}
                  placeholder={"2 cups harina\n3 huevos\n200g queso rallado"}
                />
              </div>
              <div className="form-group">
                <label>Pasos (separados por linea en blanco)</label>
                <textarea
                  value={formSteps}
                  onChange={(e) => setFormSteps(e.target.value)}
                  rows={6}
                  placeholder={"Precalentar el horno a 180C\n\nMezclar los ingredientes secos"}
                />
              </div>
              <div className="form-group">
                <label>Tags (separados por coma)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="pasta, italiano, rapido"
                  className="search-input"
                />
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={handleSave} disabled={!formName.trim()}>
                  Guardar Receta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
