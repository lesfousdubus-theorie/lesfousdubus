import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import {
  SITE_URL,
  THEORY_TITLE,
  THEORY_DESCRIPTION,
  websiteJsonLd,
  articleJsonLd,
  videoJsonLd,
  faqJsonLd,
} from "@/lib/schema-ld";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "La Théorie des Fous du Bus — Le Siècle Oublié est le Présent | One Piece",
    template: "%s | Les Fous du Bus",
  },
  description: THEORY_DESCRIPTION,
  applicationName: "Les Fous du Bus",
  authors: [{ name: "Les Fous du Bus", url: SITE_URL }],
  generator: "Next.js",
  keywords: [
    "Théorie One Piece",
    "Les Fous du Bus",
    "Siècle Oublié est le présent",
    "Joy Boy Luffy",
    "Laugh Tale",
    "Ponéglyphes mémoire de l'avenir",
    "Roger trop tôt",
    "Davy Jones Barbe Noire",
    "Armes Antiques",
    "All Blue",
    "Eiichiro Oda",
    "Mont Corvo",
    "Emeth",
    "Nika",
    "Imu Nerona",
    "Mother Flame",
    "One Piece théorie 3D",
    "Grand Line",
    "Red Line",
  ],
  creator: "Les Fous du Bus",
  publisher: "Les Fous du Bus",
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "Les Fous du Bus — La Théorie One Piece",
    title: THEORY_TITLE,
    description: THEORY_DESCRIPTION,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "La Théorie des Fous du Bus — Le Siècle Oublié est le Présent",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: THEORY_TITLE,
    description: THEORY_DESCRIPTION,
    images: ["/og-image.jpg"],
    creator: "@lesfousdubus",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
      <head>
        {/* Données structurées Schema.org (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body className="h-full overflow-hidden overscroll-none bg-[#79c2ff] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
