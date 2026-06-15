import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Auth.js v5 reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET / AUTH_SECRET from the env.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
});

// True only when Google OAuth is configured — used to gate the cockpit so the
// app stays usable locally before credentials are set up.
export const AUTH_ENABLED = Boolean(process.env.AUTH_GOOGLE_ID);
