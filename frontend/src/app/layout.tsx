import type { Metadata } from "next";
import { eUkraine, eUkraineHead } from "./fonts";
import "./globals.css";

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
    <html lang="uk" className={`${eUkraine.variable} ${eUkraineHead.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
