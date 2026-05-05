import * as dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import TelegramBot from "node-telegram-bot-api";
import { categoriesByType } from "./categories";
import { loadConfig } from "./config";
import { createWeeklyCharts } from "./services/charts";
import { monthRange, todayRange, weekRange } from "./services/date";
import { escapeHtml, formatMoney } from "./services/format";
import { parseTransactionInput } from "./services/parser";
import { buildPeriodReport, buildPreviousWeekReport, buildReportText } from "./services/report";
import { FinanceStore } from "./services/storage";
import { TransactionType } from "./types";
import { createBot, sendChartFiles, sendHtmlMessage } from "./telegram";

function helpText(): string {
  return [
    "<b>Finance Bot</b>",
    "",
    "Track income and expenses by category.",
    "",
    "<b>Commands</b>",
    "/categories - show categories",
    "/income 5000000 Salary April salary",
    "/expense 45000 Food Lunch",
    "/today - today's summary",
    "/week - weekly report with charts",
    "/month - monthly report",
    "/delete_last - remove your latest transaction",
    "",
    "Category names with spaces also work with underscores:",
    "/expense 99000 other_expense Card fee",
  ].join("\n");
}

function categoriesText(store: FinanceStore): string {
  const categories = store.categories();
  const income = categoriesByType(categories, "income").map((category) => `- ${category.name}`).join("\n");
  const expenses = categoriesByType(categories, "expense").map((category) => `- ${category.name}`).join("\n");

  return [
    "<b>Income categories</b>",
    escapeHtml(income),
    "",
    "<b>Expense categories</b>",
    escapeHtml(expenses),
  ].join("\n");
}

function usageFor(type: TransactionType): string {
  return type === "income"
    ? "Use: /income 5000000 Salary April salary"
    : "Use: /expense 45000 Food Lunch";
}

async function handleTransactionCommand(
  bot: TelegramBot,
  store: FinanceStore,
  currency: string,
  chatId: number,
  type: TransactionType,
  rawInput = "",
): Promise<void> {
  store.registerUser(chatId);

  if (!rawInput.trim()) {
    await sendHtmlMessage(bot, chatId, usageFor(type));
    return;
  }

  const parsed = parseTransactionInput(rawInput, type, store.categories());
  if (parsed.error || !parsed.value) {
    await sendHtmlMessage(bot, chatId, escapeHtml(parsed.error || usageFor(type)));
    return;
  }

  const transaction = store.addTransaction({
    chatId: String(chatId),
    type,
    category: parsed.value.category.name,
    amount: parsed.value.amount,
    note: parsed.value.note,
  });

  const note = transaction.note ? `\n<b>Note:</b> ${escapeHtml(transaction.note)}` : "";
  await sendHtmlMessage(
    bot,
    chatId,
    [
      "<b>Saved transaction</b>",
      `<b>Type:</b> ${transaction.type}`,
      `<b>Amount:</b> ${formatMoney(transaction.amount, currency)}`,
      `<b>Category:</b> ${escapeHtml(transaction.category)}${note}`,
    ].join("\n"),
  );
}

async function sendReport(
  bot: TelegramBot,
  store: FinanceStore,
  chatId: number | string,
  range: ReturnType<typeof todayRange>,
  currency: string,
  chartsDir?: string,
  includeAdvice = false,
): Promise<void> {
  const report = buildPeriodReport(store, chatId, range);
  const previous = includeAdvice ? buildPreviousWeekReport(store, chatId) : undefined;
  const text = buildReportText(report, currency, {
    includeAdvice,
    previousReport: previous,
    categories: store.categories(),
  });

  await sendHtmlMessage(bot, chatId, text);

  if (chartsDir) {
    const chartPaths = createWeeklyCharts(report, chartsDir);
    if (chartPaths.length) await sendChartFiles(bot, chatId, chartPaths);
  }
}

export async function runDailySummary(): Promise<void> {
  const config = loadConfig();
  const store = new FinanceStore(config.dbPath);
  const bot = createBot(config.token, false);
  const chatIds = store.knownChatIds(config.defaultChatId);
  if (!chatIds.length) throw new Error("No known chat IDs. Send /start first or set TELEGRAM_CHAT_ID.");

  for (const chatId of chatIds) {
    await sendReport(bot, store, chatId, todayRange(), config.currency);
  }
}

export async function runWeeklyReport(): Promise<void> {
  const config = loadConfig();
  const store = new FinanceStore(config.dbPath);
  const bot = createBot(config.token, false);
  const chatIds = store.knownChatIds(config.defaultChatId);
  if (!chatIds.length) throw new Error("No known chat IDs. Send /start first or set TELEGRAM_CHAT_ID.");

  for (const chatId of chatIds) {
    await sendReport(bot, store, chatId, weekRange(), config.currency, config.chartsDir, true);
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const store = new FinanceStore(config.dbPath);
  const bot = createBot(config.token, true);

  await bot
    .setMyCommands([
      { command: "start", description: "Start finance tracking" },
      { command: "help", description: "Show command help" },
      { command: "categories", description: "Show categories" },
      { command: "income", description: "Add income, e.g. /income 5000000 Salary April salary" },
      { command: "expense", description: "Add expense, e.g. /expense 45000 Food Lunch" },
      { command: "today", description: "Show today's summary" },
      { command: "week", description: "Show weekly report" },
      { command: "month", description: "Show monthly report" },
      { command: "delete_last", description: "Delete the latest transaction" },
    ])
    .catch((err) => console.warn("[bot] setMyCommands failed:", err.message));

  bot.onText(/^\/start(\s|$)/, async (msg) => {
    store.registerUser(msg.chat.id);
    await sendHtmlMessage(bot, msg.chat.id, `${helpText()}\n\nYour chat ID is <code>${msg.chat.id}</code>.`);
  });

  bot.onText(/^\/help(\s|$)/, async (msg) => {
    store.registerUser(msg.chat.id);
    await sendHtmlMessage(bot, msg.chat.id, helpText());
  });

  bot.onText(/^\/categories(\s|$)/, async (msg) => {
    store.registerUser(msg.chat.id);
    await sendHtmlMessage(bot, msg.chat.id, categoriesText(store));
  });

  bot.onText(/^\/income(?:\s+([\s\S]+))?$/, async (msg, match) => {
    await handleTransactionCommand(bot, store, config.currency, msg.chat.id, "income", match?.[1]);
  });

  bot.onText(/^\/expense(?:\s+([\s\S]+))?$/, async (msg, match) => {
    await handleTransactionCommand(bot, store, config.currency, msg.chat.id, "expense", match?.[1]);
  });

  bot.onText(/^\/today(\s|$)/, async (msg) => {
    store.registerUser(msg.chat.id);
    await sendReport(bot, store, msg.chat.id, todayRange(), config.currency);
  });

  bot.onText(/^\/week(\s|$)|^\/report(\s|$)/, async (msg) => {
    store.registerUser(msg.chat.id);
    await sendReport(bot, store, msg.chat.id, weekRange(), config.currency, config.chartsDir, true);
  });

  bot.onText(/^\/month(\s|$)/, async (msg) => {
    store.registerUser(msg.chat.id);
    await sendReport(bot, store, msg.chat.id, monthRange(), config.currency, config.chartsDir, true);
  });

  bot.onText(/^\/delete_last(\s|$)/, async (msg) => {
    store.registerUser(msg.chat.id);
    const deleted = store.deleteLastTransaction(msg.chat.id);
    if (!deleted) {
      await sendHtmlMessage(bot, msg.chat.id, "No transaction found to delete.");
      return;
    }

    await sendHtmlMessage(
      bot,
      msg.chat.id,
      `Deleted: ${deleted.type} ${formatMoney(deleted.amount, config.currency)} in ${escapeHtml(deleted.category)}`,
    );
  });

  bot.on("polling_error", (err) => {
    console.error("[bot] polling error:", err.message);
  });

  const cronOptions = config.timezone ? { timezone: config.timezone } : undefined;
  cron.schedule(
    config.dailySummaryCron,
    async () => {
      console.log(`[cron] daily summary at ${new Date().toISOString()}`);
      for (const chatId of store.knownChatIds(config.defaultChatId)) {
        try {
          await sendReport(bot, store, chatId, todayRange(), config.currency);
        } catch (err) {
          console.error(`[cron] daily failed for ${chatId}:`, (err as Error).message);
        }
      }
    },
    cronOptions,
  );

  cron.schedule(
    config.weeklyReportCron,
    async () => {
      console.log(`[cron] weekly report at ${new Date().toISOString()}`);
      for (const chatId of store.knownChatIds(config.defaultChatId)) {
        try {
          await sendReport(bot, store, chatId, weekRange(), config.currency, config.chartsDir, true);
        } catch (err) {
          console.error(`[cron] weekly failed for ${chatId}:`, (err as Error).message);
        }
      }
    },
    cronOptions,
  );

  console.log(`Finance bot running. Daily: "${config.dailySummaryCron}". Weekly: "${config.weeklyReportCron}".`);
  console.log(`DB: ${config.dbPath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[fatal]", err);
    process.exit(1);
  });
}
