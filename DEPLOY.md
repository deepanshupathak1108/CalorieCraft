# CalorieCraft — Direct Deployment Guide

This package is configured as a **single Render web service**: Express serves both the frontend and `/api`. You only need a MySQL database (Railway is a simple option) and a Gemini API key.

## 1. Push this folder to GitHub

Do NOT commit `.env` or any API key. The included `.gitignore` protects them.

## 2. Create the MySQL database

Create a MySQL 8+ database on Railway (or another managed MySQL provider). Run `schema.sql`, then run `backend/seed.sql`. If your provider already selects the database, remove the first two lines (`CREATE DATABASE...` and `USE caloriecraft`) from `schema.sql` before running it.

## 3. Deploy to Render

Create a new **Web Service** from the GitHub repository. Render will detect `render.yaml`, or use:

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

Set these environment variables in Render:

```
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
JWT_SECRET=<long-random-secret>
GEMINI_API_KEY=<your-gemini-key>
GEMINI_MODEL=gemini-2.5-flash
AI_REQUESTS_PER_HOUR=10
CORS_ORIGIN=*
```

After deployment, Render gives you a URL such as `https://caloriecraft.onrender.com`. Open that URL — the frontend and API are served from the same domain.

## 4. Test

Open:

`https://YOUR-RENDER-URL/api/health`

Expected response:

```json
{"status":"ok","database":"connected"}
```

Then open the main Render URL and use **Diet Planner → Generate Plan**. The app first asks Gemini for a structured meal plan. If Gemini is unavailable, it falls back to the server-side food database optimizer.

## Important production notes

- Never put `GEMINI_API_KEY` in frontend JavaScript.
- The AI values are estimates; for a serious nutrition product, validate final calories/macros against a trusted food database before presenting them as verified facts.
- The current in-memory AI rate limiter resets when the service restarts; for high traffic, replace it with a shared Redis/database rate limiter.
- Render free services may sleep after inactivity, so the first request after idle can be slower.
