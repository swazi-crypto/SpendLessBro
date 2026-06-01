/**
 * app.js — Shared utilities (SpendLessBro)
 */

const CATEGORIES = {
  transport:     { label: 'Transport',    emoji: '🚌', color: '#7c6cfa' },
  food:          { label: 'Food',         emoji: '🍔', color: '#56cfb2' },
  data:          { label: 'Data/Airtime', emoji: '📱', color: '#f7a34e' },
  entertainment: { label: 'Entertainment',emoji: '🎮', color: '#ff6aa7' },
  other:         { label: 'Other',        emoji: '📦', color: '#888888' }
};

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

function openIncomeModal() {
  const modal = document.getElementById('incomeModal');
  if (!modal) return;
  const v = Storage.getIncome();
  if (v > 0) document.getElementById('incomeInput').value = v;
  modal.classList.add('open');
  setTimeout(() => document.getElementById('incomeInput').focus(), 100);
}
function closeIncomeModal() {
  const m = document.getElementById('incomeModal');
  if (m) m.classList.remove('open');
}
function saveIncome() {
  const val = parseFloat(document.getElementById('incomeInput').value);
  if (isNaN(val) || val < 0) { alert('Please enter a valid amount.'); return; }
  Storage.setIncome(val);
  closeIncomeModal();
  if (typeof renderDashboard === 'function') renderDashboard();
}

function resetMonth() {
  if (!confirm('Reset all data for this month? This cannot be undone.')) return;
  Storage.resetMonth();
  if (typeof renderDashboard   === 'function') renderDashboard();
  if (typeof renderExpensesList=== 'function') { renderExpensesList(); renderCategoryTotals(); }
  if (typeof renderSummary     === 'function') renderSummary();
}

function exportCSV() {
  const expenses = Storage.getExpenses();
  if (!expenses.length) { alert('No expenses to export.'); return; }
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

function generateInsights(income, totals, total) {
  const insights = [];
  if (!income) return [{ icon:'ℹ️', text:'Set your monthly income to get personalised tips.', type:'' }];
  if (!total)  return [{ icon:'🎉', text:'No expenses yet — your money is still safe! Add expenses to track your spending.', type:'good' }];

  const pct    = (total / income) * 100;
  const saved  = 100 - pct;

  if (saved >= 20)     insights.push({ icon:'🎉', text:`You've saved ${saved.toFixed(0)}% this month — amazing!`, type:'good' });
  else if (saved > 0)  insights.push({ icon:'💡', text:`You've saved ${saved.toFixed(0)}% — try to hit 20%.`, type:'warn' });
  else                 insights.push({ icon:'🚨', text:'You've spent more than your income this month. Time to cut back!', type:'alert' });

  if (totals.entertainment > 0 && (totals.entertainment/income*100) > 15)
    insights.push({ icon:'🎮', text:`Entertainment is eating ${(totals.entertainment/income*100).toFixed(0)}% of your income. Can you reduce it?`, type:'warn' });
  if (totals.transport > 0 && (totals.transport/income*100) > 20)
    insights.push({ icon:'🚌', text:`Transport is ${(totals.transport/income*100).toFixed(0)}% of income. Walk where you can!`, type:'warn' });
  if (totals.food > 0 && (totals.food/income*100) > 30)
    insights.push({ icon:'🍔', text:`Food is ${(totals.food/income*100).toFixed(0)}% of income. Try cooking at home more.`, type:'warn' });
  if (pct < 50 && total > 0)
    insights.push({ icon:'📊', text:`Only ${pct.toFixed(0)}% of your income spent so far. Great discipline!`, type:'good' });

  return insights.slice(0, 5);
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

// ---- Auto skip welcome if returning visitor ----
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
  // else: welcome screen stays visible, user clicks the button
});

// close income modal on outside click
document.addEventListener('click', e => {
  const m = document.getElementById('incomeModal');
  if (m && e.target === m) closeIncomeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const m = document.getElementById('incomeModal');
    if (m?.classList.contains('open')) saveIncome();
  }
});
