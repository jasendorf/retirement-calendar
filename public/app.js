const API_BASE = window.location.origin;

// Tab switching function
function switchTab(event, tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Deactivate all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Activate selected tab button
    event.target.classList.add('active');
    
    // Scroll to top when switching tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Helper function to switch tabs programmatically
function switchTabByName(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Deactivate all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Activate selected tab button
    document.querySelectorAll('.tab-button').forEach(button => {
        if (button.textContent.trim().toLowerCase() === tabName) {
            button.classList.add('active');
        }
    });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Generate forecast and switch to forecast tab
async function generateAndSwitchToForecast() {
    const months = parseInt(document.getElementById('forecast-months').value);
    
    if (isNaN(months) || months < 1 || months > 120) {
        alert('Please enter a valid number of months (1-120)');
        return;
    }
    
    try {
        // Show loading indicator
        const summaryContent = document.getElementById('summary-content');
        summaryContent.innerHTML = '<div class="loading">Generating forecast...</div>';
        
        // Switch to forecast tab immediately
        switchTabByName('forecast');
        
        // Generate forecast
        const response = await fetch(`${API_BASE}/api/forecast?months=${months}`);
        const forecast = await response.json();
        
        // Display results
        displayForecastSummary(forecast.summary);
        displayForecastEvents(forecast.events);
        
    } catch (error) {
        alert(`Error generating forecast: ${error.message}`);
        // Switch back to configuration tab on error
        switchTabByName('configuration');
    }
}

// Show empty state in forecast tab if no data
function showForecastEmptyState() {
    const summaryContent = document.getElementById('summary-content');
    summaryContent.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <div class="empty-state-text">No forecast generated yet</div>
            <div class="empty-state-hint">Configure your accounts and generate a forecast to see results here</div>
            <button onclick="switchTabByName('configuration')" class="btn btn-primary" style="margin-top: 16px;">
                Go to Configuration
            </button>
        </div>
    `;
    
    document.getElementById('events-tbody').innerHTML = '';
}

// Load initial data when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    
    // Show empty state in forecast tab initially
    showForecastEmptyState();
    
    // Ensure configuration tab is active
    switchTabByName('configuration');
});

// Load all data
async function loadAllData() {
    await loadAccountConfig();
    await loadIncome();
    await loadExpenses();
}

// Format numbers with proper accounting style
function formatAccountingNumber(num, isDebit = false) {
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(num));
    
    if (isDebit || num < 0) {
        return `(${formatted})`;
    }
    return formatted;
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
    const startDate = document.getElementById('start-date').value || null;
    
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
                annualReturnRate: isNaN(annualReturnRate) ? 0 : annualReturnRate,
                startDate
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
        
        // Set start date - if not set, default to today
        const startDateInput = document.getElementById('start-date');
        if (config?.start_date) {
            startDateInput.value = config.start_date;
        } else {
            // Set to today's date as default
            const today = new Date();
            startDateInput.value = today.toISOString().split('T')[0];
        }
        
        // Display current balances
        const display = document.getElementById('current-balances');
        if (config) {
            const startDateDisplay = config.start_date ? formatDate(config.start_date) : 'Today';
            display.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                    <div><strong>Checking:</strong> $${formatNumber(config.checking_balance || 0)}</div>
                    <div><strong>Savings:</strong> $${formatNumber(config.savings_balance || 0)}</div>
                    <div><strong>Return Rate:</strong> ${(config.annual_return_rate || 0).toFixed(1)}%</div>
                    <div><strong>Start:</strong> ${startDateDisplay}</div>
                </div>
            `;
        } else {
            display.innerHTML = `<div style="color: #6c757d;">No configuration set</div>`;
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
    const annual_increase_rate = parseFloat(document.getElementById('income-inflation').value) || 0;
    
    if (!name || isNaN(amount) || isNaN(day_of_month)) {
        alert('Please fill in all income fields');
        return;
    }
    
    if (day_of_month < 1 || day_of_month > 31) {
        alert('Day of month must be between 1 and 31');
        return;
    }
    
    if (annual_increase_rate < 0 || annual_increase_rate > 100) {
        alert('Annual increase rate must be between 0% and 100%');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/income`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, amount, day_of_month, annual_increase_rate })
        });
        
        if (response.ok) {
            await loadIncome();
            document.getElementById('income-name').value = '';
            document.getElementById('income-amount').value = '';
            document.getElementById('income-day').value = '';
            document.getElementById('income-inflation').value = '0';
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
            container.innerHTML = '<p style="color: #6c757d; text-align: center; padding: 12px; font-size: 12px;">No income added yet</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="ledger-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th class="amount">Amount</th>
                        <th>Day</th>
                        <th>Inflation</th>
                        <th style="width: 60px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${incomeList.map(income => `
                        <tr>
                            <td>${escapeHtml(income.name)}</td>
                            <td class="amount credit">$${formatNumber(income.amount)}</td>
                            <td>${income.day_of_month}</td>
                            <td>${income.annual_increase_rate ? income.annual_increase_rate.toFixed(1) + '%' : '-'}</td>
                            <td><button class="btn-icon" onclick="deleteIncome(${income.id})" title="Delete">×</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
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
    const annual_increase_rate = parseFloat(document.getElementById('expense-inflation').value) || 0;
    
    if (!name || isNaN(amount) || isNaN(day_of_month)) {
        alert('Please fill in all expense fields');
        return;
    }
    
    if (day_of_month < 1 || day_of_month > 31) {
        alert('Day of month must be between 1 and 31');
        return;
    }
    
    if (annual_increase_rate < 0 || annual_increase_rate > 100) {
        alert('Annual increase rate must be between 0% and 100%');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, amount, day_of_month, annual_increase_rate })
        });
        
        if (response.ok) {
            await loadExpenses();
            document.getElementById('expense-name').value = '';
            document.getElementById('expense-amount').value = '';
            document.getElementById('expense-day').value = '';
            document.getElementById('expense-inflation').value = '0';
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
            container.innerHTML = '<p style="color: #6c757d; text-align: center; padding: 12px; font-size: 12px;">No expenses added yet</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="ledger-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th class="amount">Amount</th>
                        <th>Day</th>
                        <th>Inflation</th>
                        <th style="width: 60px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenseList.map(expense => `
                        <tr>
                            <td>${escapeHtml(expense.name)}</td>
                            <td class="amount debit">${formatAccountingNumber(expense.amount, true)}</td>
                            <td>${expense.day_of_month}</td>
                            <td>${expense.annual_increase_rate ? expense.annual_increase_rate.toFixed(1) + '%' : '-'}</td>
                            <td><button class="btn-icon" onclick="deleteExpense(${expense.id})" title="Delete">×</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
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
    await generateAndSwitchToForecast();
}

function displayForecastSummary(summary) {
    const container = document.getElementById('summary-content');
    
    let alertsHtml = '';
    if (summary.monthlyNetCashFlow < 0) {
        alertsHtml += `
            <div class="alert alert-warning">
                <strong>Warning:</strong> Your monthly expenses exceed your income by 
                $${formatNumber(Math.abs(summary.monthlyNetCashFlow))}. 
                Transfers from savings to checking will be needed.
            </div>
        `;
    }
    
    if (summary.savingsDepletionMonth) {
        alertsHtml += `
            <div class="alert alert-danger">
                <strong>Critical:</strong> Your savings are projected to be depleted by 
                ${formatDate(summary.savingsDepletionMonth)}. 
                Consider reducing expenses or increasing income.
            </div>
        `;
    }
    
    if (!alertsHtml) {
        alertsHtml = `
            <div class="alert alert-info">
                Forecast period: ${formatDate(summary.startDate)} through month ${summary.monthsForecasted}
            </div>
        `;
    }
    
    container.innerHTML = `
        ${alertsHtml}
        <table class="summary-table">
            <tr>
                <td class="metric-label">Starting Checking</td>
                <td class="metric-value">$${formatNumber(summary.startingCheckingBalance || 0)}</td>
                <td class="metric-label">Ending Checking</td>
                <td class="metric-value">$${formatNumber(summary.endingCheckingBalance || 0)}</td>
            </tr>
            <tr>
                <td class="metric-label">Starting Savings</td>
                <td class="metric-value">$${formatNumber(summary.startingSavingsBalance || 0)}</td>
                <td class="metric-label">Ending Savings</td>
                <td class="metric-value ${(summary.endingSavingsBalance || 0) > 0 ? 'positive' : 'negative'}">$${formatNumber(summary.endingSavingsBalance || 0)}</td>
            </tr>
            <tr>
                <td class="metric-label">Total Income</td>
                <td class="metric-value positive">$${formatNumber(summary.totalIncome)}</td>
                <td class="metric-label">Total Expenses</td>
                <td class="metric-value negative">${formatAccountingNumber(summary.totalExpenses, true)}</td>
            </tr>
            <tr>
                <td class="metric-label">Monthly Net Flow</td>
                <td class="metric-value ${summary.monthlyNetCashFlow >= 0 ? 'positive' : 'negative'}">${summary.monthlyNetCashFlow >= 0 ? '$' + formatNumber(summary.monthlyNetCashFlow) : formatAccountingNumber(summary.monthlyNetCashFlow, true)}</td>
                <td class="metric-label">Total Transfers</td>
                <td class="metric-value">$${formatNumber(summary.totalTransfers || 0)}</td>
            </tr>
            <tr>
                <td class="metric-label">Investment Returns</td>
                <td class="metric-value positive">$${formatNumber(summary.totalInvestmentReturns || 0)}</td>
                <td class="metric-label">Forecast Period</td>
                <td class="metric-value">${summary.monthsForecasted} months</td>
            </tr>
        </table>
    `;
}

function displayForecastEvents(events) {
    const tbody = document.getElementById('events-tbody');
    
    tbody.innerHTML = events.map((event, index) => {
        const rowClass = index % 2 === 0 ? 'row-even' : 'row-odd';
        const isTransfer = event.transferAmount && event.transferAmount > 0;
        const isInvestmentReturn = event.type === 'investment_return';
        const isInflationAdjustment = event.type === 'expense_increase' || event.type === 'income_increase';
        
        let specialClass = '';
        let typeClass = '';
        let typeDisplay = '';
        
        if (isTransfer) {
            specialClass = 'transfer-row';
            typeClass = 'type-transfer';
            typeDisplay = 'Transfer';
        } else if (isInvestmentReturn) {
            specialClass = 'return-row';
            typeClass = 'type-investment_return';
            typeDisplay = 'Return';
        } else if (isInflationAdjustment) {
            specialClass = 'inflation-row';
            typeClass = 'type-inflation';
            typeDisplay = event.type === 'expense_increase' ? 'Exp +' : 'Inc +';
        } else if (event.type === 'income') {
            typeClass = 'type-income';
            typeDisplay = 'Income';
        } else {
            typeClass = 'type-expense';
            typeDisplay = 'Expense';
        }
        
        const isDebit = event.amount < 0;
        const amountClass = isDebit ? 'debit' : 'credit';
        
        // Handle inflation adjustment display
        if (isInflationAdjustment) {
            return `
                <tr class="${rowClass} ${specialClass}">
                    <td class="date">${formatDate(event.date)}</td>
                    <td class="${typeClass}">${typeDisplay}</td>
                    <td>${escapeHtml(event.name)}</td>
                    <td class="amount" style="font-size: 11px;">
                        $${formatNumber(event.oldAmount)} → $${formatNumber(event.newAmount)} (+${event.rate.toFixed(1)}%)
                    </td>
                    <td class="amount">$${formatNumber(event.checkingBalanceAfter || 0)}</td>
                    <td class="amount">$${formatNumber(event.savingsBalanceAfter || 0)}</td>
                    <td class="amount">-</td>
                </tr>
            `;
        }
        
        // Regular event display
        let amountDisplay = '';
        if (Math.abs(event.amount) > 0) {
            if (isDebit) {
                amountDisplay = formatAccountingNumber(event.amount, true);
            } else {
                amountDisplay = '$' + formatNumber(event.amount);
            }
            
            // Add inflation indicator if this event has been inflated
            if (event.inflationApplied && (event.type === 'expense' || event.type === 'income')) {
                amountDisplay += ' <span style="color: #ff9800; font-size: 11px;" title="Inflated from $' + formatNumber(event.baseAmount) + '">*</span>';
            }
        } else {
            amountDisplay = '-';
        }
        
        return `
            <tr class="${rowClass} ${specialClass}">
                <td class="date">${formatDate(event.date)}</td>
                <td class="${typeClass}">${typeDisplay}</td>
                <td>${escapeHtml(event.name)}</td>
                <td class="amount ${amountClass}">
                    ${amountDisplay}
                </td>
                <td class="amount">$${formatNumber(event.checkingBalanceAfter || 0)}</td>
                <td class="amount">$${formatNumber(event.savingsBalanceAfter || 0)}</td>
                <td class="amount ${isTransfer ? 'transfer' : ''}">
                    ${isTransfer ? '$' + formatNumber(event.transferAmount) : '-'}
                </td>
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
