import NextAuth, { NextAuthOptions, User as NextAuthUser, Account, Profile } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
// Add other providers like GitHub if needed
// import GithubProvider from "next-auth/providers/github";

// Define types for clarity
interface BackendTokenResponse {
  access_token: string;
  token_type: string;
}

// Ensure environment variables are defined
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"; // Default if not set

if (!googleClientId || !googleClientSecret) {
  console.error("Missing Google OAuth environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)");
  // In a real app, you might want to throw an error or handle this differently
}
if (!nextAuthSecret) {
  console.error("Missing NEXTAUTH_SECRET environment variable");
  // In a real app, you might want to throw an error
}


export const authOptions: NextAuthOptions = {
  // Secret for JWT signing and encryption
  secret: nextAuthSecret,

  providers: [
    GoogleProvider({
      clientId: googleClientId || "",
      clientSecret: googleClientSecret || "",
    }),
    // Add other providers here, e.g.:
    // GithubProvider({
    //   clientId: process.env.GITHUB_ID || "",
    //   clientSecret: process.env.GITHUB_SECRET || "",
    // }),
  ],

  callbacks: {
    async jwt({ token, user, account, profile }: { token: JWT; user?: NextAuthUser; account?: Account | null; profile?: Profile }): Promise<JWT> {
      // This callback is called whenever a JWT is created or updated.
      // `account` and `profile` are only passed on initial sign-in.

      // Initial sign in
      if (account && profile && user?.email) { // Ensure email is present
        console.log("Initial sign-in: JWT callback triggered");
        try {
          const userData = {
            email: user.email,
            name: user.name,
            provider: account.provider,
            provider_account_id: account.providerAccountId,
          };

          console.log("Sending user data to backend:", userData);
          console.log(`Backend URL: ${backendUrl}/api/v1/auth/sync-user`);


          const response = await fetch(`${backendUrl}/api/v1/auth/sync-user`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(userData),
          });

          console.log("Backend response status:", response.status);

          if (!response.ok) {
            const errorData = await response.text();
            console.error("Backend sync failed:", response.status, errorData);
            // Optionally throw an error or return token without backendToken
            // to prevent login if backend sync fails
            throw new Error(`Backend sync failed: ${response.status}`);
            // Or: return { ...token, error: "BackendSyncFailed" };
          }

          const backendTokenData: BackendTokenResponse = await response.json();
          console.log("Received backend token data:", backendTokenData);

          // Add the backend token to the next-auth JWT
          token.backendToken = backendTokenData.access_token;
          token.userId = profile.sub ?? user.id; // Store user ID if needed, prefer provider sub
          token.userEmail = user.email;
          token.userName = user.name;
          // You might want to store the backend user ID returned from your sync endpoint if available

        } catch (error) {
          console.error("Error during backend sync or processing:", error);
          // Include an error marker in the token
          token.error = "BackendSyncFailed";
        }
      } else {
        console.log("JWT callback triggered (not initial sign-in)");
      }

      // Return the updated token
      // Subsequent calls will already have backendToken if initial sign-in was successful
      return token;
    },

    async session({ session, token }: { session: any; token: JWT }): Promise<any> {
      // This callback is called whenever a session is checked.
      console.log("Session callback triggered");

      // Add the backend token and potentially user info from the JWT to the session object
      // This makes it available to the frontend via useSession() or getSession()
      if (token.backendToken) {
        session.backendToken = token.backendToken;
      }
      if (token.userId) {
        session.user.id = token.userId; // Add user ID to session
      }
      if (token.userEmail) {
        session.user.email = token.userEmail;
      }
       if (token.userName) {
        session.user.name = token.userName;
      }
      if (token.error) {
        session.error = token.error; // Pass error information to the session
      }

      console.log("Session object being returned:", session);
      return session;
    },
  },

  // Optional: Add custom pages if needed
  // pages: {
  //   signIn: '/auth/signin',
  //   signOut: '/auth/signout',
  //   error: '/auth/error', // Error code passed in query string as ?error=
  //   verifyRequest: '/auth/verify-request', // (used for email/passwordless sign in)
  //   newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out to disable)
  // }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 