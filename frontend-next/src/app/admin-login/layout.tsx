import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login - Sambodhan",
  description: "Admin login for grievance management system",
};

export default function AdminLoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // No AuthProvider here - admin has its own authentication
  return <>{children}</>;
}
