import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryClientProvider } from "./providers";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { NotificationProvider } from "@/lib/notifications";
import { Toaster } from "@/components/ui/sonner";
import "@/i18n";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Pinnacle CRM — Agency & Freelance CRM",
  description: "Professional CRM for agencies and freelancers — leads, clients, deals, invoices, and tasks in one workspace.",
  openGraph: {
    title: "Pinnacle CRM — Agency & Freelance CRM",
    description: "Agency & Freelance CRM for managing leads, clients, deals, invoices, and tasks.",
    images: ["https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a5ce2697-0d60-4a29-9814-db8020b648e4/id-preview-a5c3a462--54ee14d9-2dae-448d-8cc4-4db811c66acb.lovable.app-1777397838501.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pinnacle CRM — Agency & Freelance CRM",
    description: "Agency & Freelance CRM for managing leads, clients, deals, invoices, and tasks.",
    images: ["https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a5ce2697-0d60-4a29-9814-db8020b648e4/id-preview-a5c3a462--54ee14d9-2dae-448d-8cc4-4db811c66acb.lovable.app-1777397838501.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <QueryClientProvider>
          <ThemeProvider>
            <AuthProvider>
              <NotificationProvider>
                {children}
                <Toaster richColors position="top-right" />
              </NotificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
