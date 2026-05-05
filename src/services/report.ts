import { categoriesByType } from "../categories";
import { Category, PeriodRange, PeriodReport, Transaction } from "../types";
import { addDays, dayLabel, formatDate, previousWeekRange } from "./date";
import { escapeHtml, formatMoney, formatPercent, formatSignedMoney } from "./format";
import { FinanceStore } from "./storage";

function sum(transactions: Transaction[], type: "income" | "expense"): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0);
}

function groupByCategory(
  transactions: Transaction[],
  type: "income" | "expense",
): Array<{ category: string; amount: number }> {
  const totals = new Map<string, number>();
  for (const transaction of transactions.filter((item) => item.type === type)) {
    totals.set(transaction.category, (totals.get(transaction.category) || 0) + transaction.amount);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function buildDailyExpenseSeries(
  transactions: Transaction[],
  range: PeriodRange,
): Array<{ label: string; amount: number }> {
  const series: Array<{ label: string; amount: number }> = [];
  let cursor = new Date(range.from);

  while (cursor.getTime() <= range.to.getTime()) {
    const label = dayLabel(cursor);
    const day = cursor.toDateString();
    const amount = transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" && new Date(transaction.createdAt).toDateString() === day,
      )
      .reduce((total, transaction) => total + transaction.amount, 0);
    series.push({ label, amount });
    cursor = addDays(cursor, 1);
  }

  return series;
}

export function buildPeriodReport(
  store: FinanceStore,
  chatId: number | string,
  range: PeriodRange,
): PeriodReport {
  const transactions = store.transactions(chatId, range.from, range.to);
  const incomeTotal = sum(transactions, "income");
  const expenseTotal = sum(transactions, "expense");

  return {
    range,
    transactions,
    incomeTotal,
    expenseTotal,
    netTotal: incomeTotal - expenseTotal,
    expenseByCategory: groupByCategory(transactions, "expense"),
    incomeByCategory: groupByCategory(transactions, "income"),
    dailyExpenses: buildDailyExpenseSeries(transactions, range),
  };
}

function categoryLines(
  items: Array<{ category: string; amount: number }>,
  total: number,
  currency: string,
): string {
  if (!items.length) return "None";
  return items
    .map((item) => {
      const percent = total > 0 ? (item.amount / total) * 100 : 0;
      return `- ${escapeHtml(item.category)}: ${formatMoney(item.amount, currency)} (${formatPercent(percent)})`;
    })
    .join("\n");
}

function biggestNonEssentialExpense(report: PeriodReport, categories: Category[]) {
  const expenseCategories = categoriesByType(categories, "expense");
  return report.expenseByCategory.find((item) => {
    const category = expenseCategories.find((candidate) => candidate.name === item.category);
    return !category?.essential;
  });
}

export function buildReportText(
  report: PeriodReport,
  currency: string,
  options?: { includeAdvice?: boolean; previousReport?: PeriodReport; categories?: Category[] },
): string {
  const savingsRate =
    report.incomeTotal > 0 ? ((report.incomeTotal - report.expenseTotal) / report.incomeTotal) * 100 : 0;
  const topExpense = report.expenseByCategory[0];
  const period = `${formatDate(report.range.from)} - ${formatDate(report.range.to)}`;

  const lines = [
    `<b>${escapeHtml(report.range.label)} financial report</b>`,
    `<i>${escapeHtml(period)}</i>`,
    "",
    `<b>Income:</b> ${formatMoney(report.incomeTotal, currency)}`,
    `<b>Expenses:</b> ${formatMoney(report.expenseTotal, currency)}`,
    `<b>Net:</b> ${formatSignedMoney(report.netTotal, currency)}`,
    `<b>Savings rate:</b> ${formatPercent(savingsRate)}`,
    "",
    "<b>Expenses by category</b>",
    categoryLines(report.expenseByCategory, report.expenseTotal, currency),
  ];

  if (report.incomeByCategory.length) {
    lines.push("", "<b>Income by category</b>");
    lines.push(categoryLines(report.incomeByCategory, report.incomeTotal, currency));
  }

  if (topExpense) {
    lines.push(
      "",
      `<b>Top spending category:</b> ${escapeHtml(topExpense.category)} (${formatMoney(topExpense.amount, currency)})`,
    );
  }

  if (options?.includeAdvice) {
    lines.push("", "<b>Behavior and advice</b>");
    lines.push(...buildAdvice(report, currency, options.previousReport, options.categories || []));
  }

  return lines.join("\n");
}

export function buildAdvice(
  report: PeriodReport,
  currency: string,
  previousReport?: PeriodReport,
  categories: Category[] = [],
): string[] {
  const advice: string[] = [];
  const savingsRate =
    report.incomeTotal > 0 ? ((report.incomeTotal - report.expenseTotal) / report.incomeTotal) * 100 : 0;

  if (report.transactions.length === 0) {
    return ["- No transactions were recorded for this period. Start with small, consistent entries."];
  }

  if (report.expenseTotal > report.incomeTotal && report.incomeTotal > 0) {
    advice.push("- Expenses were higher than income. Review optional categories before adding new purchases.");
  } else if (savingsRate >= 25) {
    advice.push("- Strong saving pace. Keep protecting this margin before increasing lifestyle spending.");
  } else if (report.incomeTotal > 0) {
    advice.push("- Savings rate is below 25%. Try setting a weekly cap for your largest optional category.");
  }

  const optional = biggestNonEssentialExpense(report, categories);
  if (optional) {
    advice.push(
      `- Biggest optional category: ${escapeHtml(optional.category)} at ${formatMoney(optional.amount, currency)}. This is the easiest place to tune next week.`,
    );
  }

  if (previousReport && previousReport.expenseTotal > 0) {
    const change = ((report.expenseTotal - previousReport.expenseTotal) / previousReport.expenseTotal) * 100;
    if (change >= 20) {
      advice.push(`- Spending rose ${formatPercent(change)} versus last week. Check what changed before it becomes normal.`);
    } else if (change <= -20) {
      advice.push(`- Spending fell ${formatPercent(Math.abs(change))} versus last week. Good pattern to repeat.`);
    }
  }

  if (!advice.length) {
    advice.push("- Spending looks balanced. Keep logging daily so weekly decisions stay based on facts.");
  }

  return advice;
}

export function buildPreviousWeekReport(store: FinanceStore, chatId: number | string): PeriodReport {
  return buildPeriodReport(store, chatId, previousWeekRange());
}
