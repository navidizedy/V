import { NextAuthOptions } from "next-auth";
import { encode as defaultEncode, decode as defaultDecode } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateEmail } from "@/lib/validators";

// Session lifetimes, mirroring how most real-world apps handle "remember me":
// short-lived session by default, longer-lived one when the user opts in.
const DAY_IN_SECONDS = 24 * 60 * 60;
export const DEFAULT_SESSION_MAX_AGE = DAY_IN_SECONDS; // 24 hours
export const REMEMBER_ME_SESSION_MAX_AGE = 7 * DAY_IN_SECONDS; // 7 days

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // Normalise the e-mail exactly the way it is stored (trimmed + lower-case) and
        // reject anything that is not a well-formed address before touching the DB.
        const emailCheck = validateEmail(credentials.email);
        if (emailCheck.error !== null) return null;
        const user = await db.select().from(users).where(eq(users.email, emailCheck.value)).limit(1);
        if (!user.length) return null;
        const isValid = await bcrypt.compare(credentials.password, user[0].password);
        if (!isValid) return null;
        return {
          id: String(user[0].id),
          email: user[0].email,
          name: user[0].name,
          role: user[0].role,
          rememberMe: credentials.rememberMe === "true",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        // Only set on initial sign-in; persisted on the token afterwards.
        token.rememberMe = Boolean((user as { rememberMe?: boolean }).rememberMe);
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      // Never store base64 avatars in the auth cookie.
      if ("picture" in token) {
        delete (token as Record<string, unknown>).picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
    // Upper bound for the session cookie itself. The *actual* expiry of each
    // token is enforced dynamically below via the custom jwt encode, based on
    // whether the user checked "remember me" at login.
    maxAge: REMEMBER_ME_SESSION_MAX_AGE,
  },
  jwt: {
    async encode(params) {
      const maxAge = params.token?.rememberMe ? REMEMBER_ME_SESSION_MAX_AGE : DEFAULT_SESSION_MAX_AGE;
      return defaultEncode({ ...params, maxAge });
    },
    async decode(params) {
      return defaultDecode(params);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
