"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import type { ChartData } from "@/lib/astrology/types";
import { getChatHistory, pushChatMessage } from "@/lib/storage";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInputProps {
  profileId?: string | null;
  chart?: ChartData | null;
}

export function ChatInput({ profileId, chart }: ChatInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load persisted history on mount
  useEffect(() => {
    if (profileId) {
      const history = getChatHistory(profileId);
      if (history.length > 0) setMessages(history);
    }
  }, [profileId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const send = async () => {
    const text = query.trim();
    if (!text || streaming) return;
    setQuery("");
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    if (profileId) pushChatMessage(profileId, userMsg);
    setStreaming(true);
    setStreamText("");
    setOpen(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          chart: chart ?? undefined,
          history: messages.slice(-10),
        }),
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            const assistantMsg: Message = { role: "assistant", content: accumulated };
            setMessages(prev => [...prev, assistantMsg]);
            if (profileId) pushChatMessage(profileId, assistantMsg);
            setStreamText("");
            setStreaming(false);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) { accumulated += parsed.text; setStreamText(accumulated); }
            if (parsed.error) throw new Error(parsed.error);
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${String(e)}. Make sure ANTHROPIC_API_KEY is set in .env.local.` }]);
      setStreamText("");
      setStreaming(false);
    }
  };

  const allMessages = streaming
    ? [...messages, { role: "assistant" as const, content: streamText }]
    : messages;

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <AnimatePresence>
        {open && allMessages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{ background: "rgba(4,4,32,0.9)", border: "1px solid rgba(99,102,241,0.2)", backdropFilter: "blur(20px)" }}
          >
            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-[9px] font-bold tracking-widest" style={{ color: "#64748b" }}>COSMIC DIALOGUE</span>
              <button onClick={() => setOpen(false)} className="text-[#64748b] hover:text-[#94a3b8] cursor-pointer text-xs">×</button>
            </div>
            <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: "thin" }}>
              {allMessages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{
                      background: m.role === "user" ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed, #06b6d4)",
                      border: "1px solid rgba(124,58,237,0.4)",
                    }}
                  >
                    {m.role === "user" ? "U" : "✦"}
                  </div>
                  <div
                    className="flex-1 px-3 py-2 rounded-xl text-xs leading-relaxed"
                    style={{
                      background: m.role === "user" ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${m.role === "user" ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.07)"}`,
                      color: m.role === "user" ? "#c4b5fd" : "#cbd5e1",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.content}
                    {streaming && i === allMessages.length - 1 && m.role === "assistant" && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block ml-1 w-1 h-3 align-middle"
                        style={{ background: "#7c3aed" }}
                      />
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl w-full max-w-2xl"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(124,58,237,0.2)",
          backdropFilter: "blur(20px)",
        }}
      >
        <motion.div
          animate={{ scale: streaming ? [1, 1.3, 1] : 1, opacity: streaming ? [0.7, 1, 0.7] : 0.7 }}
          transition={{ duration: 1.2, repeat: streaming ? Infinity : 0 }}
          className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center cursor-pointer"
          style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 10px rgba(124,58,237,0.4)" }}
          onClick={() => setOpen(o => !o)}
        >
          <span className="text-[8px] text-white font-bold">✦</span>
        </motion.div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder={chart ? "Ask Cosmora about your chart..." : "Ask Cosmora anything..."}
          disabled={streaming}
          className="flex-1 bg-transparent text-sm outline-none disabled:opacity-50"
          style={{ color: "#e2e8f0" }}
        />
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={send}
          disabled={streaming || !query.trim()}
          className="flex-shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: "#7c3aed" }}
        >
          {streaming ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 rounded-full border-2 border-t-transparent"
              style={{ borderColor: "#7c3aed" }}
            />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </motion.button>
      </div>
    </div>
  );
}
