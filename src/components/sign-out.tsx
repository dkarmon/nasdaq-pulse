"use client";

import { signOut } from "next-auth/react";

type Props = {
  label: string;
};

export function SignOutButton({ label }: Props) {
  return (
    <button className="btn ghost" onClick={() => signOut({ callbackUrl: "/" })}>
      {label}
    </button>
  );
}
