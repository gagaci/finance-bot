import fs from "fs";
import path from "path";
import { PeriodReport } from "../types";
import { truncate } from "./format";

const COLORS = ["#2563eb", "#16a34a", "#f97316", "#dc2626", "#7c3aed", "#0891b2", "#ca8a04", "#be123c"];

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeSvg(chartsDir: string, name: string, svg: string): string {
  ensureDir(chartsDir);
  const filePath = path.join(chartsDir, `${name}-${Date.now()}.svg`);
  fs.writeFileSync(filePath, svg);
  return filePath;
}

function svgFrame(title: string, body: string, width = 900, height = 520): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#f8fafc"/>`,
    `<text x="32" y="48" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#0f172a">${title}</text>`,
    body,
    "</svg>",
  ].join("");
}

function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  const radians = (angle - 90) * (Math.PI / 180);
  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
}

function pieSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, color: string): string {
  const [startX, startY] = polar(cx, cy, radius, endAngle);
  const [endX, endY] = polar(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `<path d="M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 0 ${endX} ${endY} Z" fill="${color}"/>`;
}

export function createExpensePieChart(report: PeriodReport, chartsDir: string): string | undefined {
  if (!report.expenseByCategory.length) return undefined;
  const total = report.expenseTotal;
  let angle = 0;
  const slices: string[] = [];
  const legend: string[] = [];

  report.expenseByCategory.forEach((item, index) => {
    const portion = item.amount / total;
    const nextAngle = angle + portion * 360;
    const color = COLORS[index % COLORS.length];
    slices.push(pieSlice(245, 280, 150, angle, nextAngle, color));
    legend.push(
      `<rect x="470" y="${130 + index * 42}" width="20" height="20" rx="4" fill="${color}"/>` +
        `<text x="505" y="${146 + index * 42}" font-family="Arial, sans-serif" font-size="18" fill="#334155">${truncate(item.category, 22)} - ${Math.round(portion * 100)}%</text>`,
    );
    angle = nextAngle;
  });

  const svg = svgFrame("Expenses by category", [...slices, ...legend].join(""));
  return writeSvg(chartsDir, "expense-pie", svg);
}

export function createIncomeExpenseBarChart(report: PeriodReport, chartsDir: string): string | undefined {
  if (!report.incomeTotal && !report.expenseTotal) return undefined;
  const max = Math.max(report.incomeTotal, report.expenseTotal, 1);
  const incomeHeight = Math.round((report.incomeTotal / max) * 300);
  const expenseHeight = Math.round((report.expenseTotal / max) * 300);

  const body = [
    `<line x1="140" y1="420" x2="760" y2="420" stroke="#94a3b8" stroke-width="2"/>`,
    `<rect x="230" y="${420 - incomeHeight}" width="150" height="${incomeHeight}" rx="8" fill="#16a34a"/>`,
    `<rect x="520" y="${420 - expenseHeight}" width="150" height="${expenseHeight}" rx="8" fill="#dc2626"/>`,
    `<text x="305" y="455" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#334155">Income</text>`,
    `<text x="595" y="455" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#334155">Expenses</text>`,
    `<text x="305" y="${400 - incomeHeight}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#0f172a">${Math.round(report.incomeTotal).toLocaleString("en-US")}</text>`,
    `<text x="595" y="${400 - expenseHeight}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#0f172a">${Math.round(report.expenseTotal).toLocaleString("en-US")}</text>`,
  ].join("");

  return writeSvg(chartsDir, "income-expense-bars", svgFrame("Income vs expenses", body));
}

export function createDailyExpenseLineChart(report: PeriodReport, chartsDir: string): string | undefined {
  if (!report.dailyExpenses.some((item) => item.amount > 0)) return undefined;
  const max = Math.max(...report.dailyExpenses.map((item) => item.amount), 1);
  const left = 100;
  const top = 100;
  const width = 700;
  const height = 300;
  const step = report.dailyExpenses.length > 1 ? width / (report.dailyExpenses.length - 1) : width;
  const points = report.dailyExpenses.map((item, index) => {
    const x = left + index * step;
    const y = top + height - (item.amount / max) * height;
    return { ...item, x, y };
  });

  const pathData = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const body = [
    `<line x1="${left}" y1="${top + height}" x2="${left + width}" y2="${top + height}" stroke="#94a3b8" stroke-width="2"/>`,
    `<line x1="${left}" y1="${top}" x2="${left}" y2="${top + height}" stroke="#94a3b8" stroke-width="2"/>`,
    `<path d="${pathData}" fill="none" stroke="#2563eb" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
    ...points.map(
      (point) =>
        `<circle cx="${point.x}" cy="${point.y}" r="7" fill="#2563eb"/>` +
        `<text x="${point.x}" y="440" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#334155">${point.label}</text>`,
    ),
  ].join("");

  return writeSvg(chartsDir, "daily-expenses", svgFrame("Daily expenses", body));
}

export function createWeeklyCharts(report: PeriodReport, chartsDir: string): string[] {
  return [
    createExpensePieChart(report, chartsDir),
    createIncomeExpenseBarChart(report, chartsDir),
    createDailyExpenseLineChart(report, chartsDir),
  ].filter((filePath): filePath is string => Boolean(filePath));
}
