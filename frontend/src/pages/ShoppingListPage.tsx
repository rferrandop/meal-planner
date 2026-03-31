import { useState, useEffect } from "react";
import { RefreshCw, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import type { ShoppingItem } from "../lib/api";
import { getWeekStart, formatDate, getWeekDays } from "../lib/dates";

export default function ShoppingListPage() {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [generating, setGenerating] = useState(false);

  const days = getWeekDays(weekStart);

  const loadList = async () => {
    const data = await api.getShoppingList(weekStart);
    setItems(data);
  };

  useEffect(() => {
    loadList();
  }, [weekStart]);

  const navigateWeek = (delta: number) => {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(getWeekStart(d));
  };

  const generate = async () => {
    setGenerating(true);
    await api.generateShoppingList(weekStart);
    await loadList();
    setGenerating(false);
  };

  const toggle = async (id: number) => {
    await api.toggleShoppingItem(id);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: item.checked ? 0 : 1 } : item
      )
    );
  };

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Lista de Compras</h2>
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

      <button className="btn-primary" onClick={generate} disabled={generating} style={{ marginBottom: "1rem" }}>
        <RefreshCw size={16} className={generating ? "spin" : ""} />
        {generating ? "Generando..." : "Generar lista de la semana"}
      </button>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>
            No hay lista de compras para esta semana. Planifica tus comidas y pulsa
            "Generar lista de la semana".
          </p>
        </div>
      ) : (
        <>
          <div className="shopping-list">
            {unchecked.map((item) => (
              <div key={item.id} className="shopping-item" onClick={() => toggle(item.id)}>
                <div className="checkbox" />
                <div className="shopping-item-info">
                  <span className="shopping-item-name">
                    {item.quantity ? `${item.quantity} ${item.unit || ""} ` : ""}
                    {item.ingredient_name}
                  </span>
                  {item.recipe_names && (
                    <span className="shopping-item-recipes">{item.recipe_names}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {checked.length > 0 && (
            <>
              <h4 className="checked-header">
                <Check size={16} /> Comprado ({checked.length})
              </h4>
              <div className="shopping-list checked-list">
                {checked.map((item) => (
                  <div key={item.id} className="shopping-item checked" onClick={() => toggle(item.id)}>
                    <div className="checkbox checked-box">
                      <Check size={12} />
                    </div>
                    <div className="shopping-item-info">
                      <span className="shopping-item-name">
                        {item.quantity ? `${item.quantity} ${item.unit || ""} ` : ""}
                        {item.ingredient_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
