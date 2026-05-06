// app/materiales/page.tsx
import MaterialesLoader from "./MaterialesLoader";
import { Nav }    from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = 'force-dynamic';
export const metadata = { title: "📖 Material · Sin-Presupuesto" };

export default async function Page() {
  // Leemos directamente el JSON local para que coincida con el Admin
  let secciones = [];
  try {
    const filePath = path.join(process.cwd(), "content", "classroom_sections.json");
    const fileData = await fs.readFile(filePath, "utf-8");
    secciones = JSON.parse(fileData);
  } catch (error) {
    console.error("Error cargando classroom_sections.json:", error);
  }

  return (
    <>
      <Nav activeHref="/materiales" />
      {/* Pasamos los datos del JSON al loader */}
      <MaterialesLoader dbSecciones={secciones} />
      <Footer />
    </>
  );
}
