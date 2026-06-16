import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ластівка — проактивний захист прав дитини",
  description:
    "Крос-реєстрова privacy-preserving система раннього виявлення порушень прав дитини. Українсько-естонське партнерство.",
  applicationName: "Ластівка",
  icons: {
    icon: [{ url: "/swallow.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${inter.variable} ${manrope.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
