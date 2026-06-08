import type { Metadata, Viewport } from "next";
import { Libre_Baskerville, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const libre = Libre_Baskerville({
  variable: "--font-libre",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "iTunes — Global Chat",
  description:
    "Connect and chat with people worldwide. Real-time messaging across borders on iTunes.",
  applicationName: "iTunes",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "iTunes",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#b85c38" },
    { media: "(prefers-color-scheme: dark)", color: "#14100e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${libre.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="app-body min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <RegisterServiceWorker />
          {children}
          <InstallAppPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
