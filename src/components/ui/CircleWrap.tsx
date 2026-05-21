"use client";

import { motion } from "framer-motion";

interface CircleWrapProps {
  text: string;
  radius?: number;
  fontSize?: number;
  color?: string;
  duration?: number;
  className?: string;
}

export function CircleWrap({
  text,
  radius = 84,
  fontSize = 9.5,
  color = "#a78bfa",
  duration = 22,
  className,
}: CircleWrapProps) {
  const size = (radius + 24) * 2;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <motion.div
      className={className}
      style={{ width: size, height: size, pointerEvents: "none" }}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <path
            id="cp"
            d={`M ${cx},${cy} m -${radius},0 a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`}
          />
        </defs>
        <text
          style={{
            fontFamily: "'Share Tech Mono', 'Fira Code', monospace",
            fontSize,
            fill: color,
            letterSpacing: "0.18em",
            opacity: 0.75,
          }}
        >
          <textPath href="#cp">{text}</textPath>
        </text>
      </svg>
    </motion.div>
  );
}
