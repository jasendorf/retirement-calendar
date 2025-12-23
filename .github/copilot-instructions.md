# GitHub Copilot Instructions for Retirement Calendar

## Project Overview

Retirement Calendar is a web-based financial forecasting application that helps users plan retirement spending when income is lower than expenses. The application tracks income sources, expenses, and savings, then generates detailed forecasts showing when savings withdrawals will be needed.

## Technology Stack

- **Backend**: Node.js with Express framework
- **Database**: SQLite3 for persistent data storage
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (no frameworks)
- **Deployment**: Docker support with docker-compose
- **Security**: Express rate limiting middleware

## Project Structure

```
retirement-calendar/
├── server.js              # Main Express server and API routes
├── src/
│   ├── database.js        # SQLite database operations and schema
│   └── forecasting.js     # Financial forecasting logic
├── public/
│   ├── index.html         # Main UI
│   ├── app.js             # Client-side JavaScript
│   └── styles.css         # Styling
├── data/                  # SQLite database files (created at runtime)
├── Dockerfile             # Container configuration
└── docker-compose.yml     # Docker orchestration
```

## Code Style and Conventions

### General Guidelines

- Use `const` for constants and `let` for variables; avoid `var`
- Use single quotes for strings in JavaScript
- Use camelCase for variable and function names
- Use snake_case for database column names
- Include JSDoc comments for public functions
- Use async/await for asynchronous operations, not callbacks
- Handle errors properly with try-catch blocks in async functions

### Backend Patterns

- All API routes are defined in `server.js` with `/api/` prefix
- Database operations are isolated in `src/database.js` using a Database class
- Use Express async/await route handlers with proper error responses
- Return appropriate HTTP status codes (200, 201, 400, 404, 500)
- Validate input parameters before processing
- Database methods return Promises and use SQLite3's promisified API

### Frontend Patterns

- Use vanilla JavaScript (no frameworks like React, Vue, or Angular)
- Use `fetch` API for HTTP requests with async/await
- API base URL is derived from `window.location.origin`
- Use `getElementById` and DOM manipulation for UI updates
- Format numbers for display using the `formatNumber()` helper function
- Show user-friendly alerts for errors
- Load data on `DOMContentLoaded` event

### Database Conventions

- Database file location: `data/retirement.db` (or `DB_PATH` env var)
- Tables: `expenses`, `income`, `savings`, `account_config`
- Use INTEGER PRIMARY KEY AUTOINCREMENT for IDs
- Use REAL for monetary amounts
- Use INTEGER for day_of_month (1-31)
- Include `created_at` timestamp with DEFAULT CURRENT_TIMESTAMP

## API Endpoints

All endpoints follow RESTful conventions:

- `GET /api/data` - Retrieve all data (expenses, income, savings, account config)
- `POST /api/expenses` - Create an expense
- `GET /api/expenses` - List all expenses
- `DELETE /api/expenses/:id` - Delete an expense by ID
- `POST /api/income` - Create an income source
- `GET /api/income` - List all income sources
- `DELETE /api/income/:id` - Delete an income source by ID
- `POST /api/savings` - Update total savings (legacy)
- `GET /api/savings` - Get current savings (legacy)
- `POST /api/account-config` - Update account configuration (checking, savings)
- `GET /api/account-config` - Get account configuration
- `GET /api/forecast?months=12` - Generate financial forecast

## Development Workflow

### Running Locally

```bash
npm install
npm start
# Server runs on http://localhost:3000
```

### Running with Docker

```bash
docker-compose up -d
# Access at http://localhost:3000
```

### Environment Variables

- `PORT` - Server port (default: 3000)
- `DB_PATH` - SQLite database file path (default: `./data/retirement.db`)

## Testing Considerations

- Currently no automated test suite (test script exits with error)
- Manual testing should cover all API endpoints
- Test with various month ranges (1-120) for forecasting
- Verify data persistence across server restarts
- Test rate limiting (100 requests per 15 minutes per IP)

## Important Notes

### Data Persistence

- SQLite database is stored in `data/` directory
- In Docker, use named volumes (`retirement-data`) for persistence
- Database is created automatically on first run
- Backup instructions are in README.md

### Security

- Rate limiting is enabled (100 requests per 15 minutes)
- Input validation is performed on all POST endpoints
- CORS is enabled for development (consider restricting in production)
- No authentication/authorization implemented yet

### Financial Forecasting Logic

- Located in `src/forecasting.js`
- Supports legacy single-savings mode and new checking/savings split
- Generates chronological events (income, expenses, transfers)
- Calculates running balance and identifies when transfers are needed
- Transfer frequency and minimum checking balance are configurable

## Common Tasks

### Adding a New API Endpoint

1. Add route handler in `server.js` following RESTful conventions
2. Use async/await for database operations
3. Validate input parameters and return 400 for bad requests
4. Use try-catch for error handling and return 500 for server errors
5. Test manually with curl or Postman

### Adding a New Database Table

1. Add CREATE TABLE statement in `database.js` `createTables()` method
2. Add methods for CRUD operations in the Database class
3. Use parameterized queries to prevent SQL injection
4. Return Promises that resolve to the data or reject with errors

### Modifying the Forecasting Algorithm

1. Edit `src/forecasting.js` `generateForecast()` function
2. Maintain backward compatibility with legacy format
3. Ensure all events are sorted chronologically
4. Calculate running balances accurately
5. Test with various scenarios (surplus, deficit, mixed)

## Dependencies

Keep dependencies minimal and only add when necessary:

- `express` - Web framework
- `body-parser` - JSON request parsing
- `cors` - Cross-origin resource sharing
- `express-rate-limit` - Rate limiting
- `sqlite3` - Database driver

## Best Practices

- Keep the application simple and maintainable
- Avoid adding frameworks or complex dependencies
- Write clear, self-documenting code
- Handle edge cases (invalid dates, negative amounts, etc.)
- Ensure data validation on both client and server
- Keep frontend and backend loosely coupled via REST API
- Document any major changes in README.md
