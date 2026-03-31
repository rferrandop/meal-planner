import { useState, useEffect } from "react";
import { api } from "../lib/api";
import type { CookingSession } from "../lib/api";
import { todayStr, formatDate } from "../lib/dates";
import { ChevronLeft, ChevronRight, Clock, UtensilsCrossed } from "lucide-react";

export default function CookingSessionPage() {
  const [date, setDate] = useState(todayStr());
  const [session, setSession] = useState<CookingSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getCookingSession(date).then((data) => {
      setSession(data);
      setLoading(false);
    });
  }, [date]);

  const navigateDay = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const tomorrow = new Date(date + "T12:00:00");
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  if (loading) return <div className="page"><p>Cargando...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Sesion de Cocina</h2>
        <div className="week-nav">
          <button className="btn-icon" onClick={() => navigateDay(-1)}>
            <ChevronLeft size={20} />
          </button>
          <span className="week-label">{formatDate(date)}</span>
          <button className="btn-icon" onClick={() => navigateDay(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <p className="cooking-subtitle">
        Esta tarde preparas: la <strong>cena de hoy</strong> ({formatDate(date)}) y la{" "}
        <strong>comida de manana</strong> ({formatDate(tomorrowStr)}).
      </p>

      <div className="cooking-cards">
        {/* Tonight's Dinner */}
        <div className="cooking-card">
          <div className="cooking-card-header dinner">
            <UtensilsCrossed size={20} />
            <h3>Cena de hoy</h3>
          </div>
          {session?.tonight_dinner ? (
            <div className="cooking-card-body">
              <h4>{session.tonight_dinner.recipe_name || session.tonight_dinner.custom_meal}</h4>
              {(session.tonight_dinner as any).recipe_description && (
                <p className="recipe-desc">{(session.tonight_dinner as any).recipe_description}</p>
              )}
              {(session.tonight_dinner.recipe_cook_time || session.tonight_dinner.recipe_prep_time) && (
                <div className="time-badges">
                  {session.tonight_dinner.recipe_prep_time && (
                    <span className="badge"><Clock size={14} /> Prep: {session.tonight_dinner.recipe_prep_time} min</span>
                  )}
                  {session.tonight_dinner.recipe_cook_time && (
                    <span className="badge"><Clock size={14} /> Coccion: {session.tonight_dinner.recipe_cook_time} min</span>
                  )}
                </div>
              )}
              {session.tonight_dinner.ingredients && session.tonight_dinner.ingredients.length > 0 && (
                <div className="ingredients-section">
                  <h5>Ingredientes</h5>
                  <ul>
                    {session.tonight_dinner.ingredients.map((ing, i) => (
                      <li key={i}>
                        {ing.quantity && <strong>{ing.quantity}</strong>} {ing.unit} {ing.name}
                        {ing.notes && <em> ({ing.notes})</em>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {session.tonight_dinner.steps && session.tonight_dinner.steps.length > 0 && (
                <div className="steps-section">
                  <h5>Pasos</h5>
                  <ol>
                    {session.tonight_dinner.steps.map((step: any) => (
                      <li key={step.step_number}>{step.instruction}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="cooking-card-body empty">
              <p>No hay cena planificada para hoy.</p>
            </div>
          )}
        </div>

        {/* Tomorrow's Lunch */}
        <div className="cooking-card">
          <div className="cooking-card-header lunch">
            <UtensilsCrossed size={20} />
            <h3>Comida de manana</h3>
          </div>
          {session?.tomorrow_lunch ? (
            <div className="cooking-card-body">
              <h4>{session.tomorrow_lunch.recipe_name || session.tomorrow_lunch.custom_meal}</h4>
              {(session.tomorrow_lunch as any).recipe_description && (
                <p className="recipe-desc">{(session.tomorrow_lunch as any).recipe_description}</p>
              )}
              {(session.tomorrow_lunch.recipe_cook_time || session.tomorrow_lunch.recipe_prep_time) && (
                <div className="time-badges">
                  {session.tomorrow_lunch.recipe_prep_time && (
                    <span className="badge"><Clock size={14} /> Prep: {session.tomorrow_lunch.recipe_prep_time} min</span>
                  )}
                  {session.tomorrow_lunch.recipe_cook_time && (
                    <span className="badge"><Clock size={14} /> Coccion: {session.tomorrow_lunch.recipe_cook_time} min</span>
                  )}
                </div>
              )}
              {session.tomorrow_lunch.ingredients && session.tomorrow_lunch.ingredients.length > 0 && (
                <div className="ingredients-section">
                  <h5>Ingredientes</h5>
                  <ul>
                    {session.tomorrow_lunch.ingredients.map((ing, i) => (
                      <li key={i}>
                        {ing.quantity && <strong>{ing.quantity}</strong>} {ing.unit} {ing.name}
                        {ing.notes && <em> ({ing.notes})</em>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {session.tomorrow_lunch.steps && session.tomorrow_lunch.steps.length > 0 && (
                <div className="steps-section">
                  <h5>Pasos</h5>
                  <ol>
                    {session.tomorrow_lunch.steps.map((step: any) => (
                      <li key={step.step_number}>{step.instruction}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="cooking-card-body empty">
              <p>No hay comida planificada para manana.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
