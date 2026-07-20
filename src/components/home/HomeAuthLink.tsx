"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const href = mounted && loggedIn ? loggedInHref : guestHref;

  return (
    <Link href={href} {...props}>
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || !ready) return guest;
  return isLoggedIn ? loggedIn : guest;
}
