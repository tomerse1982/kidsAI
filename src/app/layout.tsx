import type { Metadata, Viewport } from "next";
import { AppHeader, BottomNav } from "@/components/shell";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang-server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const d = t(lang);
  return {
    title: { default: `${d.appName} | ${d.appNameOther}`, template: `%s · ${d.appName}` },
    description: d.tagline,
    applicationName: d.appName,
    robots: { index: false, follow: false },
    appleWebApp: { capable: true, title: d.appName, statusBarStyle: "default" },
    icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#fde7ee",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    // Hebrew and Arabic are both right-to-left; dir is set from the server so the first paint is correct.
    <html lang={lang} dir="rtl">
      <body className="antialiased">
        <AppHeader lang={lang} />
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">{children}</main>
        <BottomNav lang={lang} />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
