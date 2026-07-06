"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SIZE = 16;
const CELL = 18;

type Point = { x: number; y: number };

function randomFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

export function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>([{ x: 8, y: 8 }]);
  const [dir, setDir] = useState<Point>({ x: 1, y: 0 });
  const [food, setFood] = useState<Point>(() => randomFood([{ x: 8, y: 8 }]));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);
  const dirRef = useRef(dir);

  useEffect(() => {
    dirRef.current = dir;
  }, [dir]);

  const reset = useCallback(() => {
    const start = [{ x: 8, y: 8 }];
    setSnake(start);
    setDir({ x: 1, y: 0 });
    setFood(randomFood(start));
    setScore(0);
    setGameOver(false);
    setRunning(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const d = dirRef.current;
      if (e.key === "ArrowUp" && d.y !== 1) setDir({ x: 0, y: -1 });
      if (e.key === "ArrowDown" && d.y !== -1) setDir({ x: 0, y: 1 });
      if (e.key === "ArrowLeft" && d.x !== 1) setDir({ x: -1, y: 0 });
      if (e.key === "ArrowRight" && d.x !== -1) setDir({ x: 1, y: 0 });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!running || gameOver) return;

    const id = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const next = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };

        if (next.x < 0 || next.x >= SIZE || next.y < 0 || next.y >= SIZE) {
          setGameOver(true);
          setRunning(false);
          return prev;
        }
        if (prev.some((s) => s.x === next.x && s.y === next.y)) {
          setGameOver(true);
          setRunning(false);
          return prev;
        }

        const ate = next.x === food.x && next.y === food.y;
        const grown = [next, ...prev];
        if (!ate) grown.pop();
        else {
          setScore((s) => s + 10);
          setFood(randomFood(grown));
        }
        return grown;
      });
    }, 140);

    return () => clearInterval(id);
  }, [running, gameOver, food]);

  const pad = SIZE * CELL;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-xs items-center justify-between text-sm">
        <span className="font-semibold text-vintage-ink">Score: {score}</span>
        {!running && !gameOver && (
          <button type="button" onClick={reset} className="vintage-btn px-4 py-1.5 text-sm">
            Start
          </button>
        )}
        {gameOver && (
          <button type="button" onClick={reset} className="vintage-btn px-4 py-1.5 text-sm">
            Play again
          </button>
        )}
      </div>
      <div
        className="vintage-card-inset relative border-2 border-vintage-border"
        style={{ width: pad, height: pad }}
      >
        {snake.map((s, i) => (
          <div
            key={`${s.x}-${s.y}-${i}`}
            className={`absolute rounded-sm ${i === 0 ? "bg-vintage-rust" : "bg-vintage-olive"}`}
            style={{
              width: CELL - 2,
              height: CELL - 2,
              left: s.x * CELL + 1,
              top: s.y * CELL + 1,
            }}
          />
        ))}
        <div
          className="absolute rounded-full bg-vintage-rust/80"
          style={{
            width: CELL - 4,
            height: CELL - 4,
            left: food.x * CELL + 2,
            top: food.y * CELL + 2,
          }}
        />
      </div>
      {gameOver && <p className="text-sm text-vintage-rust">Game over!</p>}
      <p className="text-center text-xs text-vintage-ink-muted">
        Arrow keys to move · works offline
      </p>
      <div className="flex gap-2 md:hidden">
        {(
          [
            ["↑", { x: 0, y: -1 }],
            ["↓", { x: 0, y: 1 }],
            ["←", { x: -1, y: 0 }],
            ["→", { x: 1, y: 0 }],
          ] as const
        ).map(([label, d]) => (
          <button
            key={label}
            type="button"
            className="vintage-btn-outline h-10 w-10 text-lg"
            onClick={() => {
              const cur = dirRef.current;
              if (d.x && cur.x !== -d.x) setDir(d);
              if (d.y && cur.y !== -d.y) setDir(d);
              if (!running && !gameOver) setRunning(true);
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
