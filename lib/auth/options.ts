import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@velynxia.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Velynxia@2024!";
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? "11111111-1111-1111-1111-111111111111";

function parseJwtSubject(jwt: string): string | null {
  const sections = jwt.split(".");
  if (sections.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(sections[1], "base64url").toString("utf8")) as {
      sub?: string;
      userId?: string;
    };

    return payload.sub ?? payload.userId ?? null;
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "VelynxiaJWT",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "JWT Token", type: "text" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (email && password) {
          if (email === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
            return {
              id: ADMIN_USER_ID,
              name: "Admin",
              email: ADMIN_EMAIL,
            };
          }

          return null;
        }

        const token = credentials?.token;
        if (!token) {
          return null;
        }

        const id = parseJwtSubject(token);
        if (!id) {
          return null;
        }

        return {
          id,
          name: "Velynxia User",
          email: "user@velynxia.local",
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
