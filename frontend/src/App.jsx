import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function App() {
  const [dark, setDark] = useState(true);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Mouse tracking
  useEffect(() => {
    const move = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  // 🎇 Particle Background
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let particles = [];
    const count = 60;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 1,
        vx: Math.random() * 0.3 - 0.15,
        vy: Math.random() * 0.3 - 0.15,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Mouse attraction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          p.x -= dx * 0.002;
          p.y -= dy * 0.002;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? "rgba(168,85,247,0.6)"
          : "rgba(99,102,241,0.35)";
        ctx.fill();
      });

      requestAnimationFrame(draw);
    };
    draw();

    return () => window.removeEventListener("resize", resize);
  }, [mouse, dark]);

  return (
    <div
      className="
        relative min-h-screen overflow-hidden transition-colors duration-700
        bg-gradient-to-br
          from-[#f6f4ff] via-[#f1edff] to-[#ffffff]
        dark:from-[#05010d] dark:via-[#0b0320] dark:to-black
        text-black dark:text-white
      "
    >
      {/* 🎇 Particle Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Cursor spotlight */}
      <div
        className="pointer-events-none absolute inset-0 transition duration-300 z-10"
        style={{
          background: `radial-gradient(600px at ${mouse.x}px ${mouse.y}px,
            rgba(168,85,247,0.18), transparent 45%)`,
        }}
      />

      {/* Center */}
      <div className="relative z-20 min-h-screen flex items-center justify-center px-6">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="
            w-full max-w-3xl rounded-[28px]
            bg-white/80 dark:bg-white/10
            backdrop-blur-[28px]
            border border-white/30 dark:border-white/10
            shadow-[0_40px_120px_rgba(168,85,247,0.25)]
            p-10
          "
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1
              className="
                text-5xl font-semibold tracking-tight
                bg-gradient-to-r from-purple-600 via-indigo-500 to-fuchsia-500
                bg-clip-text text-transparent
              "
            >
              AI Study Mentor
            </h1>

            <button
              onClick={() => setDark(!dark)}
              className="
                px-4 py-2 rounded-full
                bg-black/5 dark:bg-white/10
                hover:scale-105 transition
                backdrop-blur-md
              "
            >
              {dark ? "☀ Light" : "🌙 Dark"}
            </button>
          </div>

          <p className="text-black/60 dark:text-white/60 mb-10 text-lg">
            Intelligent learning powered by Retrieval-Augmented Generation & LLMs
          </p>

          {/* Input */}
          <div className="flex gap-4">
            <input
              placeholder="Ask a deep study question..."
              className="
                flex-1 px-6 py-4 rounded-2xl
                bg-white/70 dark:bg-black/40
                text-black dark:text-white
                placeholder-black/40 dark:placeholder-white/40
                border border-black/10 dark:border-white/10
                backdrop-blur-xl
                focus:outline-none focus:ring-2 focus:ring-purple-500/50
                transition
              "
            />

            <motion.button
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.95 }}
              className="
                px-8 py-4 rounded-2xl
                bg-gradient-to-r from-purple-500 to-indigo-500
                text-white font-medium
                shadow-lg shadow-purple-500/40
              "
            >
              Ask 🚀
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
