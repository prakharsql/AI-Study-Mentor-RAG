import { useEffect, useState } from "react";
import axios from "axios";
import { Moon, Sun } from "lucide-react";

export default function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post("http://localhost:8000/ask", { question });
      setResult(res.data);
    } catch {
      alert("Backend not responding");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white dark:bg-neutral-950 dark:text-white transition-colors duration-500">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#6366f1_0%,transparent_35%),radial-gradient(circle_at_80%_80%,#a855f7_0%,transparent_35%)] opacity-30 pointer-events-none" />

      {/* Top Bar */}
      <header className="relative z-10 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <h1 className="text-xl font-semibold tracking-wide">
          AI Study Mentor
        </h1>

        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Main Card */}
      <main className="relative z-10 flex justify-center px-4">
        <div className="w-full max-w-3xl bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_80px_-20px_rgba(99,102,241,0.4)] p-10 animate-fadeIn">

          <h2 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Ask Anything
          </h2>

          <p className="text-center text-white/60 mb-10">
            Intelligent learning powered by RAG & Large Language Models
          </p>

          {/* Input */}
          <div className="flex gap-4">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a study question…"
              className="flex-1 px-5 py-4 rounded-2xl bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />

            <button
              onClick={askQuestion}
              className="px-8 py-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-105 active:scale-95 transition-all font-semibold shadow-xl"
            >
              Ask
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <p className="mt-8 text-center text-indigo-300 animate-pulse">
              Thinking deeply…
            </p>
          )}

          {/* Result */}
          {result && (
            <div className="mt-10 space-y-6 animate-slideUp">

              <div className="bg-black/40 p-6 rounded-2xl border border-white/10">
                <h3 className="text-lg font-semibold mb-2">🧠 Answer</h3>
                <p className="text-white/90 leading-relaxed">
                  {result.answer}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Stat label="Similarity" value={result.similarity} />
                <Stat label="Importance" value={result.importance} />
                <Stat label="Documents" value={result.documents} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center hover:scale-105 transition-transform">
      <p className="text-sm text-white/60">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
