type Tier = "healthy" | "warning" | "bad" | "dead";

function tierOf(subScore: number): Tier {
  if (subScore >= 0.66) return "healthy";
  if (subScore >= 0.33) return "warning";
  if (subScore >= 0.1) return "bad";
  return "dead";
}

const LABEL: Record<Tier, string> = {
  healthy: "healthy",
  warning: "needs attention",
  bad: "poor",
  dead: "no signal",
};

/**
 * A per-signal status glyph, keyed to the sub-score: a green tick, an amber
 * warning, a red cross, or a skull for a flatlined signal. Decorative polish on
 * top of the bar, with an accessible label so it is not colour-only.
 */
export function StatusIcon({ subScore }: { subScore: number }) {
  const tier = tierOf(subScore);
  return (
    <span className="status" role="img" aria-label={LABEL[tier]} title={LABEL[tier]}>
      {tier === "healthy" && (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <circle cx="12" cy="12" r="11" fill="#34d399" />
          <path
            d="M7 12.4l3.2 3.4L17 8.4"
            fill="none"
            stroke="#06120c"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {tier === "warning" && (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            d="M12 3.2c.6 0 1.15.32 1.45.85l8 14a1.66 1.66 0 0 1-1.45 2.5H4a1.66 1.66 0 0 1-1.45-2.5l8-14c.3-.53.85-.85 1.45-.85z"
            fill="#fbbf24"
          />
          <rect x="10.9" y="9" width="2.2" height="6" rx="1.1" fill="#3a2b00" />
          <circle cx="12" cy="17.4" r="1.25" fill="#3a2b00" />
        </svg>
      )}
      {tier === "bad" && (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <circle cx="12" cy="12" r="11" fill="#fb7185" />
          <path
            d="M8 8l8 8M16 8l-8 8"
            stroke="#2a0810"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      )}
      {tier === "dead" && (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            d="M12 2C7.3 2 3.5 5.5 3.5 9.9c0 2.7 1.4 4.9 3.4 6.2V18a2 2 0 0 0 2 2h.3v-2.1h1.3V20h2.4v-2.1h1.3V20h.3a2 2 0 0 0 2-2v-1.9c2-1.3 3.4-3.5 3.4-6.2C20.5 5.5 16.7 2 12 2z"
            fill="#aeb6c4"
          />
          <circle cx="9" cy="10.3" r="1.9" fill="#06070b" />
          <circle cx="15" cy="10.3" r="1.9" fill="#06070b" />
          <path d="M12 12.6l-1.1 2.6h2.2z" fill="#06070b" />
        </svg>
      )}
    </span>
  );
}
