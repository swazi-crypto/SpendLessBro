

const CATEGORIES = {
  groceries:     { label: 'Groceries',       color: '#56cfb2' },
  transport:     { label: 'Transport',       color: '#7c6cfa' },
  fastfood:      { label: 'Fast Food',       color: '#f7a34e' },
  shopping:      { label: 'Shopping',        color: '#4ea8f7' },
  fun:           { label: 'Entertainment',   color: '#ff6aa7' },
  subscriptions: { label: 'Subscriptions',   color: '#c084fc' },
  other:         { label: 'Other',           color: '#888888' }
};


const BUDGET_CATEGORY_KEYS = ['groceries', 'transport', 'fastfood', 'shopping', 'fun', 'other'];

function formatRand(amount) {
  return 'R ' + parseFloat(amount || 0).toLocaleString('en-ZA', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function monthLabel() {
  return new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}


let _confirmCallback = null;

function showConfirm(message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  if (!modal) { onConfirm(); return; } // page has no modal markup — just proceed
  document.getElementById('confirmMessage').textContent = message;
  _confirmCallback = onConfirm;
  modal.classList.add('open');
}
function acceptConfirm() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.classList.remove('open');
  const cb = _confirmCallback;
  _confirmCallback = null;
  if (cb) cb();
}
function cancelConfirm() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.classList.remove('open');
  _confirmCallback = null;
}

function notify(message, type) {
  let el = document.getElementById('appNotify');
  if (!el) {
    el = document.createElement('div');
    el.id = 'appNotify';
    el.className = 'app-notify';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = 'app-notify visible' + (type === 'error' ? ' error' : '');
  clearTimeout(window._notifyTimeout);
  window._notifyTimeout = setTimeout(() => { el.classList.remove('visible'); }, 2600);
}


function openIncomeModal() {
  const modal = document.getElementById('incomeModal');
  if (!modal) return;
  const fixedInput = document.getElementById('fixedIncomeInput');
  if (fixedInput) fixedInput.value = Storage.getFixedIncome() || '';
  const dateInput = document.getElementById('extraIncomeDate');
  if (dateInput && !dateInput.value) dateInput.value = todayStr();
  renderAdditionalIncomeList();
  updateIncomeModalTotal();
  modal.classList.add('open');
}
function closeIncomeModal() {
  const m = document.getElementById('incomeModal');
  if (m) m.classList.remove('open');
}

function saveFixedIncome() {
  const val = parseFloat(document.getElementById('fixedIncomeInput').value);
  if (isNaN(val) || val < 0) { notify('Please enter a valid amount.', 'error'); return; }
  Storage.setFixedIncome(val);
  updateIncomeModalTotal();
  notify('Fixed income saved.');
  if (typeof renderDashboard === 'function') renderDashboard();
}

function addAdditionalIncomeEntry() {
  const descInput = document.getElementById('extraIncomeDesc');
  const amountInput = document.getElementById('extraIncomeAmount');
  const dateInput = document.getElementById('extraIncomeDate');
  const amount = parseFloat(amountInput.value);
  const date = dateInput.value || todayStr();

  if (isNaN(amount) || amount <= 0) { notify('Please enter a valid amount.', 'error'); return; }

  Storage.addAdditionalIncome({
    description: descInput.value.trim() || 'Extra income',
    amount,
    date
  });

  descInput.value = '';
  amountInput.value = '';
  dateInput.value = todayStr();

  renderAdditionalIncomeList();
  updateIncomeModalTotal();
  notify('Extra income added.');
  if (typeof renderDashboard === 'function') renderDashboard();
}

function deleteAdditionalIncomeEntry(id) {
  showConfirm('Remove this income entry?', () => {
    Storage.deleteAdditionalIncome(id);
    renderAdditionalIncomeList();
    updateIncomeModalTotal();
    notify('Entry removed.');
    if (typeof renderDashboard === 'function') renderDashboard();
  });
}

function renderAdditionalIncomeList() {
  const el = document.getElementById('additionalIncomeList');
  if (!el) return;
  const entries = Storage.getAdditionalIncome();
  if (!entries.length) {
    el.innerHTML = '<p class="empty-msg">No extra income logged yet this month.</p>';
    return;
  }
  el.innerHTML = entries.map(e => `
    <div class="additional-income-row">
      <div class="additional-income-info">
        <div class="additional-income-desc">${e.description}</div>
        <div class="additional-income-date">${formatDate(e.date)}</div>
      </div>
      <div class="additional-income-amt">${formatRand(e.amount)}</div>
      <button class="btn-icon del" onclick="deleteAdditionalIncomeEntry('${e.id}')" title="Remove">Remove</button>
    </div>`).join('');
}

function updateIncomeModalTotal() {
  const el = document.getElementById('incomeModalTotal');
  if (el) el.textContent = formatRand(Storage.getIncome());
}

// ---- Budget limits modal (shared by Dashboard + Summary) --------------
function openBudgetModal() {
  const modal = document.getElementById('budgetModal');
  const wrap = document.getElementById('budgetInputs');
  if (!modal || !wrap) return;
  const budgets = Storage.getBudgets();
  wrap.innerHTML = BUDGET_CATEGORY_KEYS.map(key => {
    const meta = CATEGORIES[key];
    return `
    <div class="budget-input-row">
      <span class="cat-dot" style="background:${meta.color}"></span>
      <label for="budget-${key}">${meta.label}</label>
      <div class="input-group">
        <span class="input-prefix">R</span>
        <input type="number" id="budget-${key}" min="0" step="10" value="${budgets[key] || ''}" placeholder="0">
      </div>
    </div>`;
  }).join('');
  modal.classList.add('open');
}

function closeBudgetModal() {
  const m = document.getElementById('budgetModal');
  if (m) m.classList.remove('open');
}

function saveBudgets() {
  const updated = {};
  BUDGET_CATEGORY_KEYS.forEach(key => {
    const input = document.getElementById('budget-' + key);
    updated[key] = input ? (parseFloat(input.value) || 0) : 0;
  });
  Storage.setBudgets(updated);
  closeBudgetModal();
  notify('Budget limits saved.');
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderSummary === 'function') renderSummary();
}

function resetMonth() {
  showConfirm('Reset all data for this month? This cannot be undone.', () => {
    Storage.resetMonth();
    if (typeof renderDashboard   === 'function') renderDashboard();
    if (typeof renderExpensesList=== 'function') { renderExpensesList(); renderCategoryTotals(); }
    if (typeof renderSummary     === 'function') renderSummary();
    renderSavingsGoalCard();
    notify('Month reset.');
  });
}

// ---- Savings goal card + modal (shared by Dashboard + Summary) --------
// A savings goal is separate from budget limits — it tracks "money left
// over" against a target the user sets, not a per-category spending cap.
function openSavingsGoalModal() {
  const modal = document.getElementById('savingsGoalModal');
  if (!modal) return;
  const input = document.getElementById('savingsGoalInput');
  if (input) input.value = Storage.getSavingsGoal() || '';
  modal.classList.add('open');
}

function closeSavingsGoalModal() {
  const m = document.getElementById('savingsGoalModal');
  if (m) m.classList.remove('open');
}

function saveSavingsGoal() {
  const val = parseFloat(document.getElementById('savingsGoalInput').value);
  if (isNaN(val) || val < 0) { notify('Please enter a valid amount.', 'error'); return; }
  Storage.setSavingsGoal(val);
  closeSavingsGoalModal();
  notify('Savings goal saved.');
  renderSavingsGoalCard();
}

function renderSavingsGoalCard() {
  const body = document.getElementById('savingsGoalBody');
  const badge = document.getElementById('savingsGoalBadge');
  if (!body) return; // this page doesn't have the card — nothing to do

  const goal = Storage.getSavingsGoal();
  const income = Storage.getIncome();
  const total = Storage.getTotalExpenses();
  const progress = computeSavingsGoalProgress({ income, total, savingsGoal: goal });

  if (!progress) {
    body.innerHTML = '<p class="empty-msg">Set a savings goal to start tracking progress.</p>';
    if (badge) { badge.textContent = 'No goal set'; badge.className = 'budget-overall-badge none'; }
    return;
  }

  const barClass = (progress.current >= progress.goal || progress.onTrack) ? 'ok' : 'warn';
  body.innerHTML = `
    <div class="budget-row">
      <div class="budget-row-top">
        <span class="budget-cat">Left over so far</span>
        <span class="budget-amounts">${formatRand(progress.current)} / ${formatRand(progress.goal)}</span>
      </div>
      <div class="budget-track"><div class="budget-fill ${barClass}" style="width:${progress.pct}%"></div></div>
      <div class="budget-status ${barClass}">${progress.message}</div>
    </div>`;

  if (badge) {
    if (progress.current >= progress.goal) { badge.textContent = 'Goal hit!'; badge.className = 'budget-overall-badge ok'; }
    else if (progress.onTrack) { badge.textContent = 'On track'; badge.className = 'budget-overall-badge ok'; }
    else { badge.textContent = 'Behind pace'; badge.className = 'budget-overall-badge warn'; }
  }
}

function exportCSV() {
  const expenses = Storage.getExpenses();
  if (!expenses.length) { notify('No expenses to export.', 'error'); return; }
  const income = Storage.getIncome();
  const total  = Storage.getTotalExpenses();
  let csv = `SpendLessBro Export\nMonth,${monthLabel()}\nIncome,R ${income.toFixed(2)}\nTotal Expenses,R ${total.toFixed(2)}\nBalance,R ${(income-total).toFixed(2)}\n\nDate,Category,Description,Amount\n`;
  expenses.forEach(e => {
    csv += `${e.date||''},${CATEGORIES[e.category]?.label||e.category},"${(e.description||'').replace(/,/g,';')}",R ${parseFloat(e.amount).toFixed(2)}\n`;
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `SpendLessBro_${Storage.currentMonth()}.csv`;
  a.click();
}

// ---- Welcome screen ----
function enterApp() {
  const ws = document.getElementById('welcomeScreen');
  const app = document.getElementById('appShell');
  if (!ws || !app) return;
  ws.style.opacity = '0';
  ws.style.transition = 'opacity .4s ease';
  setTimeout(() => {
    ws.style.display = 'none';
    app.style.display = 'flex';
    localStorage.setItem('slb_seen', '1');
    if (typeof renderDashboard === 'function') renderDashboard();
  }, 400);
}

/
window.addEventListener('DOMContentLoaded', () => {
  const ws = document.getElementById('welcomeScreen');
  const app = document.getElementById('appShell');
  if (!ws) { // expenses / summary pages — no welcome screen
    if (app) app.style.display = 'flex';
    return;
  }
  if (localStorage.getItem('slb_seen') === '1') {
    ws.style.display = 'none';
    app.style.display = 'flex';
    if (typeof renderDashboard === 'function') renderDashboard();
  }
  
});


document.addEventListener('click', e => {
  const m = document.getElementById('incomeModal');
  if (m && e.target === m) closeIncomeModal();
  const c = document.getElementById('confirmModal');
  if (c && e.target === c) cancelConfirm();
  const b = document.getElementById('budgetModal');
  if (b && e.target === b) closeBudgetModal();
  const sg = document.getElementById('savingsGoalModal');
  if (sg && e.target === sg) closeSavingsGoalModal();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  // Enter inside a specific income-modal field submits that field's own
  // action, rather than a single blanket "save" for the whole modal (it
  // now has two independent forms: Fixed Income and Additional Income).
  if (e.target.id === 'fixedIncomeInput') { e.preventDefault(); saveFixedIncome(); }
  if (e.target.id === 'extraIncomeDesc' || e.target.id === 'extraIncomeAmount') {
    e.preventDefault(); addAdditionalIncomeEntry();
  }
  if (e.target.id === 'savingsGoalInput') { e.preventDefault(); saveSavingsGoal(); }
});

