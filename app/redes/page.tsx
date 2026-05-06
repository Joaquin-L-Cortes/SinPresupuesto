// app/redes/page.tsx
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import RedesClient from "./RedesClient";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

async function getRedesData() {
  const redesDir = path.join(process.cwd(), "content", "redes");
  try {
    const files = await fs.readdir(redesDir);
    const data = await Promise.all(
      files.map(async (f) => {
        const content = await fs.readFile(path.join(redesDir, f), "utf-8");
        return JSON.parse(content);
      })
    );
    return data.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  } catch (e) {
    return [];
  }
}

async function getDonacionesData() {
  try {
    const filePath = path.join(process.cwd(), "content", "donaciones.json");
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

export default async function RedesPage() {
  const redes = await getRedesData();
  const donaciones = await getDonacionesData();

  return (
    <>
      <Nav activeHref="/redes" />
      <RedesClient redes={redes} donaciones={donaciones} />
      <Footer />
    </>
  );
}
