import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zumelia — Global Chat",
    short_name: "Zumelia",
    description:
      "Connect, chat, watch, and go live with people worldwide on Zumelia.",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#FAF8F5",
    background_color: "#FAF8F5",
    categories: ["social", "entertainment", "communication"],
    icons: [
      {
        src: "/pwa/icon-72.png",
        sizes: "72x72",
        type: "image/png",
      },
      {
        src: "/pwa/icon-96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/pwa/icon-128.png",
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: "/pwa/icon-144.png",
        sizes: "144x144",
        type: "image/png",
      },
      {
        src: "/pwa/icon-152.png",
        sizes: "152x152",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-384.png",
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
