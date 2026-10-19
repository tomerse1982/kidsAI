import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "מטפסים בסולם | نتسلّق السُلّم",
    short_name: "מטפסים בסולם",
    description: "עוזר הדרכה לצוותי מעונות וגנים · مساعد إرشادي لطواقم الحضانات",
    start_url: "/",
    scope: "/",
    display: "standalone",
    dir: "rtl",
    lang: "he",
    background_color: "#fff5f8",
    theme_color: "#fde7ee",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
