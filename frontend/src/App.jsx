import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function App() {
  const [dark, setDark] = useState(true);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const move = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden text-white">

      {/* Cursor spotlight */}
      <div
        className="pointer-events-none absolute inset-0 transition duration-300"
        style={{
          background: `radial-gradient(600px at ${mouse.x}px ${mouse.y}px, rgba(168,85,247,0.15), transparent 40%)`,
        }}
      />

      {/* Ambient gradient blobs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-600/30 blur-[160px] animate-floatSlow" />
      <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-indigo-600/30 blur-[160px] animate-floatSlower" />
      <div className="absolute bottom-[-300px] left-1/4 w-[600px] h-[600px] bg-fuchsia-600/20 blur-[160px] animate-floatSlow" />

      {/* Center */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-3xl rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/10 shadow-[0_0_140px_rgba(168,85,247,0.35)] p-10"
        >

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_6px_24px_rgba(168,85,247,0.6)]"
            >
              AI Study Mentor
            </motion.h1>

            <button
              onClick={() => setDark(!dark)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition hover:scale-105"
            >
              {dark ? "☀ Light" : "🌙 Dark"}
            </button>
          </div>

          <p className="text-white/60 mb-10 text-lg">
            Intelligent learning powered by Retrieval-Augmented Generation & LLMs
          </p>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex gap-4"
          >
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
          </motion.div>
        </motion.div>
      </div>

      {/* Animations */}
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
