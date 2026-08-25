"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface SearchItem {
  ecosystem: string;
  name: string;
}

export function Search({ items }: { items: SearchItem[] }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return items
      .filter((i) => i.name.toLowerCase().includes(query))
      .sort((a, b) => {
        // Exact/prefix matches first, then alphabetical.
        const ap = a.name.toLowerCase().startsWith(query) ? 0 : 1;
        const bp = b.name.toLowerCase().startsWith(query) ? 0 : 1;
        return ap - bp || a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [q, items]);

  function go(i: number) {
    const m = matches[i];
    // Scoped names contain "/", so encode the name into a single path segment.
    if (m) router.push(`/${m.ecosystem}/${encodeURIComponent(m.name)}`);
  }

  return (
    <div className="search">
      <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            go(active);
          }
        }}
        placeholder="Search a package… lodash, requests, express"
        autoComplete="off"
        spellCheck={false}
      />
      {matches.length > 0 && (
        <div className="search-results">
          {matches.map((m, i) => (
            <button
              key={`${m.ecosystem}/${m.name}`}
              className={i === active ? "sr active" : "sr"}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                go(i);
              }}
            >
              <span>{m.name}</span>
              <span className="sr-eco">{m.ecosystem}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
