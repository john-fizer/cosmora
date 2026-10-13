import React from "react";

/**
 * Stand-in for next/link inside Remotion (no Next.js router here).
 * Renders a plain anchor; navigation never actually fires during a render.
 */
export default function Link({
  href,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a href={typeof href === "string" ? href : "#"} {...rest} onClick={(e) => e.preventDefault()}>
      {children}
    </a>
  );
}
