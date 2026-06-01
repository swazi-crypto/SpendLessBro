/**
 * summary.js — SpendLessBro summary page
 */

let barChart = null;

const TIPS = [
  { emoji:'🎓', text:'Apply for bursaries and NSFAS if you haven\'t yet. Free money beats loans.' },
  { emoji:'🍳', text:'Cook meals in bulk on Sundays. Meal prep saves time AND food spending.' },
  { emoji:'🚌', text:'Use School Buses,Walk or cycle short distances on campus to save.' },
  { emoji:'📚', text:'Use the library for textbooks and printing — don\'t pay when you don\'t have to.' },
  { emoji:'🎯', text:'Set a weekly spending limit and track it — small amounts add up fast.' },
  { emoji:'☕', text:'One R50 coffee every day = R1,500 per month. Make it at home sometimes!' }
];

function renderSummary() {
  const income  = Storage.getIncome();
  const totals  = Storage.getCategoryTotals();
  const total   = Storage.getTotalExpenses();
  const balance = income - total;
  const savedPct = income > 0 ? Math.max(0, (balance/income)*100) : 0;

  const el = document.getElementById('summaryMonth');
  if (el) el.textContent = monthLabel();

  document.getElementById('sumIncome').textContent   = formatRand(income);
  document.getElementById('sumExpenses').textContent  = formatRand(total);
  document.getElementById('sumBalance').textContent   = formatRand(balance);
  document.getElementById('sumSavings').textContent   = savedPct.toFixed(1) + '%';

  const balVal = document.querySelector('.balance-card .stat-value');
  if (balVal) balVal.style.color = balance >= 0 ? '#c084fc' : '#ff6aa7';

  renderBarChart(totals);
  renderBreakdown(totals, total);
  renderTips();
}

function renderBarChart(totals) {
  const canvas = document.getElementById('barChart');
  if (!canvas) return;
  if (barChart) barChart.destroy();
  const entries = Object.entries(totals);
  barChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: entries.map(([k]) => CATEGORIES[k].label + ' ' + CATEGORIES[k].emoji),
      datasets: [{
        data: entries.map(([,v]) => v),
        backgroundColor: entries.map(([k]) => CATEGORIES[k].color + '99'),
        borderColor:     entries.map(([k]) => CATEGORIES[k].color),
        borderWidth: 2, borderRadius: 7, borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + formatRand(ctx.parsed.y) } }
      },
      scales: {
        x: { grid: { color: '#1e1e1e' }, ticks: { color: '#888', font: { size: 11 } } },
        y: { grid: { color: '#1e1e1e' }, ticks: { color: '#888', font: { size: 11 }, callback: v => 'R ' + v.toLocaleString() } }
      }
    }
  });
}

function renderBreakdown(totals, total) {
  const el = document.getElementById('breakdownTable');
  if (!el) return;
  const entries = Object.entries(totals).filter(([,v]) => v > 0).sort(([,a],[,b]) => b - a);
  if (!entries.length) { el.innerHTML = '<p class="empty-msg">No expenses this month yet.</p>'; return; }
  el.innerHTML = entries.map(([cat, amt]) => {
    const meta = CATEGORIES[cat];
    const pct  = total > 0 ? ((amt/total)*100).toFixed(1) : 0;
    return `<div class="breakdown-row">
      <div class="breakdown-cat">
        <div class="breakdown-badge" style="background:${meta.color}"></div>
        <span>${meta.emoji} ${meta.label}</span>
      </div>
      <div class="breakdown-amt">${formatRand(amt)}</div>
      <div class="breakdown-pct">${pct}%</div>
    </div>`;
  }).join('');
}

function renderTips() {
  const el = document.getElementById('tipsGrid');
  if (!el) return;
  const tips = [...TIPS].sort(() => .5 - Math.random()).slice(0, 4);
  el.innerHTML = tips.map(t =>
    `<div class="tip-item"><span class="tip-emoji">${t.emoji}</span>${t.text}</div>`
  ).join('');
}

renderSummary();
