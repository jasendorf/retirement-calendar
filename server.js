const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const database = require('./src/database');
const { generateForecast } = require('./src/forecasting');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(limiter);
app.use(express.static('public'));

// Initialize database
database.initialize()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// API Routes

// Get all data
app.get('/api/data', async (req, res) => {
  try {
    const expenses = await database.getAllExpenses();
    const income = await database.getAllIncome();
    const savings = await database.getSavings();
    
    res.json({
      expenses,
      income,
      savings: savings.total_amount || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Expense routes
app.post('/api/expenses', async (req, res) => {
  try {
    const { name, amount, day_of_month } = req.body;
    
    if (!name || !amount || !day_of_month) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (day_of_month < 1 || day_of_month > 31) {
      return res.status(400).json({ error: 'Day of month must be between 1 and 31' });
    }
    
    const expense = await database.addExpense(name, amount, day_of_month);
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await database.getAllExpenses();
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await database.deleteExpense(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Income routes
app.post('/api/income', async (req, res) => {
  try {
    const { name, amount, day_of_month } = req.body;
    
    if (!name || !amount || !day_of_month) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (day_of_month < 1 || day_of_month > 31) {
      return res.status(400).json({ error: 'Day of month must be between 1 and 31' });
    }
    
    const income = await database.addIncome(name, amount, day_of_month);
    res.status(201).json(income);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/income', async (req, res) => {
  try {
    const income = await database.getAllIncome();
    res.json(income);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/income/:id', async (req, res) => {
  try {
    await database.deleteIncome(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Savings routes
app.post('/api/savings', async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Amount is required' });
    }
    
    const savings = await database.setSavings(amount);
    res.json(savings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/savings', async (req, res) => {
  try {
    const savings = await database.getSavings();
    res.json(savings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forecast route
app.get('/api/forecast', async (req, res) => {
  try {
    const monthsToForecast = parseInt(req.query.months) || 12;
    
    if (monthsToForecast < 1 || monthsToForecast > 120) {
      return res.status(400).json({ error: 'Months must be between 1 and 120' });
    }
    
    const expenses = await database.getAllExpenses();
    const income = await database.getAllIncome();
    const savings = await database.getSavings();
    
    const forecast = generateForecast(
      expenses,
      income,
      savings.total_amount || 0,
      monthsToForecast
    );
    
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Retirement Calendar API running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  database.close()
    .then(() => {
      console.log('Database connection closed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error closing database:', err);
      process.exit(1);
    });
});
