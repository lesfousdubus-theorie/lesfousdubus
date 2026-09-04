import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Théorie des Fous du Bus — Voyage 3D dans One Piece",
  description:
    "Monte dans le bus au chapeau de paille, roule à travers les îles de One Piece et regarde la théorie des Fous du Bus pendant le voyage.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
    shortcut: "/favicon.ico",
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
