const Storage = (() => {
  const KEY = 'budgetu_data';

  // SpendLessBro is built for NSFAS students. The NSFAS allowance is a
  // fixed amount that lands every month — this is just a sensible
  // starting default for a first-time user; they can change it any time
  // from the Manage Income modal if their real allowance is different.
  const NSFAS_DEFAULT_INCOME = 1716.00;

  // Budget LIMITS only cover flexible day-to-day spending categories.
  // Subscriptions are treated as a fixed/recurring cost, not something you
  // set a flexible limit on, so it's deliberately left out here.
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
      // A savings goal is different from a category budget limit: it's not
      // "don't spend more than X on groceries", it's "try to have at least
      // X left over by the end of the month". 0 means no goal set yet.
      savingsGoal: 0,
      // No fabricated "last month" here. Trend/comparison features only
      // switch on once the user has actually lived through a real month
      // in the app (i.e. after their first real Monthly Reset) — showing
      // sample numbers as if they were the user's real history would be
      // misleading, not helpful.
      previousMonth: null
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultData();
      const data = JSON.parse(raw);

      // Older saves won't have these fields yet — backfill so callers
      // never have to check for their existence.
      if (!data.budgets) data.budgets = defaultBudgets();
      if (data.previousMonth === undefined) data.previousMonth = null;

      // Migrate the old single "income" field (pre fixed/additional split)
      // into fixedIncome, once, the first time an old save is loaded.
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

  // ---- Income: a fixed monthly amount (the NSFAS allowance) plus any
  // number of one-off additional income entries logged as they come in
  // (money from home, part-time work, etc). getIncome() is the total of
  // both — every other part of the app (score, budgets, dashboard stats)
  // just calls getIncome() and doesn't need to know about the split.
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
    // Before wiping, snapshot this month's real numbers as "last month" —
    // this is the ONLY place previousMonth ever gets set, so any trend
    // comparison the app shows afterwards is real, not sample data.
    data.previousMonth = { totals: getCategoryTotals(), income: getIncome() };
    // Additional income was one-off money for this month specifically, so
    // it resets. Fixed income is the recurring NSFAS allowance — it carries
    // over untouched.
    data.additionalIncome = [];
    data.expenses = [];
    data.month = currentMonth();
    // Budgets are a recurring plan, not a monthly log — they carry over
    // instead of being wiped by a reset.
    save(data);
  }

  function getBudgets() { return load().budgets || defaultBudgets(); }

  function setBudgets(updated) {
    const data = load();
    data.budgets = { ...defaultBudgets(), ...updated };
    save(data);
  }

  // Returns null until the user has completed at least one real Monthly
  // Reset — callers must handle "no previous month yet" honestly instead
  // of falling back to made-up numbers.
  function getPreviousMonth() { return load().previousMonth || null; }

  // ---- Savings goal: a single recurring target, like budgets it carries
  // over across Monthly Reset instead of being wiped (it's a plan, not a
  // one-month log). 0/unset means the user hasn't set one yet.
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
