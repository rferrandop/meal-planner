import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { CalendarDays, ChefHat, BookOpen, ShoppingCart } from "lucide-react";
import WeeklyPlanner from "./pages/WeeklyPlanner";
import CookingSessionPage from "./pages/CookingSessionPage";
import RecipesPage from "./pages/RecipesPage";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import ShoppingListPage from "./pages/ShoppingListPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="sidebar">
          <div className="sidebar-header">
            <ChefHat size={28} />
            <h1>Meal Planner</h1>
          </div>
          <div className="nav-links">
            <NavLink to="/" end>
              <CalendarDays size={20} />
              <span>Semana</span>
            </NavLink>
            <NavLink to="/cooking">
              <ChefHat size={20} />
              <span>Cocinar Hoy</span>
            </NavLink>
            <NavLink to="/recipes">
              <BookOpen size={20} />
              <span>Recetas</span>
            </NavLink>
            <NavLink to="/shopping">
              <ShoppingCart size={20} />
              <span>Compras</span>
            </NavLink>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<WeeklyPlanner />} />
            <Route path="/cooking" element={<CookingSessionPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/recipes/:id" element={<RecipeDetailPage />} />
            <Route path="/shopping" element={<ShoppingListPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
