"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export function ZoomTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, scale: 0.97, filter: "blur(3px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </motion.div>
  );
}
