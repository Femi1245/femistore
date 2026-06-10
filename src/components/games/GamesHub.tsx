"use client";

import { useEffect, useState } from "react";
import { Gamepad2, Wifi, WifiOff } from "lucide-react";
import { MemoryGame } from "@/components/games/MemoryGame";
import { SnakeGame } from "@/components/games/SnakeGame";
import { TicTacToeGame } from "@/components/games/TicTacToeGame";

type GameId = "snake" | "memory" | "tictactoe";

const GAMES: { id: GameId; title: string; desc: string }[] = [
  { id: "snake", title: "Snake", desc: "Classic arcade — eat and grow" },
  { id: "memory", title: "Memory Match", desc: "Flip cards and find pairs" },
  { id: "tictactoe", title: "Tic-Tac-Toe", desc: "Play X vs the computer" },
];

export function GamesHub() {
  const [online, setOnline] = useState(true);
  const [active, setActive] = useState<GameId>("snake");

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="vintage-card p-6">
        <div className="mb-2 flex items-center gap-2">
          <Gamepad2 className="h-6 w-6 text-vintage-rust" />
          <h1 className="font-display text-2xl font-bold text-vintage-ink">Offline games</h1>
        </div>
        <p className="text-sm text-vintage-ink-muted">
          Play without internet. These games run entirely on your device — perfect when
          you&apos;re offline or waiting to reconnect.
        </p>
        <div
          className={`mt-3 inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-semibold ${
            online
              ? "bg-vintage-olive/15 text-vintage-olive"
              : "bg-vintage-rust/15 text-vintage-rust"
          }`}
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online ? "Online — games still work offline" : "Offline — games available"}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {GAMES.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActive(g.id)}
            className={`rounded-sm border-2 px-4 py-2 text-left transition ${
              active === g.id
                ? "border-vintage-rust bg-vintage-rust text-[#fff8f0]"
                : "border-vintage-border bg-vintage-paper hover:bg-vintage-paper-dark/50"
            }`}
          >
            <span className="block text-sm font-bold">{g.title}</span>
            <span
              className={`block text-xs ${active === g.id ? "text-[#fff8f0]/80" : "text-vintage-ink-muted"}`}
            >
              {g.desc}
            </span>
          </button>
        ))}
      </div>

      <div className="vintage-card flex justify-center p-6">
        {active === "snake" && <SnakeGame />}
        {active === "memory" && <MemoryGame />}
        {active === "tictactoe" && <TicTacToeGame />}
      </div>
    </div>
  );
}
