// CalorieCraft diet engine.
// Nutrition numbers come from the food table; the engine scales servings mathematically.
// It optimizes toward the requested calorie/macro targets while respecting diet,
// allergy, cuisine, preference and budget filters.

const MEAL_SHARES = {
  3: [0.30, 0.40, 0.30],
  4: [0.25, 0.35, 0.15, 0.25],
  5: [0.22, 0.30, 0.13, 0.13, 0.22],
  6: [0.20, 0.28, 0.10, 0.12, 0.10, 0.20]
};

const MEAL_TYPES = ["breakfast", "lunch", "snack", "snack", "snack", "dinner"];

function normalize(s = "") {
  return String(s).toLowerCase().trim();
}

function splitWords(s = "") {
  return normalize(s).split(/[,;|]/).map(x => x.trim()).filter(Boolean);
}

function foodAllowed(food, dietType, allergies) {
  allergies = Array.isArray(allergies) ? allergies.map(normalize).filter(Boolean) : splitWords(allergies);
  const diet = normalize(dietType);
  const foodDiet = normalize(food.diet_type);
  const allergenText = normalize(food.allergens || "");

  // Vegan foods are valid for vegan/vegetarian/eggetarian users.
  const dietOK = diet === "vegan"
    ? foodDiet === "vegan"
    : diet === "vegetarian"
      ? ["vegan", "vegetarian"].includes(foodDiet)
      : diet === "eggetarian"
        ? ["vegan", "vegetarian", "eggetarian"].includes(foodDiet)
        : true;

  if (!dietOK) return false;
  return !allergies.some(a => allergenText.includes(a) || normalize(food.name).includes(a));
}

function scoreFood(food, cuisine, likes, budgetPerDay) {
  const name = normalize(food.name);
  const foodCuisine = normalize(food.cuisine);
  let score = 0;
  if (cuisine && foodCuisine === normalize(cuisine)) score += 5;
  likes.forEach(l => { if (name.includes(l)) score += 4; });
  const cost = Number(food.estimated_cost || 0);
  if (budgetPerDay > 0) score += Math.max(0, 2 - cost / budgetPerDay * 2);
  // Prefer nutritionally useful foods over tiny-calorie items.
  score += Math.min(2, Number(food.protein_g || 0) / 10);
  return score;
}

function macrosFor(food, servings) {
  return {
    calories: Number(food.calories) * servings,
    protein: Number(food.protein_g) * servings,
    carbs: Number(food.carbs_g) * servings,
    fat: Number(food.fat_g) * servings,
    cost: Number(food.estimated_cost || 0) * servings
  };
}

function add(a, b) {
  a.calories += b.calories; a.protein += b.protein;
  a.carbs += b.carbs; a.fat += b.fat; a.cost += b.cost;
}

function errorScore(total, target) {
  // Weighted relative error. Protein gets the strongest weight because it is
  // often the limiting macro in fitness meal planning.
  const cal = Math.abs(total.calories - target.calories) / Math.max(1, target.calories);
  const p = Math.abs(total.protein - target.protein) / Math.max(1, target.protein);
  const c = Math.abs(total.carbs - target.carbs) / Math.max(1, target.carbs);
  const f = Math.abs(total.fat - target.fat) / Math.max(1, target.fat);
  return cal * 1.0 + p * 1.5 + c * 0.7 + f * 0.7;
}

function nearestServing(food, remaining, maxServings = 4) {
  // Test practical portions in 0.25-serving steps and choose the portion that
  // most improves the remaining macro target without overshooting calories badly.
  let best = { servings: 0, score: Infinity };
  for (let s = 0.25; s <= maxServings; s += 0.25) {
    const m = macrosFor(food, s);
    const score = errorScore(m, remaining) + Math.max(0, (m.calories - remaining.calories) / Math.max(1, remaining.calories)) * 0.8;
    if (score < best.score) best = { servings: Number(s.toFixed(2)), score };
  }
  return best.servings;
}

function generatePlan({ foods, target, dietType, cuisine, likes = [], allergies = [], budget, mealsPerDay = 4 }) {
  const mealCount = Math.min(6, Math.max(3, Number(mealsPerDay) || 4));
  const shares = MEAL_SHARES[mealCount];
  const allowed = foods.filter(f => foodAllowed(f, dietType, allergies));
  if (!allowed.length) throw new Error("No foods match the selected diet and allergy filters.");

  likes = Array.isArray(likes) ? likes.map(normalize).filter(Boolean) : splitWords(likes);
  const ranked = [...allowed].sort((a, b) => scoreFood(b, cuisine, likes, budget) - scoreFood(a, cuisine, likes, budget));
  const meals = [];
  const total = { calories: 0, protein: 0, carbs: 0, fat: 0, cost: 0 };

  for (let i = 0; i < mealCount; i++) {
    const mealTarget = {
      calories: target.calories * shares[i],
      protein: target.protein * shares[i],
      carbs: target.carbs * shares[i],
      fat: target.fat * shares[i]
    };
    const remaining = { ...mealTarget };
    const items = [];

    // Build each meal with at most 3 foods. A protein anchor is selected first.
    const pool = ranked.slice(0, Math.min(10, ranked.length));
    for (let j = 0; j < Math.min(3, pool.length); j++) {
      const food = pool[(i + j) % pool.length];
      const servings = nearestServing(food, remaining, 2.5);
      if (servings <= 0) continue;
      const m = macrosFor(food, servings);
      items.push({ food, servings, ...m });
      remaining.calories -= m.calories;
      remaining.protein -= m.protein;
      remaining.carbs -= m.carbs;
      remaining.fat -= m.fat;
      if (remaining.calories <= mealTarget.calories * 0.05) break;
    }

    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, cost: 0 };
    items.forEach(x => add(totals, x));
    meals.push({ mealType: MEAL_TYPES[i], items, totals });
    add(total, totals);
  }

  // Second pass: add the best single food in small portions if calories are low.
  const top = ranked[0];
  let guard = 0;
  while (total.calories < target.calories * 0.94 && guard++ < 20) {
    const portion = 0.25;
    const m = macrosFor(top, portion);
    const meal = meals[guard % meals.length];
    meal.items.push({ food: top, servings: portion, ...m });
    add(meal.totals, m); add(total, m);
  }

  const budgetOK = !budget || total.cost <= Number(budget) * 1.05;
  const tolerance = {
    calories: Math.abs(total.calories - target.calories) / target.calories,
    protein: Math.abs(total.protein - target.protein) / target.protein,
    carbs: Math.abs(total.carbs - target.carbs) / target.carbs,
    fat: Math.abs(total.fat - target.fat) / target.fat
  };
  const aligned = tolerance.calories <= 0.05 && tolerance.protein <= 0.10 && tolerance.carbs <= 0.10 && tolerance.fat <= 0.10;

  return {
    target,
    totals: total,
    meals,
    budget: Number(budget || 0),
    budgetOK,
    aligned,
    tolerance,
    note: aligned
      ? "Plan is within the engine's target tolerance."
      : "No exact food combination was found; adjust portions or expand the food database for tighter matching."
  };
}

module.exports = { generatePlan };
