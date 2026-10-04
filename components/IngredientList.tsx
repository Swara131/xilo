"use client";

import { useMemo, useState } from "react";
import type { IngredientExplanation } from "@/lib/types";
import { SearchIcon } from "./Icons";

const LEVEL_STYLES = {
  low: "bg-emerald-50 text-emerald-800",
  medium: "bg-amber-50 text-amber-800",
  high: "bg-rose-50 text-rose-800",
};

export function IngredientList({ items }: { items: IngredientExplanation[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      `${item.ingredient} ${item.explanation} ${item.concern ?? ""}`.toLowerCase().includes(needle),
    );
  }, [items, query]);

  if (items.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-line bg-white px-5 py-8 text-sm text-muted">
        No ingredients could be read from this label.
      </p>
    );
  }

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Search ingredients</span>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          <SearchIcon />
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search ingredients"
          className="w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No ingredients match that search.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((item) => (
            <li key={item.ingredient} className="rounded-3xl border border-line bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">{item.ingredient}</h3>
                {item.concern && (
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${LEVEL_STYLES[item.level]}`}>
                    {item.level}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{item.explanation}</p>
              {item.concern && (
                <p className="mt-3 text-sm font-medium text-foreground">Potential concern: {item.concern}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
