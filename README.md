# Finance Bot

Telegram bot for tracking income and expenses by pre-created categories.

## Setup

1. Create a Telegram bot with BotFather.
2. Copy `.env.example` to `.env`.
3. Fill `TELEGRAM_BOT_TOKEN`.
4. Optionally set `TELEGRAM_CHAT_ID` so scheduled summaries have a default destination before any chat uses `/start`.
5. Install dependencies and run:

```bash
npm install
npm run dev
```

## Commands

```text
/start
/help
/categories
/income 5000000 Salary April salary
/expense 45000 Food Lunch
/today
/week
/month
/delete_last
```

Categories are pre-created. Names with spaces can be written as spaces or underscores:

```text
/income 300000 Other Income Gift from family
/income 300000 other_income Gift from family
```

Daily summaries are sent at `DAILY_SUMMARY_CRON`. Weekly reports are sent at `WEEKLY_REPORT_CRON`.

## Railway Deploy

You can deploy this as a Railway service.

Set these variables in Railway:

```text
TELEGRAM_BOT_TOKEN=your_bot_token
TZ=Asia/Tashkent
CURRENCY=sum
DB_PATH=/data/finance.json
CHARTS_DIR=/data/charts
DAILY_SUMMARY_CRON=0 21 * * *
WEEKLY_REPORT_CRON=0 20 * * 0
```

`TELEGRAM_CHAT_ID` is optional. Send `/start` to the bot once and it will remember your chat ID.

For persistent transaction history, add a Railway volume mounted at:

```text
/data
```

Without a volume, the bot still runs, but stored transactions may be lost when Railway redeploys or restarts the container.

## Required APIs

The MVP only needs one external credential:

- `TELEGRAM_BOT_TOKEN` from BotFather

No banking API, OpenAI API, or chart API is required. Transactions are entered manually through Telegram, reports are generated locally, and charts are created as local SVG files.
