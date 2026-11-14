import type { MetadataRoute } from "next";
import { THEORY_DESCRIPTION } from "@/lib/schema-ld";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Les Fous du Bus — La Théorie One Piece",
    short_name: "Les Fous du Bus",
    description: THEORY_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#07142b",
    theme_color: "#07142b",
    lang: "fr",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
