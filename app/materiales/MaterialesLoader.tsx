"use client";

import dynamic from "next/dynamic";

const MaterialesClient = dynamic(() => import("./MaterialesClient"), {
  ssr: false,
});

export default function MaterialesLoader(props: any) {
  return <MaterialesClient {...props} />;
}
