import { quotes, type Quote } from "@/data/quotes";

export const DAILY_QUOTES: string[] = quotes.map((q: Quote) => q.text);

const STORAGE_KEY = "nc:daily-quote";

type QuoteState = {
  day: string;
  index: number;
  bag: number[];
};

/** Local calendar day key so rotation follows the device's midnight. */
export function localDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shuffledBag(total: number): number[] {
  const bag = Array.from({ length: total }, (_, i) => i);
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j] as number, bag[i] as number];
  }
  return bag;
}

function read(): QuoteState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuoteState;
    if (typeof parsed?.day !== "string" || typeof parsed?.index !== "number") return null;
    return { day: parsed.day, index: parsed.index, bag: Array.isArray(parsed.bag) ? parsed.bag : [] };
  } catch {
    return null;
  }
}

function write(state: QuoteState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — quote still renders for this session */
  }
}

/** Deterministic fallback used during SSR / before hydration. */
export function fallbackQuote(date = new Date()): string {
  const day = Math.floor(date.getTime() / 86_400_000);
  return DAILY_QUOTES[day % DAILY_QUOTES.length] as string;
}

/**
 * Returns today's quote, persisted locally. Quotes never repeat until the
 * whole library has been shown, then the bag is reshuffled.
 */
export function getQuoteOfTheDay(date = new Date()): string {
  const today = localDayKey(date);
  const existing = read();
  if (existing && existing.day === today && DAILY_QUOTES[existing.index]) {
    return DAILY_QUOTES[existing.index] as string;
  }

  let bag = existing?.bag ?? [];
  if (bag.length === 0) bag = shuffledBag(DAILY_QUOTES.length);
  const next = bag.shift();
  const index = typeof next === "number" && DAILY_QUOTES[next] ? next : 0;
  write({ day: today, index, bag });
  return DAILY_QUOTES[index] as string;
}
