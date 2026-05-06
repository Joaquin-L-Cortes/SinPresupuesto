// app/comunidad/page.tsx
import { Nav }    from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ComunidadShell } from "./ComunidadShell";

export const metadata = { title: "💬 Comunidad · Sin-Presupuesto" };

export default function ComunidadPage() {
  return (
    <>
      <Nav activeHref="/comunidad" />
      <ComunidadShell />
      <Footer />
    </>
  );
}
