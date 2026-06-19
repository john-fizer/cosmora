/** Shared war-room color tokens for the night-Earth map reskin. */
export const WAR_ROOM = {
  bg:         "#010810", // near-black background (unchanged from current)
  panel:      "rgba(4,10,20,0.72)",
  hairline:   "rgba(255,138,60,0.22)", // amber hairline borders
  textDim:    "#5A4A3A",
  textMid:    "#C9A06A",
  accent:     "#FF7A3C", // warm amber accent (replaces violet)
  accentWarm: "#FFB347",
  limbInner:  "#2BD4FF", // atmosphere inner cyan
  limbOuter:  "#FF7A3C", // atmosphere outer warm halo
  coastGlow:  "#FFB37A", // thin warm coastline glow
} as const;

export type WarRoomPalette = typeof WAR_ROOM;
