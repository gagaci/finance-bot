import fs from "fs";
import path from "path";
import { DEFAULT_CATEGORIES } from "../categories";
import { Category, FinanceState, Transaction, TransactionType, User } from "../types";

const EMPTY_STATE: FinanceState = {
  users: [],
  categories: DEFAULT_CATEGORIES,
  transactions: [],
};

export class FinanceStore {
  constructor(private readonly dbPath: string) {}

  load(): FinanceState {
    if (!fs.existsSync(this.dbPath)) {
      this.save(EMPTY_STATE);
      return structuredClone(EMPTY_STATE);
    }

    const raw = fs.readFileSync(this.dbPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<FinanceState>;

    return {
      users: parsed.users || [],
      categories: parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES,
      transactions: parsed.transactions || [],
    };
  }

  save(state: FinanceState): void {
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    const tempPath = `${this.dbPath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`);
    fs.renameSync(tempPath, this.dbPath);
  }

  registerUser(chatId: number | string): User {
    const state = this.load();
    const id = String(chatId);
    const now = new Date().toISOString();
    let user = state.users.find((candidate) => candidate.chatId === id);

    if (!user) {
      user = { chatId: id, firstSeenAt: now, lastSeenAt: now };
      state.users.push(user);
    } else {
      user.lastSeenAt = now;
    }

    this.save(state);
    return user;
  }

  categories(type?: TransactionType): Category[] {
    const categories = this.load().categories;
    return type ? categories.filter((category) => category.type === type) : categories;
  }

  addTransaction(input: Omit<Transaction, "id" | "createdAt">): Transaction {
    const state = this.load();
    const transaction: Transaction = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    state.transactions.push(transaction);
    this.save(state);
    return transaction;
  }

  deleteLastTransaction(chatId: number | string): Transaction | undefined {
    const state = this.load();
    const id = String(chatId);
    const index = state.transactions
      .map((transaction, idx) => ({ transaction, idx }))
      .filter(({ transaction }) => transaction.chatId === id)
      .sort((a, b) => b.transaction.createdAt.localeCompare(a.transaction.createdAt))[0]?.idx;

    if (index === undefined) return undefined;
    const [removed] = state.transactions.splice(index, 1);
    this.save(state);
    return removed;
  }

  transactions(chatId: number | string, from: Date, to: Date): Transaction[] {
    const id = String(chatId);
    const fromTime = from.getTime();
    const toTime = to.getTime();
    return this.load().transactions.filter((transaction) => {
      const time = new Date(transaction.createdAt).getTime();
      return transaction.chatId === id && time >= fromTime && time <= toTime;
    });
  }

  knownChatIds(defaultChatId?: string): string[] {
    const ids = new Set<string>();
    if (defaultChatId) ids.add(defaultChatId);
    for (const user of this.load().users) ids.add(user.chatId);
    return [...ids];
  }
}
