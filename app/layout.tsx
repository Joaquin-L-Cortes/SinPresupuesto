// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";
import { cookies } from "next/headers";
import { promises as fs } from "fs";
import path from "path";

async function getSEOData() {
  try {
    const filePath = path.join(process.cwd(), "content", "seo.json");
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    return {
      titleHome: "Sin-Presupuesto · PreUniversitario gratuito",
      descriptionHome: "Somos Sin-Presupuesto, un preuniversitario 100% gratuito y popular.",
      ogImage: "/og-image.png"
    };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSEOData();
  return {
    title: seo.titleHome,
    description: seo.descriptionHome,
    manifest: "/manifest.json",
    openGraph: {
      title: seo.titleHome,
      description: seo.descriptionHome,
      images: seo.ogImage ? [{ url: seo.ogImage }] : [],
    },
    icons: [
      { rel: "icon",             type: "image/x-icon", url: "/favicon.ico" },
      { rel: "icon",             type: "image/png",    url: "/favicon.png" },
      { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
    ],
  };
}

export const viewport: Viewport = {
  themeColor: "#1a3a6b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialRole = cookieStore.get("user-role")?.value || null;

  return (
    <html lang="es" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,400&family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClientProviders initialRole={initialRole}>{children}</ClientProviders>
      </body>
    </html>
  );
}
