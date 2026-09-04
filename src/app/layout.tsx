import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Théorie des Fous du Bus — Le siècle oublié est le présent",
  description:
    "Le siècle oublié est le présent ! Monte dans le bus au chapeau de paille, roule à travers les îles de One Piece et découvre la théorie des Fous du Bus.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="h-full overflow-hidden">
      <body className="h-full overflow-hidden overscroll-none bg-[#79c2ff] text-white antialiased">{children}</body>
    </html>
  );
}
