import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Screen, Title } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";

type GameId = "snake" | "memory" | "tictactoe";

function SnakeMobile() {
  const SIZE = 14;
  const [snake, setSnake] = useState([{ x: 7, y: 7 }]);
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [food, setFood] = useState({ x: 10, y: 7 });
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [run, setRun] = useState(false);
  const dirRef = useRef(dir);
  dirRef.current = dir;

  const reset = useCallback(() => {
    setSnake([{ x: 7, y: 7 }]);
    setDir({ x: 1, y: 0 });
    setFood({ x: 10, y: 7 });
    setScore(0);
    setOver(false);
    setRun(true);
  }, []);

  useEffect(() => {
    if (!run || over) return;
    const id = setInterval(() => {
      setSnake((prev) => {
        const h = prev[0];
        const n = { x: h.x + dirRef.current.x, y: h.y + dirRef.current.y };
        if (n.x < 0 || n.x >= SIZE || n.y < 0 || n.y >= SIZE || prev.some((s) => s.x === n.x && s.y === n.y)) {
          setOver(true);
          setRun(false);
          return prev;
        }
        const ate = n.x === food.x && n.y === food.y;
        const g = [n, ...prev];
        if (!ate) g.pop();
        else {
          setScore((s) => s + 10);
          let f: { x: number; y: number };
          do {
            f = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
          } while (g.some((s) => s.x === f.x && s.y === f.y));
          setFood(f);
        }
        return g;
      });
    }, 160);
    return () => clearInterval(id);
  }, [run, over, food]);

  function turn(dx: number, dy: number) {
    const d = dirRef.current;
    if (dx && d.x !== -dx) setDir({ x: dx, y: 0 });
    if (dy && d.y !== -dy) setDir({ x: 0, y: dy });
    if (!run && !over) setRun(true);
  }

  return (
    <View style={gStyles.box}>
      <Text style={gStyles.score}>Score: {score}</Text>
      <View style={[gStyles.grid, { width: SIZE * 16, height: SIZE * 16 }]}>
        {snake.map((s, i) => (
          <View
            key={`${s.x}-${s.y}-${i}`}
            style={[
              gStyles.cell,
              { left: s.x * 16, top: s.y * 16, backgroundColor: i === 0 ? colors.rust : colors.border },
            ]}
          />
        ))}
        <View style={[gStyles.cell, gStyles.food, { left: food.x * 16, top: food.y * 16 }]} />
      </View>
      {over && <Text style={gStyles.over}>Game over!</Text>}
      <View style={gStyles.pad}>
        <Pressable style={gStyles.btn} onPress={() => turn(0, -1)}><Text>↑</Text></Pressable>
        <View style={gStyles.row}>
          <Pressable style={gStyles.btn} onPress={() => turn(-1, 0)}><Text>←</Text></Pressable>
          <Pressable style={gStyles.btn} onPress={() => turn(1, 0)}><Text>→</Text></Pressable>
        </View>
        <Pressable style={gStyles.btn} onPress={() => turn(0, 1)}><Text>↓</Text></Pressable>
      </View>
      {!run && <Pressable style={gStyles.start} onPress={reset}><Text style={gStyles.startText}>Start</Text></Pressable>}
    </View>
  );
}

const EMOJIS = ["🎵", "📻", "🎸", "🎹", "🥁", "🎺", "🎻", "🪕"];

function MemoryMobile() {
  const [cards, setCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  function init() {
    const deck = [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5).map((emoji, id) => ({
      id, emoji, flipped: false, matched: false,
    }));
    setCards(deck);
    setPicked([]);
    setMoves(0);
  }

  useEffect(() => { init(); }, []);

  function flip(i: number) {
    if (picked.length >= 2) return;
    const c = cards[i];
    if (c.flipped || c.matched) return;
    const next = cards.map((x, j) => (j === i ? { ...x, flipped: true } : x));
    setCards(next);
    const np = [...picked, i];
    setPicked(np);
    if (np.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = np;
      if (next[a].emoji === next[b].emoji) {
        setCards((prev) => prev.map((x, j) => (j === a || j === b ? { ...x, matched: true } : x)));
        setPicked([]);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((x, j) => (j === a || j === b ? { ...x, flipped: false } : x)));
          setPicked([]);
        }, 600);
      }
    }
  }

  return (
    <View style={gStyles.box}>
      <Text style={gStyles.score}>Moves: {moves}</Text>
      <View style={gStyles.memGrid}>
        {cards.map((c, i) => (
          <Pressable key={c.id} style={gStyles.memCard} onPress={() => flip(i)}>
            <Text style={gStyles.memText}>{c.flipped || c.matched ? c.emoji : "?"}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={gStyles.start} onPress={init}><Text style={gStyles.startText}>New game</Text></Pressable>
    </View>
  );
}

type Cell = "X" | "O" | null;

function TicTacToeMobile() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [msg, setMsg] = useState("Your turn (X)");

  function lines(b: Cell[]) {
    const w = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, c, d] of w) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    return null;
  }

  function play(i: number) {
    if (board[i] || lines(board)) return;
    const n = [...board];
    n[i] = "X";
    if (lines(n)) { setBoard(n); setMsg("You win!"); return; }
    if (n.every((x) => x)) { setBoard(n); setMsg("Draw"); return; }
    const empty = n.map((v, j) => (v ? -1 : j)).filter((j) => j >= 0);
    n[empty[Math.floor(Math.random() * empty.length)]] = "O";
    const w = lines(n);
    setBoard(n);
    setMsg(w ? "Computer wins" : n.every((x) => x) ? "Draw" : "Your turn (X)");
  }

  return (
    <View style={gStyles.box}>
      <Text style={gStyles.score}>{msg}</Text>
      <View style={gStyles.ttt}>
        {board.map((c, i) => (
          <Pressable key={i} style={gStyles.tttCell} onPress={() => play(i)}>
            <Text style={[gStyles.tttText, c === "X" && { color: colors.rust }]}>{c ?? ""}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={gStyles.start} onPress={() => { setBoard(Array(9).fill(null)); setMsg("Your turn (X)"); }}>
        <Text style={gStyles.startText}>New game</Text>
      </Pressable>
    </View>
  );
}

export default function GamesScreen() {
  const [game, setGame] = useState<GameId>("snake");
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
  }, []);

  return (
    <Screen>
      <ScrollView>
        <Title>Offline games</Title>
        <Text style={styles.hint}>
          {online ? "Online — games work without internet too." : "Offline — play while you wait to reconnect."}
        </Text>
        <View style={styles.tabs}>
          {(["snake", "memory", "tictactoe"] as GameId[]).map((id) => (
            <Pressable
              key={id}
              style={[styles.tab, game === id && styles.tabOn]}
              onPress={() => setGame(id)}
            >
              <Text style={game === id ? styles.tabTextOn : styles.tabText}>
                {id === "snake" ? "Snake" : id === "memory" ? "Memory" : "Tic-Tac-Toe"}
              </Text>
            </Pressable>
          ))}
        </View>
        {game === "snake" && <SnakeMobile />}
        {game === "memory" && <MemoryMobile />}
        {game === "tictactoe" && <TicTacToeMobile />}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.inkMuted, marginBottom: spacing.md, fontSize: 13 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  tab: { borderWidth: 2, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  tabOn: { backgroundColor: colors.rust, borderColor: colors.rustDark },
  tabText: { color: colors.inkMuted, fontWeight: "600", fontSize: 12 },
  tabTextOn: { color: colors.btnText, fontWeight: "600", fontSize: 12 },
});

const gStyles = StyleSheet.create({
  box: { alignItems: "center", marginBottom: spacing.lg },
  score: { fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  grid: { position: "relative", backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.border },
  cell: { position: "absolute", width: 14, height: 14, borderRadius: 2 },
  food: { backgroundColor: colors.rust, width: 12, height: 12 },
  pad: { alignItems: "center", marginTop: spacing.md },
  row: { flexDirection: "row", gap: 8 },
  btn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.border, borderRadius: 4, margin: 4 },
  start: { marginTop: spacing.sm, backgroundColor: colors.rust, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  startText: { color: colors.btnText, fontWeight: "700" },
  over: { color: colors.rust, marginTop: 8 },
  memGrid: { flexDirection: "row", flexWrap: "wrap", width: 280, gap: 6, justifyContent: "center" },
  memCard: { width: 62, height: 62, borderWidth: 2, borderColor: colors.border, borderRadius: 4, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  memText: { fontSize: 24 },
  ttt: { flexDirection: "row", flexWrap: "wrap", width: 204, gap: 4 },
  tttCell: { width: 64, height: 64, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  tttText: { fontSize: 28, fontWeight: "800", color: colors.ink },
});
