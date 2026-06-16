import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { AssistantWidgetLoader } from "@/components/assistant/AssistantWidgetLoader";
import "./globals.css";

const display = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Inter({
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
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
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
