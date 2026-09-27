# AI Meal Generator

CalorieCraft can generate meal plans through a server-side AI provider.

## Current provider
Google Gemini through the official `@google/genai` JavaScript SDK.

Gemini structured output is used so the API receives predictable JSON rather than free-form text.

## Setup

From `backend/`:

```bash
npm install
```

Create `.env` from `.env.example`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Then:

```bash
npm run dev
```

## Endpoint

```http
POST /api/ai/meal-plan
Authorization: Bearer YOUR_JWT
Content-Type: application/json
```

Example body:

```json
{
  "targetCalories": 2650,
  "targetProtein": 165,
  "targetCarbs": 330,
  "targetFat": 75,
  "dietType": "Vegetarian",
  "cuisine": "Indian",
  "likedFoods": "paneer, rice, dal, curd",
  "allergies": "peanuts",
  "dailyBudget": 250,
  "mealsPerDay": 4
}
```

## Architecture

```text
Browser
  ↓
CalorieCraft Express API
  ↓
Gemini
  ↓
Structured JSON meal plan
  ↓
CalorieCraft validation / display
```

The API key stays on the backend and is never placed in frontend JavaScript.

## Nutrition accuracy

AI-generated nutrition and cost values are estimates. For production nutrition tracking, the next layer should validate each food against a trusted nutrition database and recalculate totals server-side rather than trusting model-provided numbers.
