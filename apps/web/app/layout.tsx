import type { Metadata } from "next";
import { Inter, Space_Grotesk, Chakra_Petch } from "next/font/google";
import { ThemeToggle } from "../components/ThemeToggle";
import "./globals.css";

const THEME_INIT = `try{var t=localStorage.getItem('obs-theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}`;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
// The Fortitude Omnis house title font (matches PoisonBox and the estate).
const brandFont = Chakra_Petch({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Oblivio",
    template: "%s · Oblivio",
  },
  description:
    "Is this package still maintained? A free, honest health check for the open-source packages the world depends on.",
  icons: { icon: "/fortitude-logo.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${grotesk.variable} ${brandFont.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <div className="aurora" aria-hidden />
        <header className="site-header">
          <div className="inner">
            <div className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="brand-logo"
                src="/fortitude-logo.png"
                alt=""
                width={40}
                height={40}
              />
              <span className="brand-wm">
                <a href="/" className="brand-name" aria-label="Oblivio, home">
                  Oblivio
                </a>
                <a
                  href="https://fortitude-omnis.group"
                  target="_blank"
                  rel="noopener"
                  className="brand-by"
                >
                  by Fortitude Omnis Group
                </a>
              </span>
            </div>
            <nav className="header-actions" aria-label="Primary">
              <a href="/lists">Leaderboards</a>
              <a href="/api-docs">API</a>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <span>
            A{" "}
            <a
              href="https://fortitude-omnis.group"
              target="_blank"
              rel="noopener"
            >
              Fortitude Omnis
            </a>{" "}
            product.
          </span>
          <span>© 2026 Fortitude Omnis Group Ltd.</span>
        </footer>
      </body>
    </html>
  );
}
