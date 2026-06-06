import { useState, useEffect, useRef } from "react";

// Cycles through phrases with a type-then-delete effect and returns the current
// string. Pass a stable (module-level) phrases array so it doesn't restart.
export default function useTypewriter(
  phrases,
  { typeSpeed = 70, deleteSpeed = 60, holdTime = 1700, startDelay = 700 } = {}
) {
  const [text, setText] = useState("");
  const state = useRef({ phrase: 0, char: 0, phase: "typing" });

  useEffect(() => {
    if (!phrases || phrases.length === 0) return undefined;
    let timer;
    let alive = true;
    // Restart cleanly whenever the phrase list changes (e.g. dynamic titles
    // arrive) so we never resume mid-word on a different phrase.
    const s = state.current;
    s.phrase = 0;
    s.char = 0;
    s.phase = "typing";
    setText("");

    const tick = () => {
      if (!alive) return;
      const current = phrases[s.phrase % phrases.length];

      if (s.phase === "typing") {
        s.char += 1;
        setText(current.slice(0, s.char));
        if (s.char >= current.length) {
          s.phase = "holding";
          timer = setTimeout(tick, holdTime);
        } else {
          timer = setTimeout(tick, typeSpeed);
        }
      } else if (s.phase === "holding") {
        s.phase = "deleting";
        timer = setTimeout(tick, deleteSpeed);
      } else {
        s.char -= 1;
        setText(current.slice(0, Math.max(0, s.char)));
        if (s.char <= 0) {
          s.phase = "typing";
          s.phrase = (s.phrase + 1) % phrases.length;
          timer = setTimeout(tick, typeSpeed + 250);
        } else {
          timer = setTimeout(tick, deleteSpeed);
        }
      }
    };

    timer = setTimeout(tick, startDelay);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [phrases, typeSpeed, deleteSpeed, holdTime, startDelay]);

  return text;
}
