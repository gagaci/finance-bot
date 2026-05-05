import { Category, TransactionType } from "../types";
import { findCategory } from "../categories";
import { parseAmount } from "./format";

export interface ParsedTransactionInput {
  amount: number;
  category: Category;
  note: string;
}

export interface ParseResult {
  value?: ParsedTransactionInput;
  error?: string;
}

function categoryVariants(category: Category): string[] {
  const lower = category.name.toLowerCase();
  return [lower, lower.replace(/\s+/g, "_"), lower.replace(/\s+/g, "-")];
}

function matchCategory(remainder: string, categories: Category[], type: TransactionType) {
  const typedCategories = categories
    .filter((category) => category.type === type)
    .sort((a, b) => b.name.length - a.name.length);
  const lower = remainder.toLowerCase();

  for (const category of typedCategories) {
    for (const variant of categoryVariants(category)) {
      if (lower === variant) return { category, note: "" };
      if (lower.startsWith(`${variant} `)) {
        return { category, note: remainder.slice(variant.length).trim() };
      }
      if (lower.startsWith(`${variant}:`)) {
        return { category, note: remainder.slice(variant.length + 1).trim() };
      }
    }
  }

  const firstToken = remainder.split(/\s+/)[0];
  const category = findCategory(categories, type, firstToken);
  if (!category) return undefined;
  return { category, note: remainder.slice(firstToken.length).trim() };
}

export function parseTransactionInput(
  raw: string,
  type: TransactionType,
  categories: Category[],
): ParseResult {
  const trimmed = raw.trim();
  const match = trimmed.match(/^([0-9][0-9,_.]*)\s+(.+)$/);
  if (!match) {
    return {
      error:
        type === "income"
          ? "Use: /income 5000000 Salary April salary"
          : "Use: /expense 45000 Food Lunch",
    };
  }

  const amount = parseAmount(match[1]);
  if (!amount) return { error: "Amount must be a positive number." };

  const categoryMatch = matchCategory(match[2].trim(), categories, type);
  if (!categoryMatch) {
    return { error: "I could not match that category. Send /categories to see valid names." };
  }

  return {
    value: {
      amount,
      category: categoryMatch.category,
      note: categoryMatch.note,
    },
  };
}
