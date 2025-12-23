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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checking_balance REAL NOT NULL DEFAULT 0,
            savings_balance REAL NOT NULL DEFAULT 0,
            transfer_frequency_days INTEGER NOT NULL DEFAULT 30,
            min_checking_balance REAL NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  // Expense operations
  addExpense(name, amount, dayOfMonth) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO expenses (name, amount, day_of_month) VALUES (?, ?, ?)',
        [name, amount, dayOfMonth],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, name, amount, day_of_month: dayOfMonth });
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
  addIncome(name, amount, dayOfMonth) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO income (name, amount, day_of_month) VALUES (?, ?, ?)',
        [name, amount, dayOfMonth],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, name, amount, day_of_month: dayOfMonth });
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
  setAccountConfig(checkingBalance, savingsBalance, transferFrequencyDays, minCheckingBalance) {
    return new Promise((resolve, reject) => {
      // First, check if a config record exists
      this.db.get('SELECT * FROM account_config ORDER BY id DESC LIMIT 1', (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          // Update existing record
          this.db.run(
            `UPDATE account_config 
             SET checking_balance = ?, savings_balance = ?, transfer_frequency_days = ?, 
                 min_checking_balance = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [checkingBalance, savingsBalance, transferFrequencyDays, minCheckingBalance, row.id],
            (err) => {
              if (err) reject(err);
              else resolve({
                id: row.id,
                checking_balance: checkingBalance,
                savings_balance: savingsBalance,
                transfer_frequency_days: transferFrequencyDays,
                min_checking_balance: minCheckingBalance
              });
            }
          );
        } else {
          // Insert new record
          this.db.run(
            `INSERT INTO account_config 
             (checking_balance, savings_balance, transfer_frequency_days, min_checking_balance) 
             VALUES (?, ?, ?, ?)`,
            [checkingBalance, savingsBalance, transferFrequencyDays, minCheckingBalance],
            function(err) {
              if (err) reject(err);
              else resolve({
                id: this.lastID,
                checking_balance: checkingBalance,
                savings_balance: savingsBalance,
                transfer_frequency_days: transferFrequencyDays,
                min_checking_balance: minCheckingBalance
              });
            }
          );
        }
      });
    });
  }

  getAccountConfig() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM account_config ORDER BY id DESC LIMIT 1', (err, row) => {
        if (err) reject(err);
        else resolve(row || {
          checking_balance: 0,
          savings_balance: 0,
          transfer_frequency_days: 30,
          min_checking_balance: 0
        });
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
