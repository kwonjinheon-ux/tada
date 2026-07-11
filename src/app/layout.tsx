import type { Metadata } from "next";
import "./globals.css";
import "../../styles.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: { default: "Tada", template: "%s | Tada" },
  description: "A modern local marketplace.",
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
        <Navbar />
        {children}
      </body>
    </html>
  );
}
