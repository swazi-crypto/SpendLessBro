/**
 * storage.js — LocalStorage helper
 * All data is stored under the key "budgetu_data"
 */

const Storage = (() => {
  const KEY = 'budgetu_data';

  function defaultData() {
    const now = new Date();
    return {
      income: 0,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      expenses: []
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultData();
      return JSON.parse(raw);
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

  function getIncome() { return load().income || 0; }
  function setIncome(amount) {
    const data = load();
    data.income = parseFloat(amount) || 0;
    save(data);
  }

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
    data.income = 0;
    data.expenses = [];
    data.month = currentMonth();
    save(data);
  }

  function getCategoryTotals() {
    const expenses = getExpenses();
    const totals = { transport: 0, food: 0, data: 0, entertainment: 0, other: 0 };
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
    getIncome, setIncome,
    getExpenses, addExpense, updateExpense, deleteExpense,
    resetMonth, getCategoryTotals, getTotalExpenses
  };
})();
