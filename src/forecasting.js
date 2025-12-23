/**
 * Forecasting module to calculate future balance by event
 */

/**
 * Generate forecast for the specified number of months
 * @param {Array} expenses - Array of expense objects {name, amount, day_of_month}
 * @param {Array} income - Array of income objects {name, amount, day_of_month}
 * @param {Number} totalSavings - Current total savings
 * @param {Number} monthsToForecast - Number of months to forecast
 * @returns {Object} Forecast result with events and summary
 */
function generateForecast(expenses, income, totalSavings, monthsToForecast = 12) {
  const events = [];
  let currentBalance = totalSavings;
  let totalWithdrawals = 0;
  
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
  
  // Process each event and calculate running balance
  allEvents.forEach(event => {
    const beforeBalance = currentBalance;
    currentBalance += event.amount;
    
    // If balance goes negative, we need a withdrawal from savings
    let withdrawal = 0;
    if (currentBalance < 0) {
      withdrawal = Math.abs(currentBalance);
      totalWithdrawals += withdrawal;
      currentBalance = 0; // After withdrawal, balance returns to 0
    }
    
    events.push({
      date: event.date.toISOString().split('T')[0],
      type: event.type,
      name: event.name,
      amount: event.amount,
      balanceBefore: beforeBalance,
      balanceAfter: currentBalance,
      withdrawal: withdrawal,
      savingsRemaining: totalSavings - totalWithdrawals
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
      startingSavings: totalSavings,
      totalIncome,
      totalExpenses,
      monthlyNetCashFlow,
      totalWithdrawals,
      savingsRemaining: totalSavings - totalWithdrawals,
      projectedEndBalance: currentBalance,
      monthsForecasted: monthsToForecast,
      savingsDepletionMonth: totalSavings - totalWithdrawals <= 0 ? 
        events.find(e => e.savingsRemaining <= 0)?.date : null
    }
  };
}

module.exports = {
  generateForecast
};
