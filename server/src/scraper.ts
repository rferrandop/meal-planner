import { parse } from "node-html-parser";

interface ScrapedRecipe {
  name: string;
  description: string;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  image_url: string | null;
  source_url: string;
  ingredients: { name: string; quantity: number | null; unit: string | null; notes: string | null }[];
  steps: string[];
  tags: string[];
}

/**
 * Scrapes a recipe from a URL using JSON-LD structured data (schema.org/Recipe).
 * Most major recipe sites include this format.
 */
export async function scrapeRecipe(url: string): Promise<ScrapedRecipe> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const root = parse(html);

  // Try to find JSON-LD recipe data
  const jsonLdScripts = root.querySelectorAll('script[type="application/ld+json"]');

  let recipeData: any = null;

  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.text);
      recipeData = findRecipeInJsonLd(data);
      if (recipeData) break;
    } catch {
      continue;
    }
  }

  if (!recipeData) {
    // Fallback: try to extract from meta tags and page content
    return scrapeFromHtml(root, url);
  }

  return parseJsonLdRecipe(recipeData, url);
}

function findRecipeInJsonLd(data: any): any {
  if (!data) return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
    return null;
  }

  if (data["@type"] === "Recipe" || (Array.isArray(data["@type"]) && data["@type"].includes("Recipe"))) {
    return data;
  }

  if (data["@graph"]) {
    return findRecipeInJsonLd(data["@graph"]);
  }

  return null;
}

function parseDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  return hours * 60 + minutes;
}

function parseIngredientString(raw: string): {
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
} {
  const cleaned = raw.replace(/<[^>]*>/g, "").trim();

  // Try to parse "1 1/2 cups flour, sifted" style
  const match = cleaned.match(
    /^([\d\s\/\.½¼¾⅓⅔⅛]+)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?|litres?|cloves?|pieces?|slices?|cans?|bunch|pinch)?\s*(?:of\s+)?(.+)$/i
  );

  if (match) {
    let qty: number | null = null;
    if (match[1]) {
      const qtyStr = match[1]
        .trim()
        .replace("½", ".5")
        .replace("¼", ".25")
        .replace("¾", ".75")
        .replace("⅓", ".33")
        .replace("⅔", ".67")
        .replace("⅛", ".125");

      // Handle fractions like "1 1/2"
      const parts = qtyStr.split(/\s+/);
      qty = parts.reduce((sum, p) => {
        if (p.includes("/")) {
          const [n, d] = p.split("/");
          return sum + parseInt(n) / parseInt(d);
        }
        return sum + parseFloat(p);
      }, 0);
    }

    const namePart = match[3] || cleaned;
    const noteMatch = namePart.match(/^(.+?),\s*(.+)$/);

    return {
      quantity: qty,
      unit: match[2] || null,
      name: noteMatch ? noteMatch[1].trim() : namePart.trim(),
      notes: noteMatch ? noteMatch[2].trim() : null,
    };
  }

  return { name: cleaned, quantity: null, unit: null, notes: null };
}

function parseJsonLdRecipe(data: any, url: string): ScrapedRecipe {
  const ingredients = (data.recipeIngredient || []).map((i: string) =>
    parseIngredientString(i)
  );

  const steps: string[] = [];
  const rawSteps = data.recipeInstructions || [];
  for (const step of rawSteps) {
    if (typeof step === "string") {
      steps.push(step);
    } else if (step.text) {
      steps.push(step.text);
    } else if (step.itemListElement) {
      for (const sub of step.itemListElement) {
        if (typeof sub === "string") steps.push(sub);
        else if (sub.text) steps.push(sub.text);
      }
    }
  }

  const tags: string[] = [];
  if (data.recipeCategory) {
    const cats = Array.isArray(data.recipeCategory) ? data.recipeCategory : [data.recipeCategory];
    tags.push(...cats);
  }
  if (data.recipeCuisine) {
    const cuisines = Array.isArray(data.recipeCuisine) ? data.recipeCuisine : [data.recipeCuisine];
    tags.push(...cuisines);
  }
  if (data.keywords) {
    if (typeof data.keywords === "string") {
      tags.push(...data.keywords.split(",").map((k: string) => k.trim()));
    } else if (Array.isArray(data.keywords)) {
      tags.push(...data.keywords);
    }
  }

  let imageUrl: string | null = null;
  if (data.image) {
    if (typeof data.image === "string") imageUrl = data.image;
    else if (Array.isArray(data.image)) imageUrl = data.image[0];
    else if (data.image.url) imageUrl = data.image.url;
  }

  const servingsRaw = data.recipeYield;
  let servings = 2;
  if (servingsRaw) {
    const val = Array.isArray(servingsRaw) ? servingsRaw[0] : servingsRaw;
    const num = typeof val === "number" ? val : parseInt(String(val));
    if (!isNaN(num)) servings = num;
  }

  return {
    name: data.name || "Untitled Recipe",
    description: data.description || "",
    servings,
    prep_time_min: parseDuration(data.prepTime),
    cook_time_min: parseDuration(data.cookTime) || parseDuration(data.totalTime),
    image_url: imageUrl,
    source_url: url,
    ingredients,
    steps,
    tags: [...new Set(tags)].slice(0, 10),
  };
}

function scrapeFromHtml(root: any, url: string): ScrapedRecipe {
  const title =
    root.querySelector("h1")?.text?.trim() ||
    root.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    "Untitled Recipe";

  const description =
    root.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
    root.querySelector('meta[name="description"]')?.getAttribute("content") ||
    "";

  const imageUrl =
    root.querySelector('meta[property="og:image"]')?.getAttribute("content") || null;

  return {
    name: title,
    description,
    servings: 2,
    prep_time_min: null,
    cook_time_min: null,
    image_url: imageUrl,
    source_url: url,
    ingredients: [],
    steps: [],
    tags: [],
  };
}
