import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AssistantWidgetLoader } from "@/components/assistant/AssistantWidgetLoader";
import { CallProviderLoader } from "@/components/chat/CallProviderLoader";
import { ChunkRecovery } from "@/components/ChunkRecovery";
import { HydrationExtensionGuard } from "@/components/HydrationExtensionGuard";
import { NativeShellGuard } from "@/components/NativeShellGuard";
import { NativeOAuthListener } from "@/components/NativeOAuthListener";
import { DeferredClientWidgets } from "@/components/layout/DeferredClientWidgets";
import "./globals.css";

const display = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const metadata: Metadata = {
  title: "Zumelia — Connection, crafted",
  description:
    "A premium social space for real conversation, live moments, business, and community — beyond the feed.",
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
      <head>
        <HydrationExtensionGuard />
        <NativeShellGuard />
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
      </head>
      <body className="app-body min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <ChunkRecovery />
          <CallProviderLoader>
            {children}
          </CallProviderLoader>
          <DeferredClientWidgets />
          <NativeOAuthListener />
          <AssistantWidgetLoader />
        </ThemeProvider>
      </body>
    </html>
  );
}
