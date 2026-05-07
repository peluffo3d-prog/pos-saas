import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mi Comercio — POS",
    short_name: "Mi Comercio",
    description: "Sistema de ventas y control de stock para comercios",
    start_url: "/",
    display: "standalone",
    background_color: "#f9f7f3",
    theme_color: "#257a52",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["business", "productivity"],
  }
}
