import { useState } from "react";
import axios from "axios";

function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post("/ask", {
        question: question,
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      alert("Backend not responding");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>🎓 AI Study Mentor</h1>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a study question..."
        style={{ width: "70%", padding: "10px" }}
      />

      <button onClick={askQuestion} style={{ marginLeft: "10px" }}>
        Ask
      </button>

      {loading && <p>Thinking...</p>}

      {result && (
        <div style={{ marginTop: "20px" }}>
          <h3>🧠 Answer</h3>
          <p>{result.answer}</p>

          <h4>📊 Analysis</h4>
          <p>Similarity Score: {result.similarity}</p>
          <p>Topic Importance: {result.importance}</p>
          <p>Documents Loaded: {result.documents}</p>
        </div>
      )}
    </div>
  );
}

export default App;
