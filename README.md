# SpendLessBro 
A free budget tracker built for South African NSFAS students — because the allowance disappears fast, and it helps to actually see where it goes.

No sign up. No server. Just open and use.

---

## What it does

SpendLessBro tracks your monthly income and spending, breaks it down by category, and actually tells you something useful about your habits instead of just logging numbers. Specifically, it lets you:

- Track a fixed monthly income (like your NSFAS allowance) plus any extra money that comes in during the month
- Log, edit, delete, search, and filter every expense
- Set spending limits per category (Groceries, Transport, Fast Food, Shopping, Entertainment, Other)
- Set a Savings Goal — a target for how much you want left over by the end of the month
- See a SpendLess Score (0–100) that sums up how the month is going
- Get plain-language, personality-driven feedback when you're overspending, running low, or doing well
- Compare this month to last month once you've used the app for more than one month
- Export your data to CSV
- Reset everything at the start of a new month while keeping your budgets, savings goal, and fixed income in place
---


## Files

```
spendlessbro/
├── index.html       ← Dashboard (home)
├── expenses.html    ← Add & manage expenses
├── summary.html     ← Charts & monthly overview
├── css/style.css    ← All styling
└── js/
    ├── storage.js   ← Saves your data locally
    ├── app.js       ← Shared code
    ├── dashboard.js ← Dashboard logic
    ├── expenses.js  ← Add/edit/delete expenses
    └── summary.js   ← Charts and breakdown
```

## Built with

- HTML, CSS, JavaScript (no frameworks)
- Chart.js for the charts
- localStorage 


