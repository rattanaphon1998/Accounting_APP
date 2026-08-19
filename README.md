# Accounting App

Web application for recording income and expenses, with account registration and date-based transaction search.

## Requirements

- Node.js 20 or later
- MySQL 8 or later
- A database named `expense_tracker` (or set `DB_NAME`)

## Configuration

Copy `.env.example` to `.env`, then set a long random value for `AUTH_TOKEN_SECRET` and your MySQL credentials. Do not commit `.env`.

For local PowerShell use, load the values into the current session before starting the API. For example:

```powershell
$env:AUTH_TOKEN_SECRET = 'replace-with-a-long-random-secret'
$env:DB_PASSWORD = 'your-mysql-password'
```

`VITE_API_URL` is compiled into the frontend. Set it to the public URL of the deployed API before running a production build.

## Run locally

Start the API in one terminal:

```powershell
npm run server
```

Start the frontend in another terminal:

```powershell
npm run dev
```

The API automatically creates the `users` and `transactions` tables when it can connect to MySQL.

## Checks

```powershell
npm run lint
npm run build
```

## Deployment note

GitHub Pages can host only the frontend. Deploy `server.js` and MySQL separately, configure its allowed `CORS_ORIGIN`, and set `VITE_API_URL` to that API address when building the frontend.
