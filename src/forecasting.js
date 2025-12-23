/**
 * Forecasting module to calculate future balance by event
 */

/**
 * Generate forecast for the specified number of months
 * @param {Array} expenses - Array of expense objects {name, amount, day_of_month}
 * @param {Array} income - Array of income objects {name, amount, day_of_month}
 * @param {Number|Object} totalSavingsOrConfig - Total savings (legacy) or account config object
 * @param {Number} monthsToForecast - Number of months to forecast
 * @returns {Object} Forecast result with events and summary
 */
function generateForecast(expenses, income, totalSavingsOrConfig, monthsToForecast = 12) {
  // Handle both old (single savings) and new (checking/savings) formats
  let checkingBalance, savingsBalance, transferFrequencyDays, minCheckingBalance, annualReturnRate;
  
  if (typeof totalSavingsOrConfig === 'object' && totalSavingsOrConfig !== null) {
    // New format with account config
    checkingBalance = totalSavingsOrConfig.checkingBalance || 0;
    savingsBalance = totalSavingsOrConfig.savingsBalance || 0;
    transferFrequencyDays = totalSavingsOrConfig.transferFrequencyDays || 30;
    minCheckingBalance = totalSavingsOrConfig.minCheckingBalance || 0;
    annualReturnRate = totalSavingsOrConfig.annualReturnRate || 0;
  } else {
    // Legacy format - treat as single savings account
    checkingBalance = totalSavingsOrConfig || 0;
    savingsBalance = 0;
    transferFrequencyDays = 30;
    minCheckingBalance = 0;
    annualReturnRate = 0;
  }
  const events = [];
  let currentCheckingBalance = checkingBalance;
  let currentSavingsBalance = savingsBalance;
  let totalTransfers = 0;
  let totalInvestmentReturns = 0;
  let lastTransferDate = null;
  
  // Start from today's date instead of first of month
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Create a list of all events (income and expenses) for the forecast period
  const allEvents = [];
  
  for (let month = 0; month < monthsToForecast; month++) {
    const currentYear = startDate.getFullYear();
    const currentMonth = startDate.getMonth() + month;
    
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
    
    // Add expenses for this month
    expenses.forEach(expense => {
      const eventDate = new Date(currentYear, currentMonth, expense.day_of_month);
      
      // For the first month, only include events on or after today
      if (month === 0 && eventDate < startDate) {
        return; // Skip this event
      }
      
      allEvents.push({
        date: eventDate,
        type: 'expense',
        name: expense.name,
        amount: -Math.abs(expense.amount), // Ensure expenses are negative
        day_of_month: expense.day_of_month
      });
    });
    
    // Add income for this month
    income.forEach(inc => {
      const eventDate = new Date(currentYear, currentMonth, inc.day_of_month);
      
      // For the first month, only include events on or after today
      if (month === 0 && eventDate < startDate) {
        return; // Skip this event
      }
      
      allEvents.push({
        date: eventDate,
        type: 'income',
        name: inc.name,
        amount: Math.abs(inc.amount), // Ensure income is positive
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
    
    // Handle investment returns
    if (event.isInvestmentReturn) {
      // Only calculate if there's a savings balance
      if (currentSavingsBalance > 0) {
        const monthlyReturn = currentSavingsBalance * (annualReturnRate / 100 / 12);
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
    
    // Apply transaction to checking account
    currentCheckingBalance += event.amount;
    
    // Check if we need to transfer from savings
    let transferAmount = 0;
    let transferReason = null;
    
    if (currentCheckingBalance < minCheckingBalance && currentSavingsBalance > 0) {
      // Check if enough time has passed since last transfer
      const canTransfer = !lastTransferDate || 
        (event.date - lastTransferDate) >= (transferFrequencyDays * 24 * 60 * 60 * 1000);
      
      if (canTransfer) {
        // Calculate transfer amount - bring checking to a reasonable level
        // Transfer enough to cover the shortfall plus a buffer (up to min balance)
        const shortfall = minCheckingBalance - currentCheckingBalance;
        transferAmount = Math.min(shortfall, currentSavingsBalance);
        
        if (transferAmount > 0) {
          currentSavingsBalance -= transferAmount;
          currentCheckingBalance += transferAmount;
          totalTransfers += transferAmount;
          lastTransferDate = event.date;
          transferReason = 'Balance below minimum';
        }
      }
    }
    
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
      startDate: startDate.toISOString().split('T')[0],
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
