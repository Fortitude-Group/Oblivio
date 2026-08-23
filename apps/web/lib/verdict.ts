import type { Verdict } from "@observatory/core";

export interface VerdictStyle {
  label: string;
  accent: string;
  tagline: string;
}

/**
 * Presentation for each verdict. Taglines are plain-language and honest: they
 * say what the score means and what follows from it (Principle XII), and they
 * never overstate risk (the stable/finished wording is deliberately reassuring).
 */
export const VERDICT_STYLE: Record<Verdict, VerdictStyle> = {
  actively_maintained: {
    label: "Actively maintained",
    accent: "#34d399",
    tagline:
      "Actively maintained. Recent releases, responsive upkeep, and a healthy spread of contributors.",
  },
  stable_low_activity: {
    label: "Stable, low activity",
    accent: "#38bdf8",
    tagline:
      "Stable and complete. Quiet by design, not by neglect, with no signs of dependent-facing risk.",
  },
  slowing_down: {
    label: "Slowing down",
    accent: "#fbbf24",
    tagline:
      "Slowing down. Still alive, but the pace has dropped, so it's worth keeping an eye on.",
  },
  at_risk: {
    label: "At risk",
    accent: "#fb7185",
    tagline:
      "At risk. There are real signs of abandonment that could bite the projects depending on it.",
  },
  archived: {
    label: "Archived",
    accent: "#94a3b8",
    tagline:
      "Archived. The maintainers have closed the doors, so don't expect any further updates.",
  },
  insufficient_data: {
    label: "Insufficient data",
    accent: "#a78bfa",
    tagline:
      "Insufficient data. We couldn't resolve enough public signal to score this one fairly.",
  },
};
