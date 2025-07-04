import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id?: string | null; 
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    backendToken?: string; // Add your custom backendToken property
    expires: string; 
  }

  interface User {
    id?: string; 
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    id?: string; 
    backendToken?: string; 
  }
} 