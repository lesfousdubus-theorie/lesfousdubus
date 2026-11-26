import {
  THEORY_VIDEO_URL,
  THEORY_VIDEO_EMBED_URL,
  THEORY_VIDEO_THUMBNAIL_URL,
  THEORY_VIDEO_UPLOAD_DATE,
  THEORY_VIDEO_DURATION,
} from "@/lib/theory-video";

/**
 * Données structurées de l’accueil ; la présence de balisage ne garantit pas
 * un résultat enrichi.
 */

export const SITE_URL = "https://lesfousdubus.sbs";
/** Dernière modification significative des pages et de leurs métadonnées. */
export const SITE_UPDATED_AT = "2026-11-26T12:30:00Z";
export const SITE_NAME = "Les Fous du Bus — La Théorie One Piece";
export const THEORY_TITLE = "La Théorie des Fous du Bus — Le Siècle Oublié est le Présent";
export const THEORY_DESCRIPTION =
  "Découvre la théorie One Piece du Mont Corvo : le Siècle Oublié serait le présent, Joy Boy serait Luffy et Laugh Tale se situerait dans le futur.";
export const SITE_CREATOR_NAME = "Epikaigle";
export const SITE_CREATOR_HANDLE = "@Epikaigle";
export const SITE_CREATOR_URL = "https://x.com/Epikaigle";
export const SITE_GITHUB_URL = "https://github.com/lesfousdubus-theorie/lesfousdubus";

export const SOCIAL_IMAGE = {
  url: `${SITE_URL}/og-bus-preview.jpg`,
  width: 1200,
  height: 630,
  alt: THEORY_TITLE,
  type: "image/jpeg",
};

const siteCreatorEntity = {
  "@type": "Person",
  "@id": `${SITE_URL}/#creator`,
  name: SITE_CREATOR_NAME,
  url: SITE_CREATOR_URL,
  sameAs: [SITE_CREATOR_URL, SITE_GITHUB_URL],
};

const sitePublisherEntity = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Les Fous du Bus",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/icon-512.png`,
    width: 512,
    height: 512,
  },
  sameAs: [SITE_CREATOR_URL, SITE_GITHUB_URL],
};

const onePieceWorkEntity = {
  "@type": "CreativeWorkSeries",
  name: "One Piece",
  sameAs: "https://en.wikipedia.org/wiki/One_Piece",
  author: {
    "@type": "Person",
    name: "Eiichiro Oda",
    sameAs: "https://en.wikipedia.org/wiki/Eiichiro_Oda",
  },
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  alternateName: [
    "Théorie des Fous du Bus",
    "Le Siècle Oublié est le Présent",
    "Les Fous du Bus",
    "Théorie One Piece Fous du Bus",
    "The Bus Fools Theory",
    "The Void Century is the Present",
  ],
  url: SITE_URL,
  inLanguage: ["fr-FR", "en-US"],
  description: THEORY_DESCRIPTION,
  dateModified: SITE_UPDATED_AT,
  about: onePieceWorkEntity,
  creator: siteCreatorEntity,
  publisher: sitePublisherEntity,
};

export const webApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": `${SITE_URL}/#app`,
  name: THEORY_TITLE,
  alternateName: "The Bus Fools Theory — Interactive 3D Bus on Grand Line",
  url: SITE_URL,
  mainEntityOfPage: SITE_URL,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  description: THEORY_DESCRIPTION,
  applicationCategory: "EntertainmentApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript and WebGL",
  inLanguage: ["fr-FR", "en-US"],
  isAccessibleForFree: true,
  isFamilyFriendly: true,
  dateModified: SITE_UPDATED_AT,
  image: SOCIAL_IMAGE.url,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  about: onePieceWorkEntity,
  author: siteCreatorEntity,
  publisher: sitePublisherEntity,
};

export const videoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "@id": `${SITE_URL}/#theory-video`,
  url: THEORY_VIDEO_URL,
  name: "La théorie One Piece qui explique tout. (Théorie des fous du bus)",
  description:
    "La théorie des Fous du Bus expliquée par le Mont Corvo : le Siècle Oublié serait le présent de One Piece, Laugh Tale serait Roadstar à une autre époque et Joy Boy serait Luffy.",
  thumbnailUrl: [
    THEORY_VIDEO_THUMBNAIL_URL,
    `${SITE_URL}/og-bus-preview.jpg`,
  ],
  uploadDate: THEORY_VIDEO_UPLOAD_DATE,
  duration: THEORY_VIDEO_DURATION,
  embedUrl: THEORY_VIDEO_EMBED_URL,
  isFamilyFriendly: true,
  about: onePieceWorkEntity,
  creator: {
    "@type": "Organization",
    name: "Mont Corvo",
    url: "https://www.youtube.com/@MontCorvo",
    sameAs: "https://www.youtube.com/@MontCorvo",
  },
  publisher: {
    "@type": "Organization",
    name: "Mont Corvo",
    url: "https://www.youtube.com/@MontCorvo",
    sameAs: "https://www.youtube.com/@MontCorvo",
  },
  inLanguage: "fr-FR",
};
