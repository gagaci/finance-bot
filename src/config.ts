import path from "path";

export interface AppConfig {
  token: string;
  defaultChatId?: string;
  dbPath: string;
  chartsDir: string;
  currency: string;
  dailySummaryCron: string;
  weeklyReportCron: string;
  timezone?: string;
}

function resolveLocalPath(value: string): string {
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

export function loadConfig(): AppConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  return {
    token,
    defaultChatId: process.env.TELEGRAM_CHAT_ID,
    dbPath: resolveLocalPath(process.env.DB_PATH || "./src/data/finance.json"),
    chartsDir: resolveLocalPath(process.env.CHARTS_DIR || "./src/charts"),
    currency: process.env.CURRENCY || "sum",
    dailySummaryCron: process.env.DAILY_SUMMARY_CRON || "0 21 * * *",
    weeklyReportCron: process.env.WEEKLY_REPORT_CRON || "0 20 * * 0",
    timezone: process.env.TZ,
  };
}
