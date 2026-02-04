import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FileText,
  Upload,
  MessageSquare,
  Sun,
  Moon,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
  GraduationCap,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const API = "/api";

// ----- Premium Sidebar Component -----
function Sidebar({ files, onFilesChange, dark }) {
  const [syllabusProgress, setSyllabusProgress] = useState(null);
  const [papersProgress, setPapersProgress] = useState(null);
  const syllabusInputRef = useRef(null);
  const papersInputRef = useRef(null);

  const uploadSyllabus = useCallback(
    async (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const form = new FormData();
      form.append("file", file);
      setSyllabusProgress({ name: file.name, percent: 0 });
      try {
        const res = await axios.post(`${API}/upload/syllabus`, form, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (p) => {
            const percent = p.total ? Math.round((p.loaded / p.total) * 100) : 50;
            setSyllabusProgress((prev) => ({ ...prev, percent }));
          },
        });
        if (res.data.status === "failed") {
          setSyllabusProgress((prev) => ({ ...prev, error: true, errorMsg: res.data.error || "Processing failed" }));
        }
        onFilesChange();
      } catch (err) {
        const errMsg = err.response?.data?.detail || err.message || "Upload failed";
        setSyllabusProgress((prev) => ({ ...prev, error: true, errorMsg: errMsg }));
      } finally {
        setTimeout(() => setSyllabusProgress(null), 3000);
        if (syllabusInputRef.current) syllabusInputRef.current.value = "";
      }
    },
    [onFilesChange]
  );

  const uploadPapers = useCallback(
    async (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const form = new FormData();
      form.append("file", file);
      setPapersProgress({ name: file.name, percent: 0 });
      try {
        const res = await axios.post(`${API}/upload/papers`, form, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (p) => {
            const percent = p.total ? Math.round((p.loaded / p.total) * 100) : 50;
            setPapersProgress((prev) => ({ ...prev, percent }));
          },
        });
        if (res.data.status === "failed") {
          setPapersProgress((prev) => ({ ...prev, error: true, errorMsg: res.data.error || "Processing failed" }));
        }
        onFilesChange();
      } catch (err) {
        const errMsg = err.response?.data?.detail || err.message || "Upload failed";
        setPapersProgress((prev) => ({ ...prev, error: true, errorMsg: errMsg }));
      } finally {
        setTimeout(() => setPapersProgress(null), 3000);
        if (papersInputRef.current) papersInputRef.current.value = "";
      }
    },
    [onFilesChange]
  );

  const hasProcessedFiles = files.some((f) => f.status === "processed");

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`
        w-[340px] shrink-0 flex flex-col
        border-r border-black/10 dark:border-white/10
        bg-gradient-to-b from-white/90 to-white/70 dark:from-gray-900/95 dark:to-gray-900/80
        backdrop-blur-2xl shadow-xl
      `}
    >
      {/* Header */}
      <div className="p-6 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Documents</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Upload study materials</p>
          </div>
        </div>

        {/* Syllabus Upload Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="mb-4 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200/50 dark:border-purple-800/50"
        >
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap size={16} className="text-purple-600 dark:text-purple-400" />
            <label className="text-sm font-semibold text-gray-900 dark:text-white">Syllabus</label>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">PDF format only</p>
          <input ref={syllabusInputRef} type="file" accept=".pdf" className="hidden" onChange={uploadSyllabus} />
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => syllabusInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 text-sm font-medium text-gray-900 dark:text-white transition-all shadow-sm hover:shadow-md"
          >
            <Upload size={16} />
            Upload PDF
          </motion.button>
          <AnimatePresence>
            {syllabusProgress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title={syllabusProgress.name}>
                    {syllabusProgress.name}
                  </span>
                  {syllabusProgress.error ? (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <XCircle size={12} />
                      Failed
                    </span>
                  ) : (
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">{syllabusProgress.percent}%</span>
                  )}
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${syllabusProgress.error ? "bg-red-500" : "bg-gradient-to-r from-purple-500 to-indigo-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: syllabusProgress.error ? "100%" : `${syllabusProgress.percent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {syllabusProgress.errorMsg && (
                  <p className="text-xs text-red-500 mt-1.5">{syllabusProgress.errorMsg}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Papers Upload Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200/50 dark:border-blue-800/50"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-blue-600 dark:text-blue-400" />
            <label className="text-sm font-semibold text-gray-900 dark:text-white">Previous Year Papers</label>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">PDF, PNG, JPG, JPEG, TXT</p>
          <input ref={papersInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" className="hidden" onChange={uploadPapers} />
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => papersInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 text-sm font-medium text-gray-900 dark:text-white transition-all shadow-sm hover:shadow-md"
          >
            <Upload size={16} />
            Upload Files
          </motion.button>
          <AnimatePresence>
            {papersProgress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title={papersProgress.name}>
                    {papersProgress.name}
                  </span>
                  {papersProgress.error ? (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <XCircle size={12} />
                      Failed
                    </span>
                  ) : (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{papersProgress.percent}%</span>
                  )}
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${papersProgress.error ? "bg-red-500" : "bg-gradient-to-r from-blue-500 to-cyan-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: papersProgress.error ? "100%" : `${papersProgress.percent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {papersProgress.errorMsg && (
                  <p className="text-xs text-red-500 mt-1.5">{papersProgress.errorMsg}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Uploaded Files</h3>
          {hasProcessedFiles && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
              Ready
            </span>
          )}
        </div>
        {files.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-gray-500 dark:text-gray-400"
          >
            <FileText size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No files uploaded yet</p>
            <p className="text-xs mt-1">Upload syllabus and papers to get started</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${f.status === "processed" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                    {f.status === "processed" ? (
                      <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle size={16} className="text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={f.name}>
                      {f.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        {f.type === "syllabus" ? "Syllabus" : "Paper"}
                      </span>
                      {f.file_type && (
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {f.file_type.replace(".", "").toUpperCase()}
                        </span>
                      )}
                      {f.year != null && (
                        <span className="text-xs text-gray-500 dark:text-gray-500">• {f.year}</span>
                      )}
                    </div>
                    {f.error && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {f.error}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.aside>
  );
}

// ----- Premium Chat Message Component -----
function ChatMessage({ role, content, isStreaming }) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`
          max-w-[80%] rounded-2xl px-5 py-4 shadow-lg
          ${isUser
            ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white"
            : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
          }
        `}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
            {isStreaming ? (
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                Analyzing your documents...
              </span>
            ) : (
              <div className="whitespace-pre-wrap">{content}</div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function App() {
  const [dark, setDark] = useState(true);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const move = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/files`);
      setFiles(data.files || []);
    } catch {
      setFiles([]);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let particles = [];
    const count = 80;

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
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          p.x -= dx * 0.002;
          p.y -= dy * 0.002;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dark ? "rgba(168,85,247,0.4)" : "rgba(99,102,241,0.25)";
        ctx.fill();
      });
      requestAnimationFrame(draw);
    };
    draw();
    return () => window.removeEventListener("resize", resize);
  }, [mouse, dark]);

  const hasProcessedFiles = files.some((f) => f.status === "processed");

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || loading || !hasProcessedFiles) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setMessages((m) => [...m, { role: "assistant", content: "", isStreaming: true }]);
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/ask`, { question: q });
      const answer = data?.answer ?? "No response.";
      setMessages((m) => {
        const next = [...m];
        const idx = next.findIndex((x) => x.role === "assistant" && x.isStreaming);
        if (idx !== -1) {
          next[idx] = { role: "assistant", content: answer, isStreaming: false };
        }
        return next;
      });
    } catch (err) {
      const errMsg = err.response?.data?.detail ?? err.message ?? "Request failed.";
      setMessages((m) => {
        const next = [...m];
        const idx = next.findIndex((x) => x.role === "assistant" && x.isStreaming);
        if (idx !== -1) {
          next[idx] = {
            role: "assistant",
            content: `Error: ${errMsg}`,
            isStreaming: false,
          };
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        relative min-h-screen overflow-hidden transition-colors duration-700
        bg-gradient-to-br
          from-gray-50 via-purple-50/30 to-indigo-50/30
        dark:from-gray-950 dark:via-purple-950/30 dark:to-indigo-950/30
        text-gray-900 dark:text-gray-100
      "
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
      <div
        className="pointer-events-none absolute inset-0 transition duration-300 z-10"
        style={{
          background: `radial-gradient(800px at ${mouse.x}px ${mouse.y}px,
            rgba(168,85,247,0.15), transparent 50%)`,
        }}
      />

      <div className="relative z-20 flex min-h-screen">
        <Sidebar files={files} onFilesChange={fetchFiles} dark={dark} />

        <main className="flex-1 flex flex-col min-w-0">
          {/* Premium Header */}
          <header className="shrink-0 flex justify-between items-center px-8 py-5 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
                  AI Study Mentor
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">RAG-Powered Exam Preparation</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDark(!dark)}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {dark ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-indigo-600" />}
            </motion.button>
          </header>

          {/* Chat Area */}
          <div className="flex-1 overflow-auto px-8 py-6">
            <div className="max-w-4xl mx-auto">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  {!hasProcessedFiles ? (
                    <div className="max-w-md mx-auto">
                      <div className="p-4 rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 mb-6">
                        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400 mb-2">
                          <AlertCircle size={20} />
                          <span className="font-semibold">Upload Documents First</span>
                        </div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Please upload your syllabus and previous year papers in the sidebar to enable the AI mentor.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 mb-4 shadow-lg">
                        <MessageSquare size={32} className="text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ready to Help!</h2>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Ask me about important topics or expected exam questions.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                        {["What are the most important topics?", "Most expected questions?", "What should I study first?"].map((q, i) => (
                          <motion.button
                            key={i}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setInput(q)}
                            className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 text-sm text-left transition-all"
                          >
                            {q}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
              {messages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} isStreaming={msg.isStreaming} />
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Premium Input Area */}
          <div className="shrink-0 px-8 pb-6 pt-4 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={hasProcessedFiles ? "Ask about important topics, expected questions..." : "Upload documents first to enable chat"}
                  disabled={loading || !hasProcessedFiles}
                  className="
                    flex-1 px-5 py-4 rounded-2xl
                    bg-white dark:bg-gray-800
                    text-gray-900 dark:text-white
                    placeholder-gray-400 dark:placeholder-gray-500
                    border-2 border-gray-200 dark:border-gray-700
                    focus:outline-none focus:border-purple-500 dark:focus:border-purple-500
                    transition-all shadow-sm
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                />
                <motion.button
                  whileHover={hasProcessedFiles ? { scale: 1.03 } : {}}
                  whileTap={hasProcessedFiles ? { scale: 0.97 } : {}}
                  onClick={sendMessage}
                  disabled={loading || !input.trim() || !hasProcessedFiles}
                  className="
                    px-8 py-4 rounded-2xl
                    bg-gradient-to-r from-purple-600 to-indigo-600
                    text-white font-semibold
                    shadow-lg shadow-purple-500/40
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all
                  "
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : "Ask"}
                </motion.button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
