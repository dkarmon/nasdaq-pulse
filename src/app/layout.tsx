import type { Metadata } from "next";
import { Heebo, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nasdaq Pulse",
  description:
    "Live market pulse for Nasdaq movers with bilingual (EN/HE) UI, Google auth, and responsive dashboards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="midnight">
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} ${heebo.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
