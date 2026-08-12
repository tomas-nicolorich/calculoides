import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { THEME_SCRIPT } from "./_theme/theme-script";

export const metadata: Metadata = {
  title: "Calculoides",
  description: "Shared budget tracking for groups.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // theme-preference: "A Blocking Inline Script Prevents a Flash of Wrong
    // Theme" — `suppressHydrationWarning` stops React from flagging the
    // script-applied `.dark` class as a hydration mismatch (ADR-7).
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* `dangerouslySetInnerHTML` is sanctioned here: THEME_SCRIPT is a
            static, non-user-controlled string (app/_theme/theme-script.ts),
            never interpolated user input. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
