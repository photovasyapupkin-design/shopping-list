import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { emailOTP, mcp } from "better-auth/plugins";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendOtpEmail } from "@/lib/email";

function googleProvider() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return {};
  }

  return {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  };
}

function createAuth() {
  return betterAuth({
    appName: "Shopping List",
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        ...schema,
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        oauthApplication: schema.oauthApplications,
        oauthAccessToken: schema.oauthAccessTokens,
        oauthConsent: schema.oauthConsents,
      },
    }),
    trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
    socialProviders: googleProvider(),
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        storeOTP: "hashed",
        async sendVerificationOTP(data) {
          await sendOtpEmail(data);
        },
      }),
      mcp({
        loginPage: "/sign-in",
        resource: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/mcp`,
      }),
    ],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let authInstance: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  if (!authInstance) {
    authInstance = createAuth();
  }

  return authInstance;
}
