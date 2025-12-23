const API_BASE = window.location.origin;

// Load initial data when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
});

// Load all data
async function loadAllData() {
    await loadAccountConfig();
    await loadIncome();
    await loadExpenses();
}

// Savings functions (kept for backward compatibility)
async function updateSavings() {
    const amount = parseFloat(document.getElementById('savings-amount').value);
    
    if (isNaN(amount) || amount < 0) {
        alert('Please enter a valid savings amount');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/savings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });
        
        if (response.ok) {
            await loadSavings();
            document.getElementById('savings-amount').value = '';
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        alert(`Error updating savings: ${error.message}`);
    }
}

async function loadSavings() {
    try {
        const response = await fetch(`${API_BASE}/api/savings`);
        const savings = await response.json();
        
        const display = document.getElementById('current-savings');
        if (display) {
            display.innerHTML = `Current Savings: $${formatNumber(savings.total_amount || 0)}`;
        }
    } catch (error) {
        console.error('Error loading savings:', error);
    }
}

// Account configuration functions
async function updateAccountConfig() {
    const checkingBalance = parseFloat(document.getElementById('checking-balance').value);
    const savingsBalance = parseFloat(document.getElementById('savings-balance').value);
    const transferFrequencyDays = parseInt(document.getElementById('transfer-frequency').value);
    const minCheckingBalance = parseFloat(document.getElementById('min-checking').value);
    const annualReturnRate = parseFloat(document.getElementById('annual-return-rate').value);
    
    if (isNaN(checkingBalance) || isNaN(savingsBalance)) {
        alert('Please enter valid account balances');
        return;
    }
    
    if (isNaN(transferFrequencyDays) || transferFrequencyDays < 1) {
        alert('Please enter a valid transfer frequency (minimum 1 day)');
        return;
    }
    
    if (!isNaN(annualReturnRate) && (annualReturnRate < 0 || annualReturnRate > 100)) {
        alert('Please enter a valid annual return rate between 0% and 100%');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/account-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                checkingBalance,
                savingsBalance,
                transferFrequencyDays,
                minCheckingBalance: isNaN(minCheckingBalance) ? 0 : minCheckingBalance,
                annualReturnRate: isNaN(annualReturnRate) ? 0 : annualReturnRate
            })
        });
        
        if (response.ok) {
            await loadAccountConfig();
            alert('Account configuration updated successfully');
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        alert(`Error updating account config: ${error.message}`);
    }
}

async function loadAccountConfig() {
    try {
        const response = await fetch(`${API_BASE}/api/account-config`);
        const config = await response.json();
        
        // Populate form fields
        document.getElementById('checking-balance').value = config?.checking_balance || 0;
        document.getElementById('savings-balance').value = config?.savings_balance || 0;
        document.getElementById('transfer-frequency').value = config?.transfer_frequency_days || 30;
        document.getElementById('min-checking').value = config?.min_checking_balance || 0;
        document.getElementById('annual-return-rate').value = config?.annual_return_rate || 0;
        
        // Display current balances
        const display = document.getElementById('current-balances');
        if (config) {
            display.innerHTML = `
                <div style="margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                    <strong>Current Configuration:</strong><br>
                    Checking: $${formatNumber(config.checking_balance || 0)}<br>
                    Savings: $${formatNumber(config.savings_balance || 0)}<br>
                    Annual Return Rate: ${(config.annual_return_rate || 0).toFixed(1)}%<br>
                    Transfer Frequency: ${config.transfer_frequency_days || 30} days<br>
                    Min Checking Balance: $${formatNumber(config.min_checking_balance || 0)}
                </div>
            `;
        } else {
            display.innerHTML = `
                <div style="margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                    <strong>No configuration set</strong><br>
                    Please enter your account balances above
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading account config:', error);
    }
}

// Income functions
async function addIncome() {
    const name = document.getElementById('income-name').value.trim();
    const amount = parseFloat(document.getElementById('income-amount').value);
    const day_of_month = parseInt(document.getElementById('income-day').value);
    
    if (!name || isNaN(amount) || isNaN(day_of_month)) {
        alert('Please fill in all income fields');
        return;
    }
    
    if (day_of_month < 1 || day_of_month > 31) {
        alert('Day of month must be between 1 and 31');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/income`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, amount, day_of_month })
        });
        
        if (response.ok) {
            await loadIncome();
            document.getElementById('income-name').value = '';
            document.getElementById('income-amount').value = '';
            document.getElementById('income-day').value = '';
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        alert(`Error adding income: ${error.message}`);
    }
}

async function loadIncome() {
    try {
        const response = await fetch(`${API_BASE}/api/income`);
        const incomeList = await response.json();
        
        const container = document.getElementById('income-list');
        
        if (incomeList.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center;">No income added yet</p>';
            return;
        }
        
        container.innerHTML = incomeList.map(income => `
            <div class="list-item income">
                <div class="list-item-info">
                    <div class="list-item-name">${escapeHtml(income.name)}</div>
                    <div class="list-item-details">
                        $${formatNumber(income.amount)} on day ${income.day_of_month} of each month
                    </div>
                </div>
                <button class="btn btn-delete" onclick="deleteIncome(${income.id})">Delete</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading income:', error);
    }
}

async function deleteIncome(id) {
    if (!confirm('Are you sure you want to delete this income?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/income/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadIncome();
        } else {
            alert('Error deleting income');
        }
    } catch (error) {
        alert(`Error deleting income: ${error.message}`);
    }
}

// Expense functions
async function addExpense() {
    const name = document.getElementById('expense-name').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const day_of_month = parseInt(document.getElementById('expense-day').value);
    
    if (!name || isNaN(amount) || isNaN(day_of_month)) {
        alert('Please fill in all expense fields');
        return;
    }
    
    if (day_of_month < 1 || day_of_month > 31) {
        alert('Day of month must be between 1 and 31');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, amount, day_of_month })
        });
        
        if (response.ok) {
            await loadExpenses();
            document.getElementById('expense-name').value = '';
            document.getElementById('expense-amount').value = '';
            document.getElementById('expense-day').value = '';
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        alert(`Error adding expense: ${error.message}`);
    }
}

async function loadExpenses() {
    try {
        const response = await fetch(`${API_BASE}/api/expenses`);
        const expenseList = await response.json();
        
        const container = document.getElementById('expense-list');
        
        if (expenseList.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center;">No expenses added yet</p>';
            return;
        }
        
        container.innerHTML = expenseList.map(expense => `
            <div class="list-item expense">
                <div class="list-item-info">
                    <div class="list-item-name">${escapeHtml(expense.name)}</div>
                    <div class="list-item-details">
                        $${formatNumber(expense.amount)} on day ${expense.day_of_month} of each month
                    </div>
                </div>
                <button class="btn btn-delete" onclick="deleteExpense(${expense.id})">Delete</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/expenses/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadExpenses();
        } else {
            alert('Error deleting expense');
        }
    } catch (error) {
        alert(`Error deleting expense: ${error.message}`);
    }
}

// Forecast functions
async function generateForecast() {
    const months = parseInt(document.getElementById('forecast-months').value);
    
    if (isNaN(months) || months < 1 || months > 120) {
        alert('Please enter a valid number of months (1-120)');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/forecast?months=${months}`);
        const forecast = await response.json();
        
        displayForecastSummary(forecast.summary);
        displayForecastEvents(forecast.events);
        
        // Show forecast sections
        document.getElementById('forecast-summary').style.display = 'block';
        document.getElementById('forecast-events').style.display = 'block';
        
        // Scroll to forecast
        document.getElementById('forecast-summary').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        alert(`Error generating forecast: ${error.message}`);
    }
}

function displayForecastSummary(summary) {
    const container = document.getElementById('summary-content');
    
    let warningHtml = '';
    if (summary.monthlyNetCashFlow < 0) {
        warningHtml = `
            <div class="alert alert-warning">
                ⚠️ <strong>Warning:</strong> Your monthly expenses exceed your income by 
                $${formatNumber(Math.abs(summary.monthlyNetCashFlow))}. 
                You may need transfers from savings to checking.
            </div>
        `;
    }
    
    if (summary.savingsDepletionMonth) {
        warningHtml += `
            <div class="alert alert-danger">
                🚨 <strong>Critical:</strong> Your savings are projected to be depleted by 
                ${formatDate(summary.savingsDepletionMonth)}. 
                Consider reducing expenses or increasing income.
            </div>
        `;
    }
    
    container.innerHTML = `
        ${warningHtml}
        <div class="alert" style="background: #e3f2fd; border: 1px solid #2196f3; padding: 10px; margin-bottom: 15px;">
            📅 <strong>Starting from:</strong> ${formatDate(summary.startDate)}
        </div>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-label">Starting Checking Balance</div>
                <div class="summary-value">$${formatNumber(summary.startingCheckingBalance || 0)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Starting Savings Balance</div>
                <div class="summary-value">$${formatNumber(summary.startingSavingsBalance || 0)}</div>
            </div>
            <div class="summary-item summary-positive">
                <div class="summary-label">Total Income (${summary.monthsForecasted} months)</div>
                <div class="summary-value">$${formatNumber(summary.totalIncome)}</div>
            </div>
            <div class="summary-item summary-negative">
                <div class="summary-label">Total Expenses (${summary.monthsForecasted} months)</div>
                <div class="summary-value">$${formatNumber(summary.totalExpenses)}</div>
            </div>
            <div class="summary-item ${summary.monthlyNetCashFlow >= 0 ? 'summary-positive' : 'summary-negative'}">
                <div class="summary-label">Monthly Net Cash Flow</div>
                <div class="summary-value">$${formatNumber(summary.monthlyNetCashFlow)}</div>
            </div>
            <div class="summary-item summary-positive">
                <div class="summary-label">Total Investment Returns</div>
                <div class="summary-value">$${formatNumber(summary.totalInvestmentReturns || 0)}</div>
            </div>
            <div class="summary-item summary-warning">
                <div class="summary-label">Total Transfers from Savings</div>
                <div class="summary-value">$${formatNumber(summary.totalTransfers || 0)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Ending Checking Balance</div>
                <div class="summary-value">$${formatNumber(summary.endingCheckingBalance || 0)}</div>
            </div>
            <div class="summary-item ${(summary.endingSavingsBalance || 0) > 0 ? 'summary-positive' : 'summary-negative'}">
                <div class="summary-label">Ending Savings Balance</div>
                <div class="summary-value">$${formatNumber(summary.endingSavingsBalance || 0)}</div>
            </div>
        </div>
    `;
}

function displayForecastEvents(events) {
    const tbody = document.getElementById('events-tbody');
    
    tbody.innerHTML = events.map(event => {
        const isTransfer = event.transferAmount && event.transferAmount > 0;
        const isInvestmentReturn = event.type === 'investment_return';
        const rowClass = isTransfer ? 'class="withdrawal-highlight"' : '';
        
        // Map event type to display type with special handling for investment_return
        let typeClass = '';
        let typeDisplay = '';
        if (isInvestmentReturn) {
            typeClass = 'type-income';
            typeDisplay = 'Investment Return';
        } else if (event.type === 'income') {
            typeClass = 'type-income';
            typeDisplay = 'Income';
        } else {
            typeClass = 'type-expense';
            typeDisplay = 'Expense';
        }
        
        return `
            <tr ${rowClass}>
                <td>${formatDate(event.date)}</td>
                <td class="${typeClass}">
                    ${typeDisplay}
                </td>
                <td>${escapeHtml(event.name)}</td>
                <td class="${event.amount >= 0 ? 'amount-positive' : 'amount-negative'}">
                    $${formatNumber(event.amount)}
                </td>
                <td>$${formatNumber(event.checkingBalanceAfter || 0)}</td>
                <td>$${formatNumber(event.savingsBalanceAfter || 0)}</td>
                <td>${isTransfer ? '$' + formatNumber(event.transferAmount) : '-'}</td>
            </tr>
        `;
    }).join('');
}

// Utility functions
function formatNumber(num) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
