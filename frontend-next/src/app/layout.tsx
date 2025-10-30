import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sambodhan - Grievance Redressal System",
  description: "AI-powered grievance redressal system for local governance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="w-full min-h-screen">
      <body className={inter.className + " w-full min-h-screen"}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
