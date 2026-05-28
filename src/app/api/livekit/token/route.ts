// src/app/api/livekit/token/route.ts
import { NextRequest } from "next/server";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export async function POST(req: NextRequest) {
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url       = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !url) {
    return new Response(
      JSON.stringify({ error: "LiveKit credentials not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json() as { planet?: string; chartContext?: string };
  const planet       = body.planet ?? "Moon";
  const chartContext = body.chartContext ?? null;

  const roomName = `oracle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const identity = `user-${Date.now()}`;

  // Create room with metadata so the Python agent can read planet + context
  const svc = new RoomServiceClient(url, apiKey, apiSecret);
  await svc.createRoom({
    name: roomName,
    metadata: JSON.stringify({ planet, chartContext }),
    emptyTimeout: 300,
    maxParticipants: 10,
  });

  const at = new AccessToken(apiKey, apiSecret, { identity });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  const token = await at.toJwt();

  return new Response(JSON.stringify({ token, url, roomName }), {
    headers: { "Content-Type": "application/json" },
  });
}
