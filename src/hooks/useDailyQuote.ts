import { useEffect, useState } from "react";

import { fallbackQuote, getQuoteOfTheDay, localDayKey } from "@/lib/dailyQuote";

/**
 * One quote per calendar day, stored locally so it works fully offline.
 * Re-checks periodically so the quote swaps at midnight without a reload.
 */
export function useDailyQuote(): string {
  const [quote, setQuote] = useState(() => fallbackQuote());

  useEffect(() => {
    let day = localDayKey();
    setQuote(getQuoteOfTheDay());

    const check = () => {
      const today = localDayKey();
      if (today === day) return;
      day = today;
      setQuote(getQuoteOfTheDay());
    };

    const id = window.setInterval(check, 60_000);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", check);
    };
  }, []);

  return quote;
}
