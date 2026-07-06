"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";

type HomeAuthLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  loggedInHref: string;
  guestHref: string;
};

export function HomeAuthLink({
  loggedInHref,
  guestHref,
  children,
  ...props
}: HomeAuthLinkProps) {
  const { loggedIn } = useAuthSession();
  return (
    <Link href={loggedIn ? loggedInHref : guestHref} {...props}>
      {children}
    </Link>
  );
}

export function HomeAuthLabel({
  loggedIn,
  guest,
}: {
  loggedIn: string;
  guest: string;
}) {
  const { loggedIn: isLoggedIn, ready } = useAuthSession();
  if (!ready) return guest;
  return isLoggedIn ? loggedIn : guest;
}
