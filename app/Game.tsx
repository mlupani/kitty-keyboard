"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ROWS = [
  "1234567890".split(""),
  "QWERTYUIOP".split(""),
  "ASDFGHJKLÑ".split(""),
  "ZXCVBNM".split(""),
];
const kind = (c: string) => (/\d/.test(c) ? "el número" : "la letra");
const LETTERS = ROWS.flat();
const MODES = {
  all: { label: "Todo", pool: LETTERS },
  letters: { label: "Letras", pool: LETTERS.filter((c) => !/\d/.test(c)) },
  numbers: { label: "Números", pool: LETTERS.filter((c) => /\d/.test(c)) },
  words: { label: "Animalitos", pool: LETTERS },
  name: { label: "Mi nombre", pool: LETTERS },
};
type Mode = keyof typeof MODES;
const WORDS: [string, string][] = [
  ["🐶", "perro"], ["🐱", "gato"], ["🐟", "pez"], ["🌞", "sol"], ["🍎", "manzana"],
  ["🏠", "casa"], ["🌙", "luna"], ["🐮", "vaca"], ["🐴", "caballo"], ["🦆", "pato"],
  ["🐸", "rana"], ["🐻", "oso"], ["🐭", "ratón"], ["🌸", "flor"], ["👵", "abuela"],
  ["🍌", "banana"], ["🐘", "elefante"], ["🦁", "león"], ["🐢", "tortuga"], ["🎈", "globo"],
];
const cleanName = (n: string) =>
  n
    .toUpperCase()
    .split("")
    .map((c) => (c === "Ñ" ? c : c.normalize("NFD")[0]))
    .filter((c) => LETTERS.includes(c) && !/\d/.test(c));
const CATS = ["🐱", "😺", "😸", "😻", "🐈", "😽"];
const PRAISE = ["¡Muy bien!", "¡Genial!", "¡Lo lograste!", "¡Qué lista!", "¡Miau, perfecto!"];

const LATAM = ["es-MX", "es-US", "es-419", "es-AR", "es-CO", "es-CL", "es-PE", "es-VE"];
const FEMALE = /dalia|sabina|elena|salome|paulina|monica|helena|laura|google espa|female|mujer/i;

function bestVoice(): SpeechSynthesisVoice | undefined {
  const es = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("es"));
  const score = (v: SpeechSynthesisVoice) =>
    (LATAM.some((l) => v.lang.replace("_", "-").startsWith(l)) ? 4 : 0) +
    (FEMALE.test(v.name) ? 2 : 0) +
    (/online|natural|neural/i.test(v.name) ? 1 : 0);
  return es.sort((a, b) => score(b) - score(a))[0];
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = bestVoice();
  u.lang = voice?.lang ?? "es-MX";
  if (voice) u.voice = voice;
  u.rate = 1;
  u.pitch = 1.5;
  synth.speak(u);
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export default function Game() {
  const [started, setStarted] = useState(false);
  const [target, setTarget] = useState("A");
  const [pressed, setPressed] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [win, setWin] = useState<{ cat: string; msg: string } | null>(null);
  const [score, setScore] = useState(0);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [done, setDone] = useState(0);
  const wordRef = useRef<[string, string] | null>(null);
  const nameRef = useRef<string[]>([]);
  const nameIdx = useRef(0);
  const prompt = useRef("");
  const locked = useRef(false);
  const mode = useRef<Mode>("all");
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const nextLetter = useCallback((prev?: string) => {
    const m = mode.current;
    let l: string;
    if (m === "words") {
      let w = pick(WORDS);
      while (w === wordRef.current) w = pick(WORDS);
      wordRef.current = w;
      l = w[1][0].toUpperCase();
      setEmoji(w[0]);
      prompt.current = `¿Con qué letra empieza ${w[1]}?`;
    } else if (m === "name") {
      l = nameRef.current[nameIdx.current];
      setEmoji(null);
      setDone(nameIdx.current);
      prompt.current = `Aprieta la letra ${l}`;
    } else {
      const pool = MODES[m].pool;
      l = pick(pool);
      while (l === prev) l = pick(pool);
      setEmoji(null);
      prompt.current = `Aprieta ${kind(l)} ${l}`;
    }
    setTarget(l);
    setWin(null);
    locked.current = false;
    speak(prompt.current);
  }, []);

  const press = useCallback(
    (letter: string) => {
      if (!started || locked.current) return;
      setPressed(letter);
      later(() => setPressed(null), 250);
      if (letter === target) {
        locked.current = true;
        let msg = pick(PRAISE);
        if (mode.current === "words") msg = `¡${target} de ${wordRef.current?.[1]}!`;
        if (mode.current === "name") {
          nameIdx.current += 1;
          setDone(nameIdx.current);
          if (nameIdx.current >= nameRef.current.length) {
            msg = `¡Escribiste ${nameRef.current.join("")}!`;
            nameIdx.current = 0;
          }
        }
        setWin({ cat: pick(CATS), msg });
        setScore((s) => s + 1);
        speak(msg);
        later(() => nextLetter(target), 2600);
      } else {
        setWrong(letter);
        later(() => setWrong(null), 500);
        const hint = mode.current === "words" ? prompt.current : `Busca ${kind(target)} ${target}`;
        speak(`Ese es ${/\d/.test(letter) ? "el" : "la"} ${letter}. ${hint}`);
      }
    },
    [started, target, nextLetter],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toUpperCase();
      if (LETTERS.includes(k)) {
        e.preventDefault();
        press(k);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  useEffect(() => {
    try {
      setName(localStorage.getItem("gatito-name") ?? "");
    } catch {}
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const start = (m: Mode) => {
    if (m === "name") {
      nameRef.current = cleanName(name);
      if (!nameRef.current.length) return;
      nameIdx.current = 0;
    }
    mode.current = m;
    setScore(0);
    setStarted(true);
    nextLetter();
  };

  return (
    <main className={`stage ${win ? "celebrate" : ""}`}>
      <div className="leds" aria-hidden />
      {!started ? (
        <div className="intro">
          <div className="big-cat">🐱</div>
          <h1>Teclado de Gatitos</h1>
          <input
            className="name-input"
            placeholder="Escribe su nombre"
            maxLength={12}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              try {
                localStorage.setItem("gatito-name", e.target.value);
              } catch {}
            }}
          />
          <div className="modes">
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button
                key={m}
                className="play"
                disabled={m === "name" && !cleanName(name).length}
                onClick={() => start(m)}
              >
                {MODES[m].label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <header className="hud">
            <button className="again" onClick={() => setStarted(false)}>
              🏠
            </button>
            <span>⭐ {score}</span>
            <button className="again" onClick={() => speak(prompt.current)}>
              🔊
            </button>
          </header>
          {mode.current === "name" && (
            <div className="namebar">
              {nameRef.current.map((c, i) => (
                <span key={i} className={i < done ? "got" : i === done ? "now" : ""}>
                  {c}
                </span>
              ))}
            </div>
          )}
          <div className="target" key={emoji ?? target}>
            {emoji ?? target}
          </div>
          <div className="keyboard">
            {ROWS.map((row, i) => (
              <div className="row" key={i} style={{ marginLeft: i === 3 ? "6%" : i === 2 ? "3%" : 0 }}>
                {row.map((l) => (
                  <button
                    key={l}
                    className={`key ${l === target ? "hint" : ""} ${pressed === l ? "down" : ""} ${wrong === l ? "oops" : ""}`}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      press(l);
                    }}
                  >
                    <span className="ear l" />
                    <span className="ear r" />
                    <span className="face">{l}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
      {win && (
        <div className="win" aria-live="polite">
          <div className="win-cat">{win.cat}</div>
          <div className="win-msg">{win.msg}</div>
          {Array.from({ length: 24 }).map((_, i) => (
            <i
              key={i}
              className="confetti"
              style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.1}s` }}
            >
              {i % 3 === 0 ? "🐾" : i % 3 === 1 ? "✨" : "💖"}
            </i>
          ))}
        </div>
      )}
    </main>
  );
}
