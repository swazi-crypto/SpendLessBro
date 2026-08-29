const Storage = (() => {
  const KEY = 'budgetu_data';


  const NSFAS_DEFAULT_INCOME = 1716.00;

  function defaultBudgets() {
    return { groceries: 0, transport: 0, fastfood: 0, shopping: 0, fun: 0, other: 0 };
  }

  function emptyTotals() {
    return { groceries: 0, transport: 0, fastfood: 0, shopping: 0, fun: 0, subscriptions: 0, other: 0 };
  }

  function defaultData() {
    const now = new Date();
    return {
      fixedIncome: NSFAS_DEFAULT_INCOME,
      additionalIncome: [],
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      expenses: [],
      budgets: defaultBudgets(),
   
      savingsGoal: 0,

      previousMonth: null
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultData();
      const data = JSON.parse(raw);

     
      if (!data.budgets) data.budgets = defaultBudgets();
      if (data.previousMonth === undefined) data.previousMonth = null;

  
      if (data.fixedIncome === undefined) {
        data.fixedIncome = typeof data.income === 'number' ? data.income : NSFAS_DEFAULT_INCOME;
        delete data.income;
      }
      if (!data.additionalIncome) data.additionalIncome = [];
      if (data.savingsGoal === undefined) data.savingsGoal = 0;

      return data;
    } catch (e) {
      return defaultData();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

 
  function getFixedIncome() { return load().fixedIncome ?? NSFAS_DEFAULT_INCOME; }
  function setFixedIncome(amount) {
    const data = load();
    data.fixedIncome = parseFloat(amount) || 0;
    save(data);
  }

  function getAdditionalIncome() { return load().additionalIncome || []; }

  function addAdditionalIncome(entry) {
    const data = load();
    entry.id = Date.now().toString();
    data.additionalIncome = data.additionalIncome || [];
    data.additionalIncome.unshift(entry);
    save(data);
    return entry;
  }

  function deleteAdditionalIncome(id) {
    const data = load();
    data.additionalIncome = (data.additionalIncome || []).filter(e => e.id !== id);
    save(data);
  }

  function getTotalAdditionalIncome() {
    return getAdditionalIncome().reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }

  function getIncome() { return getFixedIncome() + getTotalAdditionalIncome(); }

  function getExpenses() { return load().expenses || []; }

  function addExpense(exp) {
    const data = load();
    exp.id = Date.now().toString();
    data.expenses.unshift(exp);
    save(data);
    return exp;
  }

  function updateExpense(id, updated) {
    const data = load();
    const idx = data.expenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      data.expenses[idx] = { ...data.expenses[idx], ...updated };
      save(data);
      return true;
    }
    return false;
  }

  function deleteExpense(id) {
    const data = load();
    data.expenses = data.expenses.filter(e => e.id !== id);
    save(data);
  }

  function resetMonth() {
    const data = load();
    
    data.previousMonth = { totals: getCategoryTotals(), income: getIncome() };
    
    data.additionalIncome = [];
    data.expenses = [];
    data.month = currentMonth();
   
    save(data);
  }

  function getBudgets() { return load().budgets || defaultBudgets(); }

  function setBudgets(updated) {
    const data = load();
    data.budgets = { ...defaultBudgets(), ...updated };
    save(data);
  }

 
  function getPreviousMonth() { return load().previousMonth || null; }


  function getSavingsGoal() { return load().savingsGoal || 0; }
  function setSavingsGoal(amount) {
    const data = load();
    data.savingsGoal = parseFloat(amount) || 0;
    save(data);
  }

  function getCategoryTotals() {
    const expenses = getExpenses();
    const totals = emptyTotals();
    expenses.forEach(e => {
      const cat = e.category in totals ? e.category : 'other';
      totals[cat] += parseFloat(e.amount) || 0;
    });
    return totals;
  }

  function getTotalExpenses() {
    return getExpenses().reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }

  return {
    load, save, currentMonth,
    getIncome,
    getFixedIncome, setFixedIncome,
    getAdditionalIncome, addAdditionalIncome, deleteAdditionalIncome, getTotalAdditionalIncome,
    getExpenses, addExpense, updateExpense, deleteExpense,
    resetMonth, getCategoryTotals, getTotalExpenses,
    getBudgets, setBudgets, getPreviousMonth,
    getSavingsGoal, setSavingsGoal
  };
})();
