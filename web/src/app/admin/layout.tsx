import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { AdminAppShell } from "@/components/admin/AdminAppShell";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Nojo Admin",
  description: "Platform operator console",
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  // Role on the session can lag; trust DB for layout gating (same as NOJO_ADMIN_EMAIL promotion).
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, email: true },
  });
  if (!dbUser || dbUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminAppShell userEmail={dbUser.email}>{children}</AdminAppShell>;
}
