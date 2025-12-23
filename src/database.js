const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'retirement.db');

class Database {
  constructor() {
    this.db = null;
  }

  initialize() {
    return new Promise((resolve, reject) => {
      // Ensure data directory exists
      const fs = require('fs');
      const dataDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Table for expenses
        this.db.run(`
          CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            day_of_month INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Table for income
        this.db.run(`
          CREATE TABLE IF NOT EXISTS income (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            day_of_month INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Table for savings
        this.db.run(`
          CREATE TABLE IF NOT EXISTS savings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total_amount REAL NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Table for account configuration
        this.db.run(`
          CREATE TABLE IF NOT EXISTS account_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            checking_balance REAL NOT NULL DEFAULT 0,
            savings_balance REAL NOT NULL DEFAULT 0,
            transfer_frequency_days INTEGER NOT NULL DEFAULT 30,
            min_checking_balance REAL NOT NULL DEFAULT 0,
            annual_return_rate REAL NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            // Run migrations to add new columns if they don't exist
            this.db.run(`
              ALTER TABLE account_config ADD COLUMN annual_return_rate REAL DEFAULT 0
            `, (err) => {
              // Ignore error if column already exists
            });
            
            this.db.run(`
              ALTER TABLE account_config ADD COLUMN start_date TEXT DEFAULT NULL
            `, (err) => {
              // Ignore error if column already exists
            });
            
            this.db.run(`
              ALTER TABLE expenses ADD COLUMN annual_increase_rate REAL DEFAULT 0
            `, (err) => {
              // Ignore error if column already exists
            });
            
            this.db.run(`
              ALTER TABLE income ADD COLUMN annual_increase_rate REAL DEFAULT 0
            `, (err) => {
              // Ignore error if column already exists
              resolve();
            });
          }
        });
      });
    });
  }

  // Expense operations
  addExpense(name, amount, dayOfMonth, annualIncreaseRate = 0) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO expenses (name, amount, day_of_month, annual_increase_rate) VALUES (?, ?, ?, ?)',
        [name, amount, dayOfMonth, annualIncreaseRate],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, name, amount, day_of_month: dayOfMonth, annual_increase_rate: annualIncreaseRate });
        }
      );
    });
  }

  getAllExpenses() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM expenses ORDER BY day_of_month', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  deleteExpense(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM expenses WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Income operations
  addIncome(name, amount, dayOfMonth, annualIncreaseRate = 0) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO income (name, amount, day_of_month, annual_increase_rate) VALUES (?, ?, ?, ?)',
        [name, amount, dayOfMonth, annualIncreaseRate],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, name, amount, day_of_month: dayOfMonth, annual_increase_rate: annualIncreaseRate });
        }
      );
    });
  }

  getAllIncome() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM income ORDER BY day_of_month', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  deleteIncome(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM income WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Savings operations
  setSavings(amount) {
    return new Promise((resolve, reject) => {
      // First, check if a savings record exists
      this.db.get('SELECT * FROM savings ORDER BY id DESC LIMIT 1', (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          // Update existing record
          this.db.run(
            'UPDATE savings SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [amount, row.id],
            (err) => {
              if (err) reject(err);
              else resolve({ id: row.id, total_amount: amount });
            }
          );
        } else {
          // Insert new record
          this.db.run(
            'INSERT INTO savings (total_amount) VALUES (?)',
            [amount],
            function(err) {
              if (err) reject(err);
              else resolve({ id: this.lastID, total_amount: amount });
            }
          );
        }
      });
    });
  }

  getSavings() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM savings ORDER BY id DESC LIMIT 1', (err, row) => {
        if (err) reject(err);
        else resolve(row || { total_amount: 0 });
      });
    });
  }

  // Account configuration operations
  setAccountConfig(checkingBalance, savingsBalance, transferFrequencyDays, minCheckingBalance, annualReturnRate, startDate = null) {
    return new Promise((resolve, reject) => {
      // First, check if a config record exists
      this.db.get('SELECT * FROM account_config WHERE id = 1', (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          // Update existing record
          this.db.run(
            `UPDATE account_config 
             SET checking_balance = ?, savings_balance = ?, transfer_frequency_days = ?, 
                 min_checking_balance = ?, annual_return_rate = ?, start_date = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = 1`,
            [checkingBalance, savingsBalance, transferFrequencyDays, minCheckingBalance, annualReturnRate || 0, startDate],
            (err) => {
              if (err) reject(err);
              else resolve({
                id: 1,
                checking_balance: checkingBalance,
                savings_balance: savingsBalance,
                transfer_frequency_days: transferFrequencyDays,
                min_checking_balance: minCheckingBalance,
                annual_return_rate: annualReturnRate || 0,
                start_date: startDate
              });
            }
          );
        } else {
          // Insert new record with id=1
          this.db.run(
            `INSERT INTO account_config 
             (id, checking_balance, savings_balance, transfer_frequency_days, min_checking_balance, annual_return_rate, start_date) 
             VALUES (1, ?, ?, ?, ?, ?, ?)`,
            [checkingBalance, savingsBalance, transferFrequencyDays, minCheckingBalance, annualReturnRate || 0, startDate],
            function(err) {
              if (err) reject(err);
              else resolve({
                id: 1,
                checking_balance: checkingBalance,
                savings_balance: savingsBalance,
                transfer_frequency_days: transferFrequencyDays,
                min_checking_balance: minCheckingBalance,
                annual_return_rate: annualReturnRate || 0,
                start_date: startDate
              });
            }
          );
        }
      });
    });
  }

  getAccountConfig() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM account_config WHERE id = 1', (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = new Database();
