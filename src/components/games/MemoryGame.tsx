"use client";

import { useCallback, useEffect, useState } from "react";

const EMOJIS = ["🎵", "📻", "🎸", "🎹", "🥁", "🎺", "🎻", "🪕"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MemoryGame() {
  const [cards, setCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const init = useCallback(() => {
    const deck = shuffle([...EMOJIS, ...EMOJIS]).map((emoji, id) => ({
      id,
      emoji,
      flipped: false,
      matched: false,
    }));
    setCards(deck);
    setPicked([]);
    setMoves(0);
    setWon(false);
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  function flip(index: number) {
    if (won || picked.length >= 2) return;
    const card = cards[index];
    if (card.flipped || card.matched) return;

    const next = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c));
    setCards(next);
    const newPicked = [...picked, index];
    setPicked(newPicked);

    if (newPicked.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newPicked;
      if (next[a].emoji === next[b].emoji) {
        setCards((prev) => {
          const updated = prev.map((c, i) =>
            i === a || i === b ? { ...c, matched: true, flipped: true } : c,
          );
          if (updated.every((c) => c.matched)) setWon(true);
          return updated;
        });
        setPicked([]);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === a || i === b ? { ...c, flipped: false } : c,
            ),
          );
          setPicked([]);
        }, 700);
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className="font-semibold">Moves: {moves}</span>
        <button type="button" onClick={init} className="vintage-btn-outline px-3 py-1 text-xs">
          New game
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, i) => (
          <button
            key={card.id}
            type="button"
            onClick={() => flip(i)}
            className={`flex h-14 w-14 items-center justify-center rounded-sm border-2 text-2xl transition sm:h-16 sm:w-16 ${
              card.flipped || card.matched
                ? "border-vintage-rust bg-vintage-paper"
                : "border-vintage-border bg-vintage-rust/20 hover:bg-vintage-rust/30"
            }`}
          >
            {card.flipped || card.matched ? card.emoji : "?"}
          </button>
        ))}
      </div>
      {won && <p className="text-sm font-semibold text-vintage-olive">You won in {moves} moves!</p>}
    </div>
  );
}
