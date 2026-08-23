import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

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
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body>
        <div className="aurora" aria-hidden />
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
