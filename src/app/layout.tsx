import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { AssistantWidgetLoader } from "@/components/assistant/AssistantWidgetLoader";
import "./globals.css";

const display = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Zumelia — Global Chat",
  description:
    "Connect and chat with people worldwide. Real-time messaging across borders on Zumelia.",
  applicationName: "Zumelia",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zumelia",
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
    { media: "(prefers-color-scheme: light)", color: "#FAF8F5" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
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
      className={`${display.variable} ${body.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="app-body min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <RegisterServiceWorker />
          {children}
          <InstallAppPrompt />
          <AssistantWidgetLoader />
        </ThemeProvider>
      </body>
    </html>
  );
}
