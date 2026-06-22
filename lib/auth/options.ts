import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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
        token: { label: "JWT Token", type: "text" },
      },
      authorize: async (credentials) => {
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
