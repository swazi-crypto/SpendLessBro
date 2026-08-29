
let donutChart = null;

function renderDashboard() {
  const income  = Storage.getIncome();
  const expenses = Storage.getExpenses();
  const totals  = Storage.getCategoryTotals();
  const total   = Storage.getTotalExpenses();
  const budgets = Storage.getBudgets();
  const previousMonth = Storage.getPreviousMonth();
  const balance = income - total;
  const spentPct   = income > 0 ? Math.min((total / income) * 100, 100) : 0;


  const el = document.getElementById('dashMonth');
  if (el) el.textContent = monthLabel();


  document.getElementById('statIncome').textContent   = formatRand(income);
  document.getElementById('statExpenses').textContent  = formatRand(total);
  document.getElementById('statBalance').textContent   = formatRand(balance);


  const incomeSubEl = document.getElementById('statIncomeSub');
  if (incomeSubEl) {
    const fixedIncome = Storage.getFixedIncome();
    const extraIncome = Storage.getTotalAdditionalIncome();
    incomeSubEl.textContent = extraIncome > 0
      ? `${formatRand(fixedIncome)} fixed + ${formatRand(extraIncome)} extra`
      : `${formatRand(fixedIncome)} fixed`;
  }


  const balVal = document.querySelector('.balance-card .stat-value');
  if (balVal) balVal.style.color = balance >= 0 ? '#c084fc' : '#ff6aa7';


  const bar = document.getElementById('budgetProgressBar');
  const pctEl = document.getElementById('budgetUsedPct');
  const hint = document.getElementById('progressHint');
  if (bar) { bar.style.width = spentPct + '%'; bar.className = 'progress-fill' + (spentPct >= 90 ? ' danger' : ''); }
  if (pctEl) pctEl.textContent = spentPct.toFixed(1) + '%';
  if (hint) {
    if (!income) hint.textContent = 'Set your income to start tracking';
    else if (spentPct >= 90) hint.textContent = 'You\'re almost out of money!';
    else hint.textContent = `You've used ${spentPct.toFixed(1)}% of your income this month`;
  }


  const { daysLeft } = getMonthProgress();
  const daysLeftEl = document.getElementById('daysLeftValue');
  if (daysLeftEl) daysLeftEl.textContent = daysLeft + (daysLeft === 1 ? ' day' : ' days');

  const savingsEl = document.getElementById('savingsSoFarValue');
  if (savingsEl) {
    savingsEl.textContent = (balance < 0 ? '-' : '') + formatRand(Math.abs(balance));
    savingsEl.className = 'progress-meta-value' + (balance >= 0 ? '' : ' danger');
  }

  const onTrackEl = document.getElementById('onTrackValue');
  if (onTrackEl) {
    if (!income) {
      onTrackEl.textContent = 'Set income';
      onTrackEl.className = 'progress-meta-value';
    } else {
      const onTrack = projectMonthEndTotal(total) <= income;
      onTrackEl.textContent = onTrack ? 'Yes' : 'Falling behind';
      onTrackEl.className = 'progress-meta-value ' + (onTrack ? 'ok' : 'danger');
    }
  }


  const scoreData = computeSpendLessScore({ income, total, totals, budgets, previousMonth });
  renderScore(scoreData);


  renderSavingsGoalCard();


  renderDashboardBudgetLimits(totals, budgets);

 
  renderDashboardInsights({ totals, budgets, previousMonth, total, income });


  try { renderDonut(totals); } catch (err) { console.error('Chart render failed:', err); }

  // Recent
  const recentList = document.getElementById('recentList');
  if (recentList) {
    const recent = expenses.slice(0, 5);
    if (!recent.length) {
      recentList.innerHTML = `<div class="empty-state">
        <p>Nothing here yet.<br><a href="expenses.html">Add your first expense →</a></p>
      </div>`;
    } else {
      recentList.innerHTML = recent.map(e => buildExpenseRow(e)).join('');
    }
  }

}

function renderScore(scoreData) {
  const ring = document.getElementById('scoreRing');
  const val  = document.getElementById('scoreRingValue');
  const msg  = document.getElementById('scoreMessage');
  if (!ring) return;
  const { score, message } = scoreData;
  const color = score >= 70 ? '#56cfb2' : score >= 40 ? '#f7a34e' : '#ff6a6a';
  ring.style.setProperty('--score-pct', score);
  ring.style.setProperty('--ring-color', color);
  if (val) val.textContent = score;
  if (msg) msg.textContent = message;
}

function renderDashboardBudgetLimits(totals, budgets) {
  const el = document.getElementById('dashBudgetLimits');
  const badge = document.getElementById('dashBudgetBadge');
  if (!el) return;

  let anySet = false, overCount = 0, nearCount = 0;
  el.innerHTML = BUDGET_CATEGORY_KEYS.map(key => {
    const meta = CATEGORIES[key];
    const spent = totals[key] || 0;
    const limit = budgets[key] || 0;
    const status = getCategoryStatus(spent, limit);
    if (limit > 0) {
      anySet = true;
      if (status.statusClass === 'danger') overCount++;
      else if (status.statusClass === 'warn') nearCount++;
    }
    const amtText = limit <= 0 ? 'No limit set'
      : spent > limit ? `Over by ${formatRand(spent - limit)}`
      : `${formatRand(limit - spent)} left`;
    return `<div class="limit-chip">
      <span class="cat-dot" style="background:${meta.color}"></span>
      <span class="limit-chip-name">${meta.label}</span>
      <span class="limit-chip-status ${status.statusClass}">${status.statusLabel}</span>
      <span class="limit-chip-amt">${amtText}</span>
    </div>`;
  }).join('');

  if (badge) {
    if (!anySet) { badge.textContent = 'Set your limits'; badge.className = 'budget-overall-badge none'; }
    else if (overCount > 0) { badge.textContent = `Over in ${overCount}`; badge.className = 'budget-overall-badge danger'; }
    else if (nearCount > 0) { badge.textContent = `Watch ${nearCount}`; badge.className = 'budget-overall-badge warn'; }
    else { badge.textContent = 'On track'; badge.className = 'budget-overall-badge ok'; }
  }
}

function renderDashboardInsights(data) {
  const el = document.getElementById('dashInsights');
  if (!el) return;
  const insights = generateInsights(data).slice(0, 3);
  if (!insights.length) {
    el.innerHTML = '<p class="empty-msg">Add a few expenses to start seeing insights here.</p>';
    return;
  }
  el.innerHTML = insights.map(text => `<div class="insight-row">${text}</div>`).join('');
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
      labels: entries.map(([k]) => CATEGORIES[k].label),
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
  return `<div class="expense-row" id="row-${e.id}">
    <div class="cat-dot" style="background:${cat.color}"></div>
    <div class="expense-info">
      <div class="expense-desc">${e.description || cat.label}</div>
      <div class="expense-meta">${cat.label} · ${formatDate(e.date)}</div>
    </div>
    <div class="expense-amount">${formatRand(e.amount)}</div>
    <div class="expense-actions">
      <button class="btn-icon del" onclick="deleteFromDashboard('${e.id}')" title="Delete">Delete</button>
    </div>
  </div>`;
}

function deleteFromDashboard(id) {
  showConfirm('Delete this expense?', () => {
    Storage.deleteExpense(id);
    renderDashboard();
    notify('Expense deleted.');
  });
}
