"use client";

import { useState } from "react";

/**
 * The "Embed the badge" panel: a preview of the badge, a read-only multiline box
 * holding the markdown snippet (wraps rather than scrolling sideways), and a
 * copy-to-clipboard button.
 */
export function BadgeEmbed({
  markdown,
  badgeSrc,
  alt,
}: {
  markdown: string;
  badgeSrc: string;
  alt: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (e.g. insecure context): the box is still selectable.
    }
  }

  return (
    <div className="panel badge-box">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={badgeSrc} alt={alt} height={20} />
      <textarea
        className="badge-md"
        readOnly
        rows={3}
        value={markdown}
        spellCheck={false}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Badge markdown"
      />
      <button type="button" className="badge-copy" onClick={copy}>
        {copied ? "Copied" : "Copy to clipboard"}
      </button>
    </div>
  );
}
