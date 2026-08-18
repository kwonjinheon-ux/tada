import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
      </head>
      <body>
        <LanguageProvider>
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
