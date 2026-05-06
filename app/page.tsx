// app/page.tsx
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ScheduleView } from "@/components/Schedule";
import { SectionsGrid } from "@/components/SectionsGrid";
import { RecentMaterials } from "@/components/RecentMaterials";
import heroDataDefault from "@/content/hero.json";
import seoData from "@/content/seo.json";

export const metadata = {
  title: seoData.titleHome,
  description: seoData.descriptionHome,
};

async function HeroSection() {
  const hero = heroDataDefault;
  const tituloLines = (hero.titulo || "").split("\\n");

  return (
    <section className="hero">
      <img className="hero-logo" src={hero.logoSrc || "/logos/logo.png"} alt={hero.logoAlt || "Logo"} />
      <div className="hero-text">
        <p className="hero-eyebrow">{hero.eyebrow}</p>
        <h1>
          {tituloLines.map((line: string, i: number) => (
            <span key={i}>
              {i === tituloLines.length - 1 ? <em>{line}</em> : line}
              {i < tituloLines.length - 1 && <br />}
            </span>
          ))}
        </h1>
        <p className="hero-desc">
          {hero.descripcion}
        </p>
      </div>
    </section>
  );
}

export default async function HomePage() {
  return (
    <>
      <Nav activeHref="/" />
      {/* @ts-ignore */}
      <HeroSection />
      <ScheduleView />
      <RecentMaterials />
      <SectionsGrid />
      <Footer />
    </>
  );
}
