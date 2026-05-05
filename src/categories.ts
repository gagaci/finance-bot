import { Category, TransactionType } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  { name: "Salary", type: "income" },
  { name: "Freelance", type: "income" },
  { name: "Gift", type: "income" },
  { name: "Investment", type: "income" },
  { name: "Other Income", type: "income" },
  { name: "Food", type: "expense", essential: true },
  { name: "Transport", type: "expense", essential: true },
  { name: "Rent", type: "expense", essential: true },
  { name: "Utilities", type: "expense", essential: true },
  { name: "Shopping", type: "expense" },
  { name: "Health", type: "expense", essential: true },
  { name: "Entertainment", type: "expense" },
  { name: "Education", type: "expense", essential: true },
  { name: "Subscriptions", type: "expense" },
  { name: "Other Expense", type: "expense" },
];

export function normalizeCategoryName(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

export function categoriesByType(categories: Category[], type: TransactionType): Category[] {
  return categories.filter((category) => category.type === type);
}

export function findCategory(
  categories: Category[],
  type: TransactionType,
  rawName: string,
): Category | undefined {
  const normalized = normalizeCategoryName(rawName);
  return categories.find(
    (category) => category.type === type && normalizeCategoryName(category.name) === normalized,
  );
}
