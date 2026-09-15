import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    id: string;
    rememberMe?: boolean;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
    rememberMe?: boolean;
  }
}
