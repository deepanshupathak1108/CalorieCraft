# CalorieCraft Backend

## Requirements
- Node.js 18+
- MySQL 8+

## Setup
1. Create the database using `../schema.sql`.
2. Insert sample foods using `seed.sql`.
3. Copy `.env.example` to `.env`.
4. Fill in your MySQL credentials and a strong JWT secret.
5. Run:

```bash
npm install
npm run dev
```

API runs at `http://localhost:5000`.

## Main endpoints

### Authentication
POST `/api/auth/register`
POST `/api/auth/login`
GET `/api/me`
PUT `/api/me`

### Calculator
POST `/api/calculator`

### Goals
POST `/api/goals`
GET `/api/goals/active`

### Progress
POST `/api/measurements`
GET `/api/measurements`

### Diet
PUT `/api/diet-preferences`
GET `/api/foods`
POST `/api/meal-plans`
GET `/api/meal-plans`

Protected routes require:
`Authorization: Bearer <JWT>`

## Security
- Passwords are hashed with bcrypt.
- JWT is used for API authentication.
- Never commit `.env`.
- Use HTTPS in production.
- Add rate limiting, validation, secure cookies, and CSRF protection before production deployment.
