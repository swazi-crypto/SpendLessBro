/**
 * dashboard.js — SpendLessBro dashboard page
 */

let donutChart = null;

function renderDashboard() {
  const income  = Storage.getIncome();
  const expenses = Storage.getExpenses();
  const totals  = Storage.getCategoryTotals();
  const total   = Storage.getTotalExpenses();
  const balance = income - total;
  const savingsPct = income > 0 ? Math.max(0, (balance / income) * 100) : 0;
  const spentPct   = income > 0 ? Math.min((total / income) * 100, 100) : 0;

  // Month label
  const el = document.getElementById('dashMonth');
  if (el) el.textContent = monthLabel();

  // Stat cards
  document.getElementById('statIncome').textContent   = formatRand(income);
  document.getElementById('statExpenses').textContent  = formatRand(total);
  document.getElementById('statBalance').textContent   = formatRand(balance);
  document.getElementById('statSavings').textContent   = (income > 0 ? savingsPct.toFixed(1) : 0) + '%';

  // Balance colour
  const balVal = document.querySelector('.balance-card .stat-value');
  if (balVal) balVal.style.color = balance >= 0 ? '#c084fc' : '#ff6aa7';

  // Progress bar
  const bar = document.getElementById('budgetProgressBar');
  const pctEl = document.getElementById('budgetUsedPct');
  const hint = document.getElementById('progressHint');
  if (bar) { bar.style.width = spentPct + '%'; bar.className = 'progress-fill' + (spentPct >= 90 ? ' danger' : ''); }
  if (pctEl) pctEl.textContent = spentPct.toFixed(1) + '%';
  if (hint) {
    if (!income) hint.textContent = 'Set your income to start tracking';
    else if (spentPct >= 90) hint.textContent = '⚠️ You\'re almost out of budget!';
    else hint.textContent = `You've used ${spentPct.toFixed(1)}% of your monthly budget`;
  }

  // Chart
  renderDonut(totals);

  // Insights
  const insights = generateInsights(income, totals, total);
  const insightsList = document.getElementById('insightsList');
  if (insightsList) {
    insightsList.innerHTML = insights.map(i =>
      `<div class="insight-item ${i.type}">
        <span class="insight-icon">${i.icon}</span>
        <span>${i.text}</span>
      </div>`
    ).join('');
  }

  // Recent
  const recentList = document.getElementById('recentList');
  if (recentList) {
    const recent = expenses.slice(0, 5);
    if (!recent.length) {
      recentList.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🤔</div>
        <p>Nothing here yet.<br><a href="expenses.html">Add your first expense →</a></p>
      </div>`;
    } else {
      recentList.innerHTML = recent.map(e => buildExpenseRow(e)).join('');
    }
  }

  // Show income modal on first visit if no income set
  if (!income && !expenses.length) {
    setTimeout(openIncomeModal, 600);
  }
}

function renderDonut(totals) {
  const canvas = document.getElementById('donutChart');
  const emptyEl = document.getElementById('chartEmpty');
  if (!canvas) return;

  const entries = Object.entries(totals).filter(([,v]) => v > 0);
  if (!entries.length) {
    if (emptyEl) emptyEl.classList.add('visible');
    canvas.style.display = 'none';
    return;
  }
  if (emptyEl) emptyEl.classList.remove('visible');
  canvas.style.display = 'block';

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: entries.map(([k]) => CATEGORIES[k].label + ' ' + CATEGORIES[k].emoji),
      datasets: [{
        data: entries.map(([,v]) => v),
        backgroundColor: entries.map(([k]) => CATEGORIES[k].color),
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#888', font: { size: 11, family: 'Inter' }, padding: 12, boxWidth: 10, boxHeight: 10 }
        },
        tooltip: { callbacks: { label: ctx => ' ' + formatRand(ctx.parsed) } }
      }
    }
  });
}

function buildExpenseRow(e) {
  const cat = CATEGORIES[e.category] || CATEGORIES.other;
  return `<div class="expense-row">
    <div class="cat-dot ${e.category}">${cat.emoji}</div>
    <div class="expense-info">
      <div class="expense-desc">${e.description || cat.label}</div>
      <div class="expense-meta">${cat.label} · ${formatDate(e.date)}</div>
    </div>
    <div class="expense-amount">${formatRand(e.amount)}</div>
  </div>`;
}
