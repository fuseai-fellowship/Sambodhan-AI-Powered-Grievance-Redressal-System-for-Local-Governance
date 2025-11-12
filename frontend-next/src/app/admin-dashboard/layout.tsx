import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard - Sambodhan",
  description: "Admin dashboard for grievance management system",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // No AuthProvider here - admin has its own authentication
  return <>{children}</>;
}
