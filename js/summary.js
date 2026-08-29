const TIPS = [
  { text:'Apply for bursaries and NSFAS if you haven\'t yet. Free money beats loans.' },
  { text:'Cook meals in bulk on Sundays. Meal prep saves time AND food spending.' },
  { text:'Use school buses, walk or cycle short distances on campus to save.' },
  { text:'Use the library for textbooks and printing — don\'t pay when you don\'t have to.' },
  { text:'Set a weekly spending limit and track it — small amounts add up fast.' },
  { text:'One R50 coffee every day = R1,500 per month. Make it at home sometimes!' }
];

function renderSummary() {
  const income  = Storage.getIncome();
  const totals  = Storage.getCategoryTotals();
  const total   = Storage.getTotalExpenses();
  const budgets = Storage.getBudgets();
  const previousMonth = Storage.getPreviousMonth();

  const el = document.getElementById('summaryMonth');
  if (el) el.textContent = monthLabel();

  renderPace(income, total);
  renderSavingsGoalCard();
  renderBudgetPerformance(totals, budgets);
  renderTrend(totals, previousMonth, total);
  renderFullInsights({ totals, budgets, previousMonth, total, income });
  renderTips();
}

function renderPace(income, total) {
  const el = document.getElementById('paceText');
  if (!el) return;

  if (!total) {
    el.innerHTML = 'No spending logged yet this month — add an expense to see your pace.';
    return;
  }

  const projected = projectMonthEndTotal(total);

  if (!income) {
    el.innerHTML = `At this rate, you're on track to spend about <strong>${formatRand(projected)}</strong> this month. Set your income on Vibe Check to see if that's within reach.`;
    return;
  }

  if (projected <= income) {
    el.innerHTML = `At this rate, you're on track to spend about <strong>${formatRand(projected)}</strong> this month — comfortably within your ${formatRand(income)} income.`;
  } else {
    el.innerHTML = `At this rate, you're on track to spend about <strong>${formatRand(projected)}</strong> this month — that's <strong>${formatRand(projected - income)}</strong> over your ${formatRand(income)} income. Might be worth slowing down.`;
  }
}

function renderBudgetPerformance(totals, budgets) {
  const el = document.getElementById('budgetPerformance');
  const badge = document.getElementById('budgetOverallBadge');
  const fixedEl = document.getElementById('fixedCosts');
  if (!el) return;

  let anyBudgetSet = false;
  let overCount = 0;
  let nearCount = 0;

  el.innerHTML = BUDGET_CATEGORY_KEYS.map(key => {
    const meta = CATEGORIES[key];
    const spent = totals[key] || 0;
    const limit = budgets[key] || 0;
    const status = getCategoryStatus(spent, limit);
    if (limit > 0) {
      anyBudgetSet = true;
      if (status.statusClass === 'danger') overCount++;
      else if (status.statusClass === 'warn') nearCount++;
    }

    return `<div class="budget-row">
      <div class="budget-row-top">
        <span class="budget-cat"><span class="cat-dot" style="background:${meta.color}"></span>${meta.label}</span>
        <span class="budget-amounts">${formatRand(spent)}${limit > 0 ? ' / ' + formatRand(limit) : ''}</span>
      </div>
      <div class="budget-track"><div class="budget-fill ${status.statusClass}" style="width:${status.pct}%"></div></div>
      <div class="budget-status ${status.statusClass}">${limit > 0 ? status.statusText : 'No budget set'}</div>
    </div>`;
  }).join('');

  if (fixedEl) {
    const subsSpent = totals.subscriptions || 0;
    fixedEl.textContent = `Subscriptions (fixed): ${formatRand(subsSpent)} this month — tracked, not budget-limited.`;
  }

  if (badge) {
    if (!anyBudgetSet) {
      badge.textContent = 'No budgets set';
      badge.className = 'budget-overall-badge none';
    } else if (overCount > 0) {
      badge.textContent = `Over in ${overCount} categor${overCount === 1 ? 'y' : 'ies'}`;
      badge.className = 'budget-overall-badge danger';
    } else if (nearCount > 0) {
      badge.textContent = `Near limit in ${nearCount}`;
      badge.className = 'budget-overall-badge warn';
    } else {
      badge.textContent = 'On track';
      badge.className = 'budget-overall-badge ok';
    }
  }
}

function renderTrend(totals, previousMonth, total) {
  const el = document.getElementById('trendList');
  const overallEl = document.getElementById('trendOverall');
  if (!el) return;


  if (!previousMonth) {
    el.innerHTML = '';
    if (overallEl) {
      overallEl.textContent = "You've only been using SpendLessBro for one month so far — this card will compare you to real numbers once you've done your first Monthly Reset.";
      overallEl.className = 'pace-text';
    }
    return;
  }

  const prevTotals = previousMonth.totals || {};
  const prevTotal = Object.values(prevTotals).reduce((a, b) => a + b, 0);

  const rows = Object.keys(CATEGORIES).map(key => {
    const spent = totals[key] || 0;
    const prev = prevTotals[key] || 0;
    if (!spent && !prev) return null;
    const change = prev > 0 ? ((spent - prev) / prev) * 100 : (spent > 0 ? 100 : 0);
    return { key, spent, prev, change };
  }).filter(Boolean).sort((a, b) => b.spent - a.spent);

  if (!rows.length) {
    el.innerHTML = '<p class="empty-msg">Add some expenses to see how this month compares.</p>';
  } else {
    el.innerHTML = rows.map(r => {
      const meta = CATEGORIES[r.key];
      const up = r.change > 0.5;
      const down = r.change < -0.5;
      const changeClass = up ? 'danger' : down ? 'ok' : 'none';
      const changeText = Math.abs(r.change) < 0.5 ? 'about the same as last month'
        : `${up ? 'up' : 'down'} ${Math.abs(Math.round(r.change))}% vs last month`;
      return `<div class="trend-row">
        <span class="budget-cat"><span class="cat-dot" style="background:${meta.color}"></span>${meta.label}</span>
        <span class="trend-amounts">${formatRand(r.spent)} <span class="trend-vs">(was ${formatRand(r.prev)})</span></span>
        <span class="trend-change ${changeClass}">${changeText}</span>
      </div>`;
    }).join('');
  }

  if (overallEl) {
    if (prevTotal > 0 && total > 0) {
      const overallChange = ((total - prevTotal) / prevTotal) * 100;
      const up = overallChange > 0.5;
      const down = overallChange < -0.5;
      overallEl.textContent = Math.abs(overallChange) < 0.5
        ? "Your total spending is about the same as last month."
        : `Your total spending is ${up ? 'up' : 'down'} ${Math.abs(Math.round(overallChange))}% compared with last month (${formatRand(prevTotal)} → ${formatRand(total)}).`;
      overallEl.className = 'pace-text' + (up ? ' trend-bad' : down ? ' trend-good' : '');
    } else {
      overallEl.textContent = "Add expenses this month to compare against last month's spending.";
      overallEl.className = 'pace-text';
    }
  }
}

function renderFullInsights(data) {
  const el = document.getElementById('fullInsights');
  if (!el) return;
  const insights = generateInsights(data);
  el.innerHTML = insights.map(text => `<div class="insight-row">${text}</div>`).join('');
}

function renderTips() {
  const el = document.getElementById('tipsGrid');
  if (!el) return;
  const tips = [...TIPS].sort(() => .5 - Math.random()).slice(0, 4);
  el.innerHTML = tips.map(t =>
    `<div class="tip-item">${t.text}</div>`
  ).join('');
}

renderSummary();
