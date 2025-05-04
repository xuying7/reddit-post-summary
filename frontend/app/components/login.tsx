"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "next-auth/react";

const Login = () => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <Button disabled>Loading...</Button>;
  }

  if (session) {
    // User is logged in, show user info and sign out button
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {session.user?.email || session.user?.name}
        </span>
        {/* Call signOut without arguments for default behavior */}
        <Button variant="outline" onClick={() => signOut()}>
          Sign Out
        </Button>
      </div>
    );
  }

  // User not logged in, show sign in button
  return (
    <div>
      {/* Call signIn with the provider ID (e.g., 'google') */}
      {/* Add more buttons for other providers if needed */}
      <Button onClick={() => signIn("google")}>Login with Google</Button>
    </div>
  );
};

export default Login;
