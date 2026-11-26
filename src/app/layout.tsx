import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import {
  SITE_URL,
  THEORY_TITLE,
  THEORY_DESCRIPTION,
  SOCIAL_IMAGE,
  SITE_CREATOR_NAME,
  SITE_CREATOR_HANDLE,
  SITE_CREATOR_URL,
} from "@/lib/schema-ld";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "La Théorie des Fous du Bus — Le Siècle Oublié est le Présent | One Piece",
    template: "%s | Les Fous du Bus",
  },
  description: THEORY_DESCRIPTION,
  applicationName: "Les Fous du Bus",
  authors: [
    { name: SITE_CREATOR_NAME, url: SITE_CREATOR_URL },
    { name: "Les Fous du Bus", url: SITE_URL },
  ],
  generator: "Next.js",
  keywords: [
    "Théorie One Piece",
    "Les Fous du Bus",
    "Siècle Oublié est le présent",
    "Void Century is the present",
    "Joy Boy Luffy",
    "Laugh Tale",
    "Ponéglyphes mémoire de l'avenir",
    "Roger trop tôt",
    "Davy D. Jones Barbe Noire",
    "Armes Antiques",
    "Eiichiro Oda",
    "Mont Corvo",
    "Emeth",
    "Nika",
    "Imu Nerona",
    "Mother Flame",
    "Théorie One Piece Fous du Bus",
    "Grand Line",
    "Red Line",
  ],
  creator: SITE_CREATOR_NAME,
  publisher: "Les Fous du Bus",
  category: "entertainment",
  manifest: "/manifest.webmanifest",
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
    alternateLocale: ["en_US"],
    url: SITE_URL,
    siteName: "Les Fous du Bus — La Théorie One Piece",
    title: THEORY_TITLE,
    description: THEORY_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: THEORY_TITLE,
    description: THEORY_DESCRIPTION,
    images: [SOCIAL_IMAGE],
    creator: SITE_CREATOR_HANDLE,
  },
  robots: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
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
  viewportFit: "cover",
  themeColor: "#070b24",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="h-full overflow-hidden">
      <head>
        <link rel="alternate" type="text/markdown" href="/llms.txt" title="Les Fous du Bus — Résumé pour IA (FR)" />
        <link rel="alternate" type="text/markdown" href="/llms-full.txt" title="Les Fous du Bus — Théorie complète et FAQ (FR)" />
        <link rel="alternate" type="text/markdown" href="/llms-en.txt" hrefLang="en" title="The Bus Fools Theory — Full Theory and FAQ (EN)" />
        <link rel="preload" href="/images/luffy-jolly-roger.png" as="image" fetchPriority="high" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="//www.youtube.com" />
        <link rel="dns-prefetch" href="//www.youtube-nocookie.com" />
        <link rel="dns-prefetch" href="//img.youtube.com" />
        <link rel="dns-prefetch" href="//i.ytimg.com" />
      </head>
      <body className="h-full overflow-hidden overscroll-none bg-[#79c2ff] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
