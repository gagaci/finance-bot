import TelegramBot from "node-telegram-bot-api";
import { escapeHtml } from "./services/format";

const TELEGRAM_LIMIT = 4096;

export function createBot(token: string, polling = true): TelegramBot {
  return new TelegramBot(token, { polling });
}

function splitMessage(text: string, limit = TELEGRAM_LIMIT): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > limit) {
    let splitAt = remaining.lastIndexOf("\n\n", limit);
    if (splitAt < limit / 2) splitAt = remaining.lastIndexOf("\n", limit);
    if (splitAt < limit / 2) splitAt = remaining.lastIndexOf(" ", limit);
    if (splitAt <= 0) splitAt = limit;

    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

export async function sendHtmlMessage(
  bot: TelegramBot,
  chatId: number | string,
  text: string,
): Promise<void> {
  for (const chunk of splitMessage(text)) {
    try {
      await bot.sendMessage(chatId, chunk, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    } catch (err) {
      console.warn("[telegram] HTML send failed, retrying plain:", (err as Error).message);
      await bot.sendMessage(chatId, chunk.replace(/<[^>]+>/g, ""));
    }
  }
}

export async function sendChartFiles(
  bot: TelegramBot,
  chatId: number | string,
  filePaths: string[],
): Promise<void> {
  for (const filePath of filePaths) {
    await bot.sendDocument(chatId, filePath, {
      caption: escapeHtml(filePath.split("/").pop() || "chart"),
      parse_mode: "HTML",
    });
  }
}
