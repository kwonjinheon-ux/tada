import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./icon-font.css";
import "../../styles.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Navbar } from "@/components/Navbar";
import { getRequestLocale } from "@/lib/locale-cookie";

export const metadata: Metadata = {
  title: { default: "tada.nz 짜잔! 새로운 정보와 물건들이 여기에 모여 있습니다.", template: "%s | tada.nz" },
  description: "A modern local marketplace.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Android no longer resizes the whole layout on keyboard focus. The mobile
  // dock and message thread already follow VisualViewport measurements.
  interactiveWidget: "resizes-visual",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Reading the cookie makes every route render on demand. That is the price
  // of shipping the right language in the first byte, and it is a small one
  // here: 96 of 115 routes were already dynamic, and the 19 that were not are
  // sign-in shells and create forms rather than cacheable content.
  const locale = await getRequestLocale();

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <head>
        {/* Fonts are self-hosted from public/fonts — see globals.css. Both
            faces are preloaded because text and icons paint on first render. */}
        <link rel="preload" href="/fonts/inter-latin-variable.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/material-symbols-subset.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <LanguageProvider initialLocale={locale}>
          <Navbar />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
