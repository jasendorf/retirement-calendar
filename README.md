# Retirement Calendar

A web-based application that helps forecast retirement financial spending, particularly when income is lower than outflow and withdrawals from savings are required.

## Features

- **💰 Track Monthly Income**: Record recurring income sources with specific dates
- **💳 Track Monthly Expenses**: Record recurring expenses with specific dates
- **📊 Savings Management**: Set and track total savings balance
- **🔮 Financial Forecasting**: Generate detailed forecasts showing:
  - Balance after each transaction
  - When savings withdrawals will be needed
  - Total withdrawals required
  - Remaining savings over time
  - Warning alerts when savings may be depleted
- **🐳 Docker Support**: Run in a container with persistent data storage
- **💾 Persistent Storage**: SQLite database ensures your data is saved

## Quick Start

### Local Development (Recommended)

The easiest way to run the application:

```bash
# Clone the repository
git clone https://github.com/jasendorf/retirement-calendar.git
cd retirement-calendar

# Install dependencies
npm install

# Start the server
npm start

# Access the application at http://localhost:3000
```

## Docker Deployment (Optional)

### Using Docker Compose

```bash
# Start the application
docker-compose up -d

# Access the application at http://localhost:3000
```

### Using Docker directly

```bash
# Build the image
docker build -t retirement-calendar .

# Run the container with a persistent volume
docker run -d \
  -p 3000:3000 \
  -v retirement-data:/app/data \
  --name retirement-calendar \
  retirement-calendar

# Access the application at http://localhost:3000
```

## Installation

### Prerequisites

- Node.js 18 or higher
- npm

### Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# Access the application at http://localhost:3000
```

## Usage

1. **Set Your Savings**: Enter your current total savings amount
2. **Add Income Sources**: 
   - Enter the name (e.g., "Social Security")
   - Amount received monthly
   - Day of the month it arrives
3. **Add Expenses**:
   - Enter the name (e.g., "Mortgage")
   - Amount due monthly
   - Day of the month it's due
4. **Generate Forecast**:
   - Choose how many months to forecast (1-120 months)
   - View the detailed forecast showing:
     - All income and expense events chronologically
     - Balance after each event
     - Savings withdrawals when needed
     - Summary statistics and warnings

## API Endpoints

The application provides a REST API:

- `GET /api/data` - Get all data (expenses, income, savings)
- `POST /api/expenses` - Add an expense
- `GET /api/expenses` - Get all expenses
- `DELETE /api/expenses/:id` - Delete an expense
- `POST /api/income` - Add income
- `GET /api/income` - Get all income
- `DELETE /api/income/:id` - Delete income
- `POST /api/savings` - Set savings amount
- `GET /api/savings` - Get current savings
- `GET /api/forecast?months=12` - Generate forecast

## Data Persistence

The application uses SQLite for data storage. When running in Docker, the database is stored in a named volume (`retirement-data`) that persists across container restarts and rebuilds.

### Backup Your Data

To backup your data when using Docker:

```bash
docker run --rm -v retirement-data:/data -v $(pwd):/backup alpine tar czf /backup/retirement-data-backup.tar.gz -C /data .
```

### Restore Data

```bash
docker run --rm -v retirement-data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/retirement-data-backup.tar.gz"
```

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Containerization**: Docker

## License

ISC
