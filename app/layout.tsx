import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Diskussionsboard", description: "Moderierte Diskussion mit KI-Modellen" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
