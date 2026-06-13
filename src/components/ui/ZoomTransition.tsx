"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export function ZoomTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // IMPORTANT: opacity-only. `transform` (scale) and `filter` (blur) each create
  // a CSS containing block, which re-anchors any `position: fixed` descendant to
  // this wrapper instead of the viewport — collapsing full-screen fixed pages
  // (map, prism) to zero height. Opacity creates no containing block.
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </motion.div>
  );
}
