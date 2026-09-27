require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool, testConnection } = require("./db");
const { authRequired } = require("./middleware/auth");
const { generateMealPlan } = require("./services/aiMealPlanner");
const { generatePlan } = require("./dietEngine");
const path = require("path");

const app = express();
const allowedOrigin = process.env.CORS_ORIGIN || true;
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "1mb" }));

// Serve the CalorieCraft frontend from the same Render service.
app.use(express.static(path.join(__dirname, "..")));

const aiHits = new Map();
function aiRateLimit(req, res, next) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const max = Number(process.env.AI_REQUESTS_PER_HOUR || 10);
  const key = req.ip || "unknown";
  const hit = aiHits.get(key) || { count: 0, reset: now + windowMs };
  if (now > hit.reset) { hit.count = 0; hit.reset = now + windowMs; }
  hit.count += 1;
  aiHits.set(key, hit);
  if (hit.count > max) return res.status(429).json({ message: "AI meal limit reached. Please try again later." });
  next();
}

const PORT = Number(process.env.PORT || 5000);

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function calculateCalories({ age, gender, heightCm, weightKg, activity }) {
  const bmr = gender === "male"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const tdee = bmr * Number(activity);
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    loss: Math.round((tdee * 0.80) / 10) * 10,
    maintenance: Math.round(tdee / 10) * 10,
    gain: Math.round((tdee * 1.10) / 10) * 10
  };
}

function targetMacros(goal, weightKg, tdee) {
  let calories;
  let proteinMultiplier;
  if (goal === "weight_loss") { calories = tdee * 0.80; proteinMultiplier = 2.0; }
  else if (goal === "weight_gain" || goal === "muscle_gain") { calories = tdee * 1.10; proteinMultiplier = 2.0; }
  else { calories = tdee * 0.90; proteinMultiplier = 2.0; }

  calories = Math.round(calories / 10) * 10;
  const protein = Math.round(weightKg * proteinMultiplier);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (e) {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, email, password, gender = "other", age, heightCm, weightKg, activityLevel = 1.2 } = req.body;
    if (!fullName || !email || !password) return res.status(400).json({ message: "Name, email and password are required." });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) return res.status(409).json({ message: "Email is already registered." });

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (full_name,email,password_hash,gender,age,height_cm,current_weight_kg,activity_level)
       VALUES (?,?,?,?,?,?,?,?)`,
      [fullName, email, passwordHash, gender, age || null, heightCm || null, weightKg || null, activityLevel]
    );
    const user = { id: result.insertId, email, fullName };
    res.status(201).json({ user, token: signToken(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Registration failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!rows.length) return res.status(401).json({ message: "Invalid email or password." });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash || "");
    if (!valid) return res.status(401).json({ message: "Invalid email or password." });
    res.json({
      user: { id: user.id, fullName: user.full_name, email: user.email },
      token: signToken(user)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Login failed." });
  }
});

app.get("/api/me", authRequired, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id,full_name,email,gender,age,height_cm,current_weight_kg,activity_level,created_at FROM users WHERE id=?",
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ message: "User not found." });
  res.json(rows[0]);
});

app.put("/api/me", authRequired, async (req, res) => {
  const { fullName, gender, age, heightCm, weightKg, activityLevel } = req.body;
  await pool.query(
    `UPDATE users SET full_name=COALESCE(?,full_name), gender=COALESCE(?,gender),
     age=COALESCE(?,age), height_cm=COALESCE(?,height_cm),
     current_weight_kg=COALESCE(?,current_weight_kg), activity_level=COALESCE(?,activity_level)
     WHERE id=?`,
    [fullName, gender, age, heightCm, weightKg, activityLevel, req.user.id]
  );
  res.json({ message: "Profile updated." });
});

app.post("/api/calculator", authRequired, async (req, res) => {
  try {
    const result = calculateCalories(req.body);
    res.json(result);
  } catch {
    res.status(400).json({ message: "Invalid calculator inputs." });
  }
});

app.post("/api/goals", authRequired, async (req, res) => {
  try {
    const { goalType, targetWeightKg, age, gender, heightCm, weightKg, activityLevel } = req.body;
    const calc = calculateCalories({ age, gender, heightCm, weightKg, activity: activityLevel });
    const macros = targetMacros(goalType, weightKg, calc.tdee);
    await pool.query("UPDATE goals SET active=FALSE WHERE user_id=? AND active=TRUE", [req.user.id]);
    const [r] = await pool.query(
      `INSERT INTO goals (user_id,goal_type,target_weight_kg,calorie_target,protein_g,carbs_g,fat_g,start_date,active)
       VALUES (?,?,?,?,?,?,?,?,TRUE)`,
      [req.user.id, goalType, targetWeightKg, macros.calories, macros.protein, macros.carbs, macros.fat, new Date()]
    );
    res.status(201).json({ id: r.insertId, ...macros, tdee: calc.tdee });
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: "Could not create goal." });
  }
});

app.get("/api/goals/active", authRequired, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM goals WHERE user_id=? AND active=TRUE ORDER BY id DESC LIMIT 1", [req.user.id]);
  res.json(rows[0] || null);
});

app.post("/api/measurements", authRequired, async (req, res) => {
  const { loggedDate, weightKg, waistCm, chestCm, bicepsCm, forearmsCm, thighsCm, notes } = req.body;
  if (!loggedDate || !weightKg) return res.status(400).json({ message: "Date and weight are required." });
  await pool.query(
    `INSERT INTO body_measurements
     (user_id,logged_date,weight_kg,waist_cm,chest_cm,biceps_cm,forearms_cm,thighs_cm,notes)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE weight_kg=VALUES(weight_kg),waist_cm=VALUES(waist_cm),
     chest_cm=VALUES(chest_cm),biceps_cm=VALUES(biceps_cm),forearms_cm=VALUES(forearms_cm),
     thighs_cm=VALUES(thighs_cm),notes=VALUES(notes)`,
    [req.user.id, loggedDate, weightKg, waistCm, chestCm, bicepsCm, forearmsCm, thighsCm, notes]
  );
  await pool.query("UPDATE users SET current_weight_kg=? WHERE id=?", [weightKg, req.user.id]);
  res.status(201).json({ message: "Progress saved." });
});

app.get("/api/measurements", authRequired, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 52), 200);
  const [rows] = await pool.query(
    `SELECT logged_date,weight_kg,waist_cm,chest_cm,biceps_cm,forearms_cm,thighs_cm,notes
     FROM body_measurements WHERE user_id=? ORDER BY logged_date ASC LIMIT ${limit}`,
    [req.user.id]
  );
  res.json(rows);
});

app.put("/api/diet-preferences", authRequired, async (req, res) => {
  const { dietType, cuisine, likedFoods, allergies, dailyBudget, mealsPerDay } = req.body;
  await pool.query(
    `INSERT INTO diet_preferences (user_id,diet_type,cuisine,liked_foods,allergies,daily_budget,meals_per_day)
     VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE diet_type=VALUES(diet_type),cuisine=VALUES(cuisine),
     liked_foods=VALUES(liked_foods),allergies=VALUES(allergies),
     daily_budget=VALUES(daily_budget),meals_per_day=VALUES(meals_per_day)`,
    [req.user.id, dietType, cuisine, likedFoods, allergies, dailyBudget, mealsPerDay]
  );
  res.json({ message: "Diet preferences saved." });
});

app.post("/api/diet/generate", async (req, res) => {
  try {
    const {
      targetCalories, targetProtein, targetCarbs, targetFat,
      dietType = "vegetarian", cuisine = "Indian", likes = "",
      allergies = "", budget = 0, mealsPerDay = 4
    } = req.body;

    const target = {
      calories: Number(targetCalories), protein: Number(targetProtein),
      carbs: Number(targetCarbs), fat: Number(targetFat)
    };
    if (![target.calories, target.protein, target.carbs, target.fat].every(Number.isFinite)) {
      return res.status(400).json({ message: "Valid calorie and macro targets are required." });
    }

    const [foods] = await pool.query("SELECT * FROM foods ORDER BY id ASC");
    const plan = generatePlan({
      foods,
      target,
      dietType,
      cuisine,
      likes: Array.isArray(likes) ? likes : String(likes).split(/[,;|]/).filter(Boolean),
      allergies: Array.isArray(allergies) ? allergies : String(allergies).split(/[,;|]/).filter(Boolean),
      budget,
      mealsPerDay
    });
    res.json(plan);
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: e.message || "Could not generate meal plan." });
  }
});


app.post("/api/ai/meal-plan", aiRateLimit, async (req, res) => {
  try {
    const {
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      dietType = "Vegetarian",
      cuisine = "Indian",
      likedFoods = "",
      allergies = "",
      dailyBudget = 250,
      mealsPerDay = 4
    } = req.body;

    if (!targetCalories || !targetProtein || !targetCarbs || !targetFat) {
      return res.status(400).json({
        message: "Calories and all macro targets are required."
      });
    }

    const plan = await generateMealPlan({
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      dietType,
      cuisine,
      likedFoods,
      allergies,
      dailyBudget,
      mealsPerDay
    });

    res.json({
      provider: "Google Gemini",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generatedAt: new Date().toISOString(),
      plan
    });
  } catch (e) {
    console.error("AI meal generation error:", e.message);
    res.status(502).json({
      message: "AI meal generation failed.",
      detail: e.message
    });
  }
});

app.get("/api/foods", authRequired, async (req, res) => {
  const { dietType, cuisine, search } = req.query;
  let sql = "SELECT * FROM foods WHERE 1=1";
  const params = [];
  if (dietType) { sql += " AND diet_type=?"; params.push(dietType); }
  if (cuisine) { sql += " AND cuisine=?"; params.push(cuisine); }
  if (search) { sql += " AND name LIKE ?"; params.push(`%${search}%`); }
  sql += " ORDER BY name LIMIT 100";
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

app.post("/api/meal-plans", authRequired, async (req, res) => {
  const { goalId, planDate, targetCalories, targetProtein, targetCarbs, targetFat, estimatedCost, items = [] } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO meal_plans
       (user_id,goal_id,plan_date,target_calories,target_protein_g,target_carbs_g,target_fat_g,estimated_cost)
       VALUES (?,?,?,?,?,?,?,?)`,
      [req.user.id, goalId || null, planDate || new Date(), targetCalories, targetProtein, targetCarbs, targetFat, estimatedCost || null]
    );
    for (const item of items) {
      await conn.query(
        "INSERT INTO meal_plan_items (meal_plan_id,food_id,meal_type,servings) VALUES (?,?,?,?)",
        [r.insertId, item.foodId, item.mealType, item.servings || 1]
      );
    }
    await conn.commit();
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(400).json({ message: "Could not save meal plan." });
  } finally {
    conn.release();
  }
});

app.get("/api/meal-plans", authRequired, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT mp.*, mpi.meal_type, mpi.servings, f.name AS food_name,
      f.calories, f.protein_g, f.carbs_g, f.fat_g, f.estimated_cost
     FROM meal_plans mp
     LEFT JOIN meal_plan_items mpi ON mpi.meal_plan_id=mp.id
     LEFT JOIN foods f ON f.id=mpi.food_id
     WHERE mp.user_id=? ORDER BY mp.plan_date DESC, mp.id DESC LIMIT 50`,
    [req.user.id]
  );
  res.json(rows);
});

// SPA fallback. API routes above remain API-only.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.use((req, res) => res.status(404).json({ message: "Route not found." }));

testConnection()
  .then(() => app.listen(PORT, "0.0.0.0", () => console.log(`CalorieCraft running on port ${PORT}`)))
  .catch(err => {
    console.error("MySQL connection failed:", err.message);
    console.error("Check .env and make sure MySQL is running.");
    process.exit(1);
  });