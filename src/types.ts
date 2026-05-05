export type TransactionType = "income" | "expense";

export interface Category {
  name: string;
  type: TransactionType;
  essential?: boolean;
}

export interface User {
  chatId: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface Transaction {
  id: string;
  chatId: string;
  type: TransactionType;
  category: string;
  amount: number;
  note: string;
  createdAt: string;
}

export interface FinanceState {
  users: User[];
  categories: Category[];
  transactions: Transaction[];
}

export interface PeriodRange {
  label: string;
  from: Date;
  to: Date;
}

export interface PeriodReport {
  range: PeriodRange;
  transactions: Transaction[];
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  expenseByCategory: Array<{ category: string; amount: number }>;
  incomeByCategory: Array<{ category: string; amount: number }>;
  dailyExpenses: Array<{ label: string; amount: number }>;
}
