import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/* ================================
   Animated Background Per Theme
================================ */
function ThemeBackground({ theme }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Light */}
      <motion.div
        animate={{ opacity: theme === "light" ? 1 : 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-br from-white via-indigo-50 to-purple-100"
      />

      {/* System */}
      <motion.div
        animate={{ opacity: theme === "system" ? 1 : 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-br from-neutral-100 via-neutral-200 to-indigo-200"
      />

      {/* Dark */}
      <motion.div
        animate={{ opacity: theme === "dark" ? 1 : 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-br from-black via-neutral-900 to-purple-900"
      />
    </div>
  );
}

/* ================================
   Sliding Pill Theme Toggle
================================ */
function ThemeToggle({ theme, setTheme }) {
  const positions = {
    system: "4px",
    light: "52px",
    dark: "100px",
  };

  return (
    <div className="relative w-[150px] rounded-full bg-white/10 backdrop-blur-md p-1 flex items-center">
      <motion.div
        className="absolute top-1 h-[32px] w-[48px] rounded-full bg-white/20"
        animate={{ left: positions[theme] }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />

      {["system", "light", "dark"].map((mode) => (
        <button
          key={mode}
          onClick={() => setTheme(mode)}
          className="relative z-10 w-[48px] h-[32px] flex items-center justify-center text-sm"
          aria-label={`Switch to ${mode} mode`}
        >
          {mode === "system" ? "🖥" : mode === "light" ? "☀" : "🌙"}
        </button>
      ))}
    </div>
  );
}

/* ================================
   App
================================ */
export default function App() {
  const [theme, setTheme] = useState("system");
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  /* Load saved theme */
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) setTheme(saved);
  }, []);

  /* Apply theme */
  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") root.classList.add("dark");
    else if (theme === "light") root.classList.remove("dark");
    else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", systemDark);
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  /* Listen for OS theme change */
  useEffect(() => {
    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () =>
      document.documentElement.classList.toggle("dark", media.matches);

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  /* Mouse spotlight */
  useEffect(() => {
    const move = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden transition-colors duration-500">
      {/* Animated background */}
      <ThemeBackground theme={theme} />

      {/* Cursor spotlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(600px at ${mouse.x}px ${mouse.y}px, rgba(168,85,247,0.15), transparent 40%)`,
        }}
      />

      {/* Ambient blobs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-600/30 blur-[160px] animate-floatSlow" />
      <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-indigo-600/30 blur-[160px] animate-floatSlower" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 text-neutral-900 dark:text-white">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-3xl rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/10 shadow-[0_0_140px_rgba(168,85,247,0.35)] p-10"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              AI Study Mentor
            </h1>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>

          <p className="text-white/60 mb-10 text-lg">
            Intelligent learning powered by Retrieval-Augmented Generation & LLMs
          </p>

          {/* Input */}
          <div className="flex gap-4">
            <input
              placeholder="Ask a deep study question..."
              className="flex-1 px-6 py-4 rounded-2xl bg-black/40 border border-white/10 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/60 transition"
            />
            <motion.button
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.96 }}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 font-semibold shadow-lg shadow-purple-500/40"
            >
              Ask 🚀
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Floating animations */}
      <style>{`
        @keyframes floatSlow {
          0%,100% { transform: translateY(0) }
          50% { transform: translateY(-40px) }
        }
        @keyframes floatSlower {
          0%,100% { transform: translateY(0) }
          50% { transform: translateY(-70px) }
        }
        .animate-floatSlow {
          animation: floatSlow 12s ease-in-out infinite;
        }
        .animate-floatSlower {
          animation: floatSlower 18s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
