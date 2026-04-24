import type { Metadata } from "next";
import { IBM_Plex_Sans, Sora } from "next/font/google";

import "@/app/globals.css";
import { cn } from "@/lib/utils";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const display = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "AgentCanvas",
  description: "Visual orchestration UI for local AI agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("dark font-sans", sans.variable)}
    >
      <body suppressHydrationWarning className={`${sans.variable} ${display.variable}`}>
        {children}
      </body>
    </html>
  );
}
