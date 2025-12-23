/**
 * Forecasting module to calculate future balance by event
 */

/**
 * Generate forecast for the specified number of months
 * @param {Array} expenses - Array of expense objects {name, amount, day_of_month, annual_increase_rate}
 * @param {Array} income - Array of income objects {name, amount, day_of_month, annual_increase_rate}
 * @param {Number|Object} totalSavingsOrConfig - Total savings (legacy) or account config object
 * @param {Number} monthsToForecast - Number of months to forecast
 * @returns {Object} Forecast result with events and summary
 */
function generateForecast(expenses, income, totalSavingsOrConfig, monthsToForecast = 12) {
  // Handle both old (single savings) and new (checking/savings) formats
  let checkingBalance, savingsBalance, transferFrequencyDays, minCheckingBalance, annualReturnRate, startDate;
  
  if (typeof totalSavingsOrConfig === 'object' && totalSavingsOrConfig !== null) {
    // New format with account config
    checkingBalance = totalSavingsOrConfig.checkingBalance || 0;
    savingsBalance = totalSavingsOrConfig.savingsBalance || 0;
    transferFrequencyDays = totalSavingsOrConfig.transferFrequencyDays || 30;
    minCheckingBalance = totalSavingsOrConfig.minCheckingBalance || 0;
    annualReturnRate = totalSavingsOrConfig.annualReturnRate || 0;
    startDate = totalSavingsOrConfig.startDate || null;
  } else {
    // Legacy format - treat as single savings account
    checkingBalance = totalSavingsOrConfig || 0;
    savingsBalance = 0;
    transferFrequencyDays = 30;
    minCheckingBalance = 0;
    annualReturnRate = 0;
    startDate = null;
  }
  const events = [];
  let currentCheckingBalance = checkingBalance;
  let currentSavingsBalance = savingsBalance;
  let totalTransfers = 0;
  let totalInvestmentReturns = 0;
  let lastTransferDate = null;
  
  // Use startDate if provided, otherwise use today's date
  const today = startDate ? new Date(startDate) : new Date();
  const forecastStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Track adjusted amounts for each expense/income (start with base amounts)
  const expenseAmounts = {};
  expenses.forEach((exp, index) => {
    const key = exp.id !== undefined ? exp.id : `expense_${index}`;
    expenseAmounts[key] = exp.amount;
  });
  
  const incomeAmounts = {};
  income.forEach((inc, index) => {
    const key = inc.id !== undefined ? inc.id : `income_${index}`;
    incomeAmounts[key] = inc.amount;
  });
  
  // Create a list of all events (income and expenses) for the forecast period
  const allEvents = [];
  
  for (let month = 0; month < monthsToForecast; month++) {
    const currentYear = forecastStartDate.getFullYear();
    const currentMonth = forecastStartDate.getMonth() + month;
    const currentDate = new Date(currentYear, currentMonth, 1);
    
    // Check if we've crossed a year anniversary
    const yearsSinceStart = Math.floor(month / 12);
    
    // If starting a new year (not year 0), apply inflation at the beginning of the year
    if (month > 0 && month % 12 === 0) {
      // Apply annual increase to all expenses
      expenses.forEach((exp, index) => {
        if (exp.annual_increase_rate > 0) {
          const key = exp.id !== undefined ? exp.id : `expense_${index}`;
          const oldAmount = expenseAmounts[key];
          const multiplier = 1 + (exp.annual_increase_rate / 100);
          expenseAmounts[key] *= multiplier;
          
          // Add an event showing the increase
          allEvents.push({
            date: new Date(currentYear, currentMonth, 1),
            type: 'expense_increase',
            name: `${exp.name} - Annual Increase`,
            amount: 0,
            oldAmount: oldAmount,
            newAmount: expenseAmounts[key],
            rate: exp.annual_increase_rate,
            day_of_month: 1,
            isInflationAdjustment: true
          });
        }
      });
      
      // Apply annual increase to all income
      income.forEach((inc, index) => {
        if (inc.annual_increase_rate > 0) {
          const key = inc.id !== undefined ? inc.id : `income_${index}`;
          const oldAmount = incomeAmounts[key];
          const multiplier = 1 + (inc.annual_increase_rate / 100);
          incomeAmounts[key] *= multiplier;
          
          allEvents.push({
            date: new Date(currentYear, currentMonth, 1),
            type: 'income_increase',
            name: `${inc.name} - Annual Increase`,
            amount: 0,
            oldAmount: oldAmount,
            newAmount: incomeAmounts[key],
            rate: inc.annual_increase_rate,
            day_of_month: 1,
            isInflationAdjustment: true
          });
        }
      });
    }
    
    // Add investment return event at the beginning of each month (except the first partial month)
    if (month > 0 && annualReturnRate > 0) {
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      allEvents.push({
        date: firstDayOfMonth,
        type: 'investment_return',
        name: 'Investment Return',
        amount: 0, // Will be calculated when processing
        day_of_month: 1,
        isInvestmentReturn: true
      });
    }
    
    // Add expenses for this month using adjusted amounts
    expenses.forEach((expense, index) => {
      const eventDate = new Date(currentYear, currentMonth, expense.day_of_month);
      
      // For the first month, only include events on or after forecastStartDate
      if (month === 0 && eventDate < forecastStartDate) {
        return; // Skip this event
      }
      
      const key = expense.id !== undefined ? expense.id : `expense_${index}`;
      allEvents.push({
        date: eventDate,
        type: 'expense',
        name: expense.name,
        amount: -Math.abs(expenseAmounts[key]), // Ensure expenses are negative
        baseAmount: expense.amount,
        currentAmount: expenseAmounts[key],
        inflationApplied: expenseAmounts[key] !== expense.amount,
        day_of_month: expense.day_of_month
      });
    });
    
    // Add income for this month using adjusted amounts
    income.forEach((inc, index) => {
      const eventDate = new Date(currentYear, currentMonth, inc.day_of_month);
      
      // For the first month, only include events on or after forecastStartDate
      if (month === 0 && eventDate < forecastStartDate) {
        return; // Skip this event
      }
      
      const key = inc.id !== undefined ? inc.id : `income_${index}`;
      allEvents.push({
        date: eventDate,
        type: 'income',
        name: inc.name,
        amount: Math.abs(incomeAmounts[key]), // Ensure income is positive
        baseAmount: inc.amount,
        currentAmount: incomeAmounts[key],
        inflationApplied: incomeAmounts[key] !== inc.amount,
        day_of_month: inc.day_of_month
      });
    });
  }
  
  // Sort events by date
  allEvents.sort((a, b) => a.date - b.date);
  
  // Process each event and calculate running balances
  allEvents.forEach(event => {
    const beforeCheckingBalance = currentCheckingBalance;
    const beforeSavingsBalance = currentSavingsBalance;
    
    // Handle inflation adjustments (these don't affect balance)
    if (event.isInflationAdjustment) {
      events.push({
        date: event.date.toISOString().split('T')[0],
        type: event.type,
        name: event.name,
        amount: 0,
        checkingBalanceBefore: beforeCheckingBalance,
        checkingBalanceAfter: currentCheckingBalance,
        savingsBalanceBefore: beforeSavingsBalance,
        savingsBalanceAfter: currentSavingsBalance,
        transferAmount: 0,
        transferReason: null,
        oldAmount: event.oldAmount,
        newAmount: event.newAmount,
        rate: event.rate
      });
      return;
    }
    
    // Handle investment returns
    if (event.isInvestmentReturn) {
      // Only calculate if there's a savings balance
      if (currentSavingsBalance > 0) {
        const monthlyReturnRate = annualReturnRate / 100 / 12;
        const monthlyReturn = currentSavingsBalance * monthlyReturnRate;
        currentSavingsBalance += monthlyReturn;
        totalInvestmentReturns += monthlyReturn;
        
        events.push({
          date: event.date.toISOString().split('T')[0],
          type: 'investment_return',
          name: 'Investment Return',
          amount: monthlyReturn,
          checkingBalanceBefore: beforeCheckingBalance,
          checkingBalanceAfter: currentCheckingBalance,
          savingsBalanceBefore: beforeSavingsBalance,
          savingsBalanceAfter: currentSavingsBalance,
          transferAmount: 0,
          transferReason: null
        });
      }
      return;
    }
    
    // PREDICTIVE LOGIC: Check if applying the transaction would cause problems BEFORE applying it
    let transferAmount = 0;
    let transferReason = null;
    const balanceAfterTransaction = currentCheckingBalance + event.amount;
    
    // If the transaction would take us below minimum, transfer first
    if (balanceAfterTransaction < minCheckingBalance && currentSavingsBalance > 0) {
      // Check if enough time has passed since last transfer
      // OR if checking would go to zero or negative (emergency override)
      const canTransfer = !lastTransferDate || 
        (event.date - lastTransferDate) >= (transferFrequencyDays * 24 * 60 * 60 * 1000) ||
        balanceAfterTransaction <= 0;
      
      if (canTransfer) {
        // Calculate amount needed to reach minimum after transaction
        const shortfall = minCheckingBalance - balanceAfterTransaction;
        
        // Only transfer if there's actually a shortfall (should always be true given outer condition)
        if (shortfall > 0) {
          // Round up to nearest $100
          const transferNeeded = Math.ceil(shortfall / 100) * 100;
          
          // Transfer the calculated amount, or all available savings if insufficient
          transferAmount = Math.min(transferNeeded, currentSavingsBalance);
          
          if (transferAmount > 0) {
            currentSavingsBalance -= transferAmount;
            currentCheckingBalance += transferAmount;
            totalTransfers += transferAmount;
            lastTransferDate = event.date;
            
            if (balanceAfterTransaction <= 0) {
              transferReason = 'Emergency: Would go to zero or negative';
            } else {
              transferReason = 'Balance would fall below minimum';
            }
          }
        }
      }
    }
    
    // NOW apply the transaction AFTER the transfer
    currentCheckingBalance += event.amount;
    
    events.push({
      date: event.date.toISOString().split('T')[0],
      type: event.type,
      name: event.name,
      amount: event.amount,
      checkingBalanceBefore: beforeCheckingBalance,
      checkingBalanceAfter: currentCheckingBalance,
      savingsBalanceBefore: beforeSavingsBalance,
      savingsBalanceAfter: currentSavingsBalance,
      transferAmount: transferAmount,
      transferReason: transferReason
    });
  });
  
  // Calculate summary statistics
  const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0) * monthsToForecast;
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0) * monthsToForecast;
  const monthlyNetCashFlow = (income.reduce((sum, inc) => sum + inc.amount, 0) - 
                              expenses.reduce((sum, exp) => sum + exp.amount, 0));
  
  // Find when savings are depleted (goes from positive to zero)
  let savingsDepletionMonth = null;
  for (let i = 0; i < events.length; i++) {
    if (events[i].savingsBalanceAfter <= 0 && 
        (i === 0 ? savingsBalance > 0 : events[i].savingsBalanceBefore > 0)) {
      savingsDepletionMonth = events[i].date;
      break;
    }
  }
  
  return {
    events,
    summary: {
      startDate: forecastStartDate.toISOString().split('T')[0],
      startingCheckingBalance: checkingBalance,
      startingSavingsBalance: savingsBalance,
      totalIncome,
      totalExpenses,
      monthlyNetCashFlow,
      totalTransfers,
      totalInvestmentReturns,
      endingCheckingBalance: currentCheckingBalance,
      endingSavingsBalance: currentSavingsBalance,
      monthsForecasted: monthsToForecast,
      savingsDepletionMonth
    }
  };
}

module.exports = {
  generateForecast
};
