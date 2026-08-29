let selectedCategory = 'groceries';

function selectCategory(btn) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  selectedCategory = btn.dataset.cat;
}

function addExpense() {
  const desc = document.getElementById('expDesc').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  const date = document.getElementById('expDate').value;

  if (!desc)
    return showToast('Please enter a description.', 'error');
  if (isNaN(amount)||amount<=0)
     return showToast('Please enter a valid amount.', 'error');
  if (!date)
     return showToast('Please pick a date.', 'error');

  Storage.addExpense({ description: desc, amount, category: selectedCategory, date });
  document.getElementById('expDesc').value = '';
  document.getElementById('expAmount').value = '';
  document.getElementById('expDate').value = todayStr();


  const feedback = getTransactionFeedback(selectedCategory, Storage.getCategoryTotals(), Storage.getBudgets(), Storage.getTotalExpenses(), Storage.getIncome());
  if (feedback) {
    showToast(feedback.text, feedback.level === 'danger' ? 'error' : 'warn');
  } else {
    showToast('Expense added. Nice one.', 'success');
  }

  renderExpensesList();
  renderCategoryTotals();
}

function showToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + type;
  clearTimeout(window._toast);
  window._toast = setTimeout(() => { t.className = 'toast'; }, 3000);
}

function renderExpensesList() {
  const listEl = document.getElementById('expensesList');
  if (!listEl) return;
  const filter = document.getElementById('filterCat')?.value || 'all';
  const search = (document.getElementById('searchExp')?.value || '').trim().toLowerCase();
  let expenses = Storage.getExpenses();
  if (filter !== 'all') expenses = expenses.filter(e => e.category === filter);
  if (search) expenses = expenses.filter(e => (e.description || '').toLowerCase().includes(search));

  if (!expenses.length) {
    const msg = search ? `No expenses match "${search}".`
      : filter !== 'all' ? 'No expenses in this category yet.'
      : 'No expenses yet — add your first one above!';
    listEl.innerHTML = `<div class="empty-state">
      <p>${msg}</p>
    </div>`;
    return;
  }
  listEl.innerHTML = expenses.map(e => `
    <div class="expense-row" id="row-${e.id}">
      <div class="cat-dot" style="background:${(CATEGORIES[e.category]||CATEGORIES.other).color}"></div>
      <div class="expense-info">
        <div class="expense-desc">${e.description || (CATEGORIES[e.category]||CATEGORIES.other).label}</div>
        <div class="expense-meta">${(CATEGORIES[e.category]||CATEGORIES.other).label} &middot; ${formatDate(e.date)}</div>
      </div>
      <div class="expense-amount">${formatRand(e.amount)}</div>
      <div class="expense-actions">
        <button class="btn-icon" onclick="openEdit('${e.id}')" title="Edit">Edit</button>
        <button class="btn-icon del" onclick="deleteExp('${e.id}')" title="Delete">Delete</button>
      </div>
    </div>`).join('');
}

function deleteExp(id) {
  showConfirm('Delete this expense?', () => {
    Storage.deleteExpense(id);
    renderExpensesList();
    renderCategoryTotals();
    showToast('Expense deleted.', 'success');
  });
}

function openEdit(id) {
  const exp = Storage.getExpenses().find(e => e.id === id);
  if (!exp) return;
  document.getElementById('editId').value = exp.id;
  document.getElementById('editDesc').value = exp.description || '';
  document.getElementById('editCategory').value = exp.category || 'other';
  document.getElementById('editAmount').value = exp.amount || '';
  document.getElementById('editDate').value = exp.date || '';
  document.getElementById('editModal').classList.add('open');
}
function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
}
function saveEdit() {
  const id = document.getElementById('editId').value;
  const desc   = document.getElementById('editDesc').value.trim();
  const cat    = document.getElementById('editCategory').value;
  const amount = parseFloat(document.getElementById('editAmount').value);
  const date   = document.getElementById('editDate').value;
  if (!desc || isNaN(amount) || amount <= 0 || !date) {
    notify('Please fill in all fields correctly.', 'error'); return;
  }
  Storage.updateExpense(id, { description: desc, category: cat, amount, date });
  closeEditModal();
  renderExpensesList();
  renderCategoryTotals();
}

function renderCategoryTotals() {
  const el = document.getElementById('categoryTotals');
  if (!el) return;
  const totals = Storage.getCategoryTotals();
  const total  = Storage.getTotalExpenses();
  const entries = Object.entries(totals).filter(([,v]) => v > 0).sort(([,a],[,b]) => b - a);
  if (!entries.length) {
    el.innerHTML = '<p class="empty-msg">No expenses recorded yet.</p>'; return;
  }
  const max = entries[0][1];
  el.innerHTML = entries.map(([cat, amt]) => {
    const meta = CATEGORIES[cat];
    const pct  = total > 0 ? ((amt/total)*100).toFixed(0) : 0;
    const barW = max > 0 ? ((amt/max)*100).toFixed(1) : 0;
    return `<div class="cat-total-row">
      <span class="cat-name">${meta.label}</span>
      <div class="cat-bar-wrap"><div class="cat-bar" style="width:${barW}%;background:${meta.color}"></div></div>
      <span class="cat-amt">${formatRand(amt)}</span>
      <span class="cat-pct">${pct}%</span>
    </div>`;
  }).join('');
}

document.getElementById('editModal').addEventListener('click', function(e) {
  if (e.target === this) closeEditModal();
});

document.getElementById('expDate').value = todayStr();
renderExpensesList();
renderCategoryTotals();

