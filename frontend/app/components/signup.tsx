"use client";

import { Button } from "@/components/ui/button";
import React from "react";
import { signIn, useSession } from "next-auth/react";

const Signup = () => {
  const { data: session, status } = useSession();

  // Don't show signup if user is logged in or session is loading
  if (status === "loading" || session) {
    return null;
  }

  // User not logged in, show signup button (which triggers sign in)
  return (
    <div>
      {/* Call signIn with the provider ID (e.g., 'google') */}
      <Button onClick={() => signIn("google")}>Sign Up with Google</Button>
    </div>
  );
};

export default Signup;
