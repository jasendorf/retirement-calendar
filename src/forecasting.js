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
  let checkingBalance, savingsBalance, transferFrequencyDays, minCheckingBalance;
  
  if (typeof totalSavingsOrConfig === 'object' && totalSavingsOrConfig !== null) {
    // New format with account config
    checkingBalance = totalSavingsOrConfig.checkingBalance || 0;
    savingsBalance = totalSavingsOrConfig.savingsBalance || 0;
    transferFrequencyDays = totalSavingsOrConfig.transferFrequencyDays || 30;
    minCheckingBalance = totalSavingsOrConfig.minCheckingBalance || 0;
  } else {
    // Legacy format - treat as single savings account
    checkingBalance = totalSavingsOrConfig || 0;
    savingsBalance = 0;
    transferFrequencyDays = 30;
    minCheckingBalance = 0;
  }
  const events = [];
  let currentCheckingBalance = checkingBalance;
  let currentSavingsBalance = savingsBalance;
  let totalTransfers = 0;
  let lastTransferDate = null;
  
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Create a list of all events (income and expenses) for the forecast period
  const allEvents = [];
  
  for (let month = 0; month < monthsToForecast; month++) {
    const currentYear = startDate.getFullYear();
    const currentMonth = startDate.getMonth() + month;
    
    // Add expenses for this month
    expenses.forEach(expense => {
      const eventDate = new Date(currentYear, currentMonth, expense.day_of_month);
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
  
  return {
    events,
    summary: {
      startingCheckingBalance: checkingBalance,
      startingSavingsBalance: savingsBalance,
      totalIncome,
      totalExpenses,
      monthlyNetCashFlow,
      totalTransfers,
      endingCheckingBalance: currentCheckingBalance,
      endingSavingsBalance: currentSavingsBalance,
      monthsForecasted: monthsToForecast,
      savingsDepletionMonth: events.find(e => e.savingsBalanceAfter <= 0 && savingsBalance > 0)?.date || null
    }
  };
}

module.exports = {
  generateForecast
};
