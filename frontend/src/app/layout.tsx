import type { Metadata } from "next";
import { eUkraine, eUkraineHead } from "./fonts";
import "./globals.css";
import { getLocale } from "@/lib/i18n.server";
import { ThemeProvider, themeInitScript } from "@/components/providers/ThemeProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";

export const metadata: Metadata = {
  title: "Lastivka — proactive child-rights protection",
  description:
    "A cross-registry system for early detection of child-rights violations with personal-data protection. A Ukrainian-Estonian partnership.",
  applicationName: "Lastivka",
  icons: {
    icon: [{ url: "/swallow.svg", type: "image/svg+xml" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${eUkraine.variable} ${eUkraineHead.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full antialiased">
        <ThemeProvider>
          <I18nProvider locale={locale}>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
