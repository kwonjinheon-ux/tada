import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./icon-font.css";
import "../../styles.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Navbar } from "@/components/Navbar";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Fonts are self-hosted from public/fonts — see globals.css. Both
            faces are preloaded because text and icons paint on first render. */}
        <link rel="preload" href="/fonts/inter-latin-variable.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/material-symbols-subset.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <LanguageProvider>
          <Navbar />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
