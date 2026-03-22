import type { UserRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: UserRole;
    };
  }

  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    email?: string;
    role?: UserRole;
  }
}
