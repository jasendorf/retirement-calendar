const API_BASE = window.location.origin;

// Load initial data when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
});

// Load all data
async function loadAllData() {
    await loadSavings();
    await loadIncome();
    await loadExpenses();
}

// Savings functions
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
        display.innerHTML = `Current Savings: $${formatNumber(savings.total_amount || 0)}`;
    } catch (error) {
        console.error('Error loading savings:', error);
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
                You will need to make withdrawals from savings.
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
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-label">Starting Savings</div>
                <div class="summary-value">$${formatNumber(summary.startingSavings)}</div>
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
            <div class="summary-item summary-warning">
                <div class="summary-label">Total Withdrawals Needed</div>
                <div class="summary-value">$${formatNumber(summary.totalWithdrawals)}</div>
            </div>
            <div class="summary-item ${summary.savingsRemaining > 0 ? 'summary-positive' : 'summary-negative'}">
                <div class="summary-label">Savings Remaining</div>
                <div class="summary-value">$${formatNumber(summary.savingsRemaining)}</div>
            </div>
        </div>
    `;
}

function displayForecastEvents(events) {
    const tbody = document.getElementById('events-tbody');
    
    tbody.innerHTML = events.map(event => `
        <tr ${event.withdrawal > 0 ? 'class="withdrawal-highlight"' : ''}>
            <td>${formatDate(event.date)}</td>
            <td class="${event.type === 'income' ? 'type-income' : 'type-expense'}">
                ${event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </td>
            <td>${escapeHtml(event.name)}</td>
            <td class="${event.amount >= 0 ? 'amount-positive' : 'amount-negative'}">
                $${formatNumber(event.amount)}
            </td>
            <td>$${formatNumber(event.balanceAfter)}</td>
            <td>${event.withdrawal > 0 ? '$' + formatNumber(event.withdrawal) : '-'}</td>
            <td class="${event.savingsRemaining < 0 ? 'amount-negative' : ''}">
                $${formatNumber(event.savingsRemaining)}
            </td>
        </tr>
    `).join('');
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
