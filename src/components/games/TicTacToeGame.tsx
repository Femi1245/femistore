"use client";

import { useState } from "react";

type Cell = "X" | "O" | null;
type Board = Cell[];

function winner(b: Board): Cell {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, c, d] of lines) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return null;
}

function aiMove(board: Board): number {
  const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  if (empty.length === 0) return -1;

  for (const i of empty) {
    const next = [...board];
    next[i] = "O";
    if (winner(next) === "O") return i;
  }
  for (const i of empty) {
    const next = [...board];
    next[i] = "X";
    if (winner(next) === "X") return i;
  }
  if (empty.includes(4)) return 4;
  const corners = empty.filter((i) => [0, 2, 6, 8].includes(i));
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

export function TicTacToeGame() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [status, setStatus] = useState("Your turn (X)");

  function play(i: number) {
    if (board[i] || winner(board)) return;
    const next = [...board];
    next[i] = "X";
    const w = winner(next);
    if (w) {
      setBoard(next);
      setStatus("You win!");
      return;
    }
    if (next.every((c) => c !== null)) {
      setBoard(next);
      setStatus("Draw!");
      return;
    }
    const ai = aiMove(next);
    if (ai >= 0) next[ai] = "O";
    const w2 = winner(next);
    setBoard(next);
    if (w2) setStatus("Computer wins!");
    else if (next.every((c) => c !== null)) setStatus("Draw!");
    else setStatus("Your turn (X)");
  }

  function reset() {
    setBoard(Array(9).fill(null));
    setStatus("Your turn (X)");
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-semibold text-vintage-ink">{status}</p>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            onClick={() => play(i)}
            className="flex h-16 w-16 items-center justify-center rounded-sm border-2 border-vintage-border bg-vintage-paper text-2xl font-bold text-vintage-ink hover:bg-vintage-paper-dark/50 sm:h-20 sm:w-20"
          >
            <span className={cell === "X" ? "text-vintage-rust" : "text-vintage-olive"}>
              {cell ?? ""}
            </span>
          </button>
        ))}
      </div>
      <button type="button" onClick={reset} className="vintage-btn-outline px-4 py-2 text-sm">
        New game
      </button>
    </div>
  );
}
