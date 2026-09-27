const { GoogleGenAI } = require("@google/genai");

const mealPlanSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    meals: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          meal_type: {
            type: "string",
            enum: ["breakfast", "lunch", "snack", "dinner", "other"]
          },
          meal_name: { type: "string" },
          foods: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                calories: { type: "number" },
                protein_g: { type: "number" },
                carbs_g: { type: "number" },
                fat_g: { type: "number" }
              },
              required: ["name", "quantity", "calories", "protein_g", "carbs_g", "fat_g"]
            }
          },
          meal_calories: { type: "number" },
          meal_protein_g: { type: "number" },
          meal_carbs_g: { type: "number" },
          meal_fat_g: { type: "number" },
          estimated_cost_inr: { type: "number" }
        },
        required: [
          "meal_type", "meal_name", "foods", "meal_calories",
          "meal_protein_g", "meal_carbs_g", "meal_fat_g", "estimated_cost_inr"
        ]
      }
    },
    totals: {
      type: "object",
      properties: {
        calories: { type: "number" },
        protein_g: { type: "number" },
        carbs_g: { type: "number" },
        fat_g: { type: "number" },
        estimated_cost_inr: { type: "number" }
      },
      required: ["calories", "protein_g", "carbs_g", "fat_g", "estimated_cost_inr"]
    }
  },
  required: ["summary", "meals", "totals"]
};

function buildPrompt(input) {
  return `
You are the meal-planning engine for CalorieCraft.

Create a practical one-day meal plan from the user's constraints.

TARGETS:
Calories: ${input.targetCalories} kcal
Protein: ${input.targetProtein} g
Carbohydrates: ${input.targetCarbs} g
Fat: ${input.targetFat} g

USER:
Diet: ${input.dietType}
Cuisine/region: ${input.cuisine}
Daily budget: ₹${input.dailyBudget}
Meals per day: ${input.mealsPerDay}
Foods the user likes: ${input.likedFoods || "none specified"}
Foods/allergens to avoid: ${input.allergies || "none specified"}

RULES:
1. Respect the diet type and exclusions.
2. Prefer foods common to the requested cuisine/region.
3. Keep the total close to the calorie and macro targets.
4. Respect the daily budget as closely as possible.
5. Use realistic food quantities and familiar household units where useful.
6. Do not invent supplements or medical treatments.
7. Nutrition values and costs are estimates unless supplied by a verified nutrition database.
8. Return ONLY JSON matching the supplied schema.
9. If the budget makes the targets difficult, make the cheapest reasonable substitutions and explain the tradeoff in summary.
`;
}

async function generateMealPlan(input) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const response = await ai.models.generateContent({
    model,
    contents: buildPrompt(input),
    config: {
      responseMimeType: "application/json",
      responseSchema: mealPlanSchema,
      temperature: 0.4
    }
  });

  if (!response.text) throw new Error("AI returned an empty response.");

  const result = JSON.parse(response.text);
  return result;
}

module.exports = { generateMealPlan };