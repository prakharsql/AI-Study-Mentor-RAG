import { useState } from "react";
import axios from "axios";

export default function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/ask", {
        question,
      });
      setResult(res.data);
    } catch {
      alert("Backend not responding");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-3xl bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-white">

        <h1 className="text-4xl font-extrabold text-center mb-2">
          🎓 AI Study Mentor
        </h1>

        <p className="text-center text-white/70 mb-8">
          Intelligent learning powered by RAG + LLMs
        </p>

        <div className="flex gap-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a study question..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <button
            onClick={askQuestion}
            className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 transition-all font-semibold shadow-lg"
          >
            Ask 🚀
          </button>
        </div>

        {loading && (
          <p className="mt-6 text-center animate-pulse text-indigo-300">
            Thinking...
          </p>
        )}

        {result && (
          <div className="mt-8 space-y-4">

            <div className="bg-black/30 p-5 rounded-xl border border-white/10">
              <h3 className="text-lg font-semibold mb-1">🧠 Answer</h3>
              <p className="text-white/90">{result.answer}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Stat label="Similarity" value={result.similarity} />
              <Stat label="Importance" value={result.importance} />
              <Stat label="Docs" value={result.documents} />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white/10 p-4 rounded-xl text-center">
      <p className="text-sm text-white/60">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
