"use client";

import { useCallback, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  RemoteAudioTrack,
  Track,
  createAudioAnalyser,
} from "livekit-client";

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

export interface OracleSession {
  connect: (planet: string, chartContext?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  agentState: AgentState;
  agentVolume: number;
  userVolume: number;
}

export function useOracleSession(): OracleSession {
  const [isConnected, setIsConnected] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [agentVolume, setAgentVolume] = useState(0);
  const [userVolume, setUserVolume] = useState(0);

  const roomRef = useRef<Room | null>(null);
  const agentCleanupRef = useRef<(() => void) | null>(null);
  const userCleanupRef = useRef<(() => void) | null>(null);
  const agentIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAnalysers = useCallback(() => {
    if (agentIntervalRef.current) {
      clearInterval(agentIntervalRef.current);
      agentIntervalRef.current = null;
    }
    if (userIntervalRef.current) {
      clearInterval(userIntervalRef.current);
      userIntervalRef.current = null;
    }
    agentCleanupRef.current?.();
    agentCleanupRef.current = null;
    userCleanupRef.current?.();
    userCleanupRef.current = null;
  }, []);

  const connect = useCallback(
    async (planet: string, chartContext?: string) => {
      if (roomRef.current) {
        await roomRef.current.disconnect();
        roomRef.current = null;
      }

      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planet, chartContext: chartContext ?? null }),
      });
      if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
      const { token, url } = (await res.json()) as {
        token: string;
        url: string;
        roomName: string;
      };

      const room = new Room();
      roomRef.current = room;

      // DataReceived: (payload: NonSharedUint8Array, participant?, kind?, topic?, encryptionType?) => void
      room.on(RoomEvent.DataReceived, (data: Uint8Array) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(data)) as {
            state?: AgentState;
          };
          if (msg.state) setAgentState(msg.state);
        } catch {
          // non-JSON data messages — ignore
        }
      });

      // TrackSubscribed: (track: RemoteTrack, publication, participant) => void
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (!(track instanceof RemoteAudioTrack)) return;
        const { calculateVolume, cleanup } = createAudioAnalyser(track, {
          fftSize: 256,
        });
        // cleanup returns a Promise — wrap in a sync function for the ref
        agentCleanupRef.current = () => {
          void cleanup();
        };
        agentIntervalRef.current = setInterval(
          () => setAgentVolume(calculateVolume()),
          50,
        );
      });

      // TrackUnsubscribed: (track: RemoteTrack, publication, participant) => void
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (!(track instanceof RemoteAudioTrack)) return;
        if (agentIntervalRef.current) {
          clearInterval(agentIntervalRef.current);
          agentIntervalRef.current = null;
        }
        agentCleanupRef.current?.();
        agentCleanupRef.current = null;
        setAgentVolume(0);
      });

      room.on(RoomEvent.Disconnected, () => {
        stopAnalysers();
        setIsConnected(false);
        setAgentState("idle");
        setAgentVolume(0);
        setUserVolume(0);
      });

      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);

      const micPub = room.localParticipant.getTrackPublication(
        Track.Source.Microphone,
      );
      if (micPub?.audioTrack) {
        const { calculateVolume, cleanup } = createAudioAnalyser(
          micPub.audioTrack,
          { fftSize: 256 },
        );
        // cleanup returns a Promise — wrap in a sync function for the ref
        userCleanupRef.current = () => {
          void cleanup();
        };
        userIntervalRef.current = setInterval(
          () => setUserVolume(calculateVolume()),
          50,
        );
      }

      setIsConnected(true);
      setAgentState("idle");
    },
    [stopAnalysers],
  );

  const disconnect = useCallback(async () => {
    stopAnalysers();
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setIsConnected(false);
    setAgentState("idle");
    setAgentVolume(0);
    setUserVolume(0);
  }, [stopAnalysers]);

  return { connect, disconnect, isConnected, agentState, agentVolume, userVolume };
}
