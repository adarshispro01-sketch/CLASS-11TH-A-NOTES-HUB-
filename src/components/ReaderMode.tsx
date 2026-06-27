import React, { useState, useEffect } from "react";
import { X, BookOpen, Sparkles, Brain, Award, ArrowLeft, ArrowRight, BookMarked, Download, FileText, Check, AlertTriangle, RefreshCw, Eye, ExternalLink, ZoomIn, ZoomOut, Maximize2, Copy } from "lucide-react";
import { StudyNote, QuizQuestion, Flashcard } from "../types";

interface ReaderModeProps {
  note: StudyNote;
  onClose: () => void;
  initialTab?: "read" | "summary" | "quiz" | "flashcards" | "attachment";
  theme: "dark" | "light";
}

// Simple, React 19-safe regex markdown parser to render high-impact study notes nicely
function parseMarkdown(text: string, theme: "dark" | "light"): React.ReactNode[] {
  if (!text) return [];
  const lines = text.split("\n");
  
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith("### ")) {
      return (
        <h4 key={idx} className={`text-sm font-bold mt-4 mb-1.5 font-serif ${
          theme === "dark" ? "text-slate-100" : "text-slate-900"
        }`}>
          {parseInlineMarkdown(trimmed.slice(4), theme)}
        </h4>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={idx} className={`text-base font-extrabold mt-5 mb-2.5 font-serif border-b pb-1 flex items-center gap-2 ${
          theme === "dark" ? "text-amber-400 border-slate-800" : "text-amber-900 border-amber-900/10"
        }`}>
          <BookMarked className={`w-4 h-4 shrink-0 ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`} />
          <span>{parseInlineMarkdown(trimmed.slice(3), theme)}</span>
        </h3>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h2 key={idx} className={`text-lg font-black mt-6 mb-3 font-serif ${
          theme === "dark" ? "text-slate-50" : "text-slate-900"
        }`}>
          {parseInlineMarkdown(trimmed.slice(2), theme)}
        </h2>
      );
    }
    
    // Lists formatting
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return (
        <div key={idx} className={`flex items-start gap-2 ml-4 mb-2 text-xs leading-relaxed ${
          theme === "dark" ? "text-slate-300" : "text-slate-700"
        }`}>
          <span className={`shrink-0 mt-1.5 ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`}>•</span>
          <span className="flex-1">{parseInlineMarkdown(trimmed.slice(2), theme)}</span>
        </div>
      );
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)/);
      if (match) {
        return (
          <div key={idx} className={`flex items-start gap-2 ml-4 mb-2 text-xs leading-relaxed ${
            theme === "dark" ? "text-slate-300" : "text-slate-700"
          }`}>
            <span className={`font-mono font-bold shrink-0 ${
              theme === "dark" ? "text-amber-400" : "text-amber-900"
            }`}>{match[1]}.</span>
            <span className="flex-1">{parseInlineMarkdown(match[2], theme)}</span>
          </div>
        );
      }
    }

    if (trimmed === "") {
      return <div key={idx} className="h-3" />;
    }

    // Default Paragraph rendering
    return (
      <p key={idx} className={`text-xs leading-relaxed mb-3 ${
        theme === "dark" ? "text-slate-300" : "text-slate-700"
      }`}>
        {parseInlineMarkdown(line, theme)}
      </p>
    );
  });
}

function parseInlineMarkdown(text: string, theme: "dark" | "light"): React.ReactNode {
  // Bold matching with regex
  const parts = text.split(/(\*\*.*?\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className={`font-bold px-0.5 rounded ${
          theme === "dark" ? "text-slate-100 bg-amber-500/10" : "text-slate-950 bg-amber-500/5"
        }`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function ReaderMode({ note, onClose, initialTab, theme }: ReaderModeProps) {
  // Tabs: "read" (note content), "summary" (AI summary), "quiz" (AI MCQ test), "flashcards" (Revision cards), "attachment" (Inline file viewer)
  const [activeTab, setActiveTab] = useState<"read" | "summary" | "quiz" | "flashcards" | "attachment">(initialTab || "read");
  
  // Gemini Data state
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [currentFlashIdx, setCurrentFlashIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [apiError, setApiError] = useState<string | null>(null);
  const [apiWarning, setApiWarning] = useState<string | null>(null);

  // Document Viewer states
  const [imgZoom, setImgZoom] = useState(100);
  const [copiedText, setCopiedText] = useState(false);

  // Reset tab and states when note changes
  useEffect(() => {
    setActiveTab(initialTab || "read");
    setSummary(null);
    setQuizQuestions([]);
    setFlashcards([]);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setCurrentFlashIdx(0);
    setIsFlipped(false);
    setApiError(null);
    setApiWarning(null);
    setImgZoom(100);
    setCopiedText(false);
  }, [note, initialTab]);

  // AI Feature: Summarize Note
  const fetchSummary = async () => {
    if (summary) return; // cache locally
    setSummaryLoading(true);
    setApiError(null);
    setApiWarning(null);
    try {
      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: note.id,
          content: note.content,
          title: note.title,
          subject: note.subject,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch summary.");
      setSummary(data.summary);
      if (data.warning) setApiWarning(data.warning);
    } catch (err: any) {
      setApiError(err.message || "An error occurred compiling the AI summary.");
    } finally {
      setSummaryLoading(false);
    }
  };

  // AI Feature: Generate Interactive MCQ Quiz
  const fetchQuiz = async () => {
    if (quizQuestions.length > 0) return;
    setQuizLoading(true);
    setApiError(null);
    setApiWarning(null);
    setQuizSubmitted(false);
    setSelectedAnswers({});
    try {
      const response = await fetch("/api/gemini/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: note.id,
          content: note.content,
          title: note.title,
          subject: note.subject,
          mode: "quiz",
        }),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Failed to compile revision quiz.");
      setQuizQuestions(resData.data);
      if (resData.warning) setApiWarning(resData.warning);
    } catch (err: any) {
      setApiError(err.message || "An error occurred with Gemini Quiz builder.");
    } finally {
      setQuizLoading(false);
    }
  };

  // AI Feature: Generate Revision Flashcards
  const fetchFlashcards = async () => {
    if (flashcards.length > 0) return;
    setFlashcardsLoading(true);
    setApiError(null);
    setApiWarning(null);
    setCurrentFlashIdx(0);
    setIsFlipped(false);
    try {
      const response = await fetch("/api/gemini/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: note.id,
          content: note.content,
          title: note.title,
          subject: note.subject,
          mode: "flashcards",
        }),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Failed to load flashcards.");
      setFlashcards(resData.data);
      if (resData.warning) setApiWarning(resData.warning);
    } catch (err: any) {
      setApiError(err.message || "An error occurred loading revision flashcards.");
    } finally {
      setFlashcardsLoading(false);
    }
  };

  // Handle Tab Switch
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === "summary") fetchSummary();
    if (tab === "quiz") fetchQuiz();
    if (tab === "flashcards") fetchFlashcards();
  };

  // File Download for Attached Files
  const handleDownloadAttachment = () => {
    if (!note.fileDataUrl || !note.fileName) return;
    const link = document.createElement("a");
    link.href = note.fileDataUrl;
    link.download = note.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open attachment directly in a new browser tab using safe Blob URLs
  const handleOpenInNewTab = () => {
    if (!note.fileDataUrl) return;
    try {
      const parts = note.fileDataUrl.split(",");
      const byteString = atob(parts[1]);
      const mimeString = parts[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (err) {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`
          <html>
            <head>
              <title>${note.fileName || 'View Document'}</title>
              <style>body { margin: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }</style>
            </head>
            <body>
              <embed src="${note.fileDataUrl}" width="100%" height="100%" type="${note.fileDataUrl.split(';')[0].split(':')[1]}" />
            </body>
          </html>
        `);
        newTab.document.close();
      }
    }
  };

  const score = quizQuestions.reduce((acc, q, idx) => {
    return selectedAnswers[idx] === q.correctIndex ? acc + 1 : acc;
  }, 0);

  return (
    <div id="notes-reader-panel" className={`rounded-2xl border shadow-md flex flex-col h-[650px] overflow-hidden transition-all duration-350 ${
      theme === "dark"
        ? "bg-slate-900 border-slate-800 text-white"
        : "bg-white border-amber-900/10 text-slate-900"
    }`}>
      {/* Header bar */}
      <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between shrink-0 border-b border-slate-850">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
              {note.subject} Board Note
            </h2>
            <h1 className="text-sm font-bold font-serif text-white truncate max-w-[280px] sm:max-w-[450px]">
              {note.title}
            </h1>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs navigation */}
      <div className={`px-5 py-2 border-b flex items-center gap-1 shrink-0 overflow-x-auto select-none scrollbar-none transition-colors ${
        theme === "dark" ? "bg-slate-950 border-slate-850" : "bg-slate-50 border-slate-100"
      }`}>
        <button
          onClick={() => handleTabChange("read")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "read"
              ? theme === "dark" ? "bg-amber-500/15 text-amber-400 font-bold" : "bg-amber-900/10 text-amber-900 font-bold"
              : theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Reader View
        </button>
        <button
          onClick={() => handleTabChange("summary")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
            activeTab === "summary"
              ? theme === "dark" ? "bg-amber-500/15 text-amber-400 font-bold" : "bg-amber-900/10 text-amber-900 font-bold"
              : theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`} />
          <span>AI Summary</span>
        </button>
        <button
          onClick={() => handleTabChange("quiz")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
            activeTab === "quiz"
              ? theme === "dark" ? "bg-amber-500/15 text-amber-400 font-bold" : "bg-amber-900/10 text-amber-900 font-bold"
              : theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Brain className={`w-3.5 h-3.5 ${theme === "dark" ? "text-indigo-400" : "text-indigo-700"}`} />
          <span>Interactive Quiz</span>
        </button>
        <button
          onClick={() => handleTabChange("flashcards")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
            activeTab === "flashcards"
              ? theme === "dark" ? "bg-amber-500/15 text-amber-400 font-bold" : "bg-amber-900/10 text-amber-900 font-bold"
              : theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Award className={`w-3.5 h-3.5 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`} />
          <span>Flashcards</span>
        </button>
        {note.fileAttached && (
          <button
            onClick={() => handleTabChange("attachment")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeTab === "attachment"
                ? theme === "dark" ? "bg-amber-500/15 text-amber-400 font-bold" : "bg-amber-900/10 text-amber-900 font-bold"
                : theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eye className={`w-3.5 h-3.5 ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`} />
            <span>Document Reader</span>
          </button>
        )}
      </div>

      {/* Main Content Pane */}
      <div className={`flex-1 overflow-y-auto p-6 transition-colors duration-350 ${
        theme === "dark" ? "bg-slate-900/40 text-slate-100" : "bg-amber-50/10 text-slate-850"
      }`}>
        {/* Error Notification */}
        {apiError && (
          <div className="mb-5 p-4 bg-orange-50 border border-orange-200 text-amber-900 text-xs rounded-xl flex items-start gap-2.5 shadow-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 text-orange-600 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">AI Service Unavailable</p>
              <p className="text-slate-600 leading-relaxed">{apiError}</p>
            </div>
          </div>
        )}

        {/* Warning/Fallback Notification */}
        {apiWarning && !apiError && (
          <div className="mb-5 p-4 bg-sky-50 border border-sky-100 text-slate-900 text-xs rounded-xl flex items-start gap-2.5 shadow-sm animate-fade-in">
            <Sparkles className="w-4 h-4 shrink-0 text-sky-600 mt-0.5 animate-pulse" />
            <div>
              <p className="font-semibold mb-0.5 text-slate-800">Smart Study Assistant Active</p>
              <p className="text-slate-600 leading-relaxed">{apiWarning}</p>
            </div>
          </div>
        )}

        {/* READER VIEW */}
        {activeTab === "read" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className={`flex items-center justify-between border-b pb-4 ${
              theme === "dark" ? "border-slate-800" : "border-amber-900/5"
            }`}>
              <div className={`text-[10px] space-y-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                <div>Published by: <span className={`font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{note.author}</span></div>
                <div className="font-mono">Date: {note.date}</div>
              </div>

              {note.fileAttached && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTabChange("attachment")}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors shadow-sm ${
                      theme === "dark"
                        ? "text-indigo-300 bg-indigo-950/40 border-indigo-900/50 hover:bg-indigo-950"
                        : "text-indigo-900 bg-indigo-50 border-indigo-100/50 hover:bg-indigo-100"
                    }`}
                  >
                    <Eye className={`w-3.5 h-3.5 ${theme === "dark" ? "text-indigo-400" : "text-indigo-700"}`} />
                    <span>View File Inline</span>
                  </button>
                  <button
                    onClick={handleDownloadAttachment}
                    disabled={!note.fileDataUrl}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
                      !note.fileDataUrl
                        ? "opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                        : theme === "dark"
                        ? "text-amber-400 bg-amber-950/40 border-amber-950/60 hover:bg-amber-950"
                        : "text-amber-900 bg-amber-950/5 border-amber-950/10 hover:bg-amber-950/10"
                    }`}
                    title={!note.fileDataUrl ? "Loading file data..." : `Download ${note.fileName}`}
                  >
                    {!note.fileDataUrl ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{!note.fileDataUrl ? "Loading..." : "Download"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Note text rendered like a clean textbook chapter */}
            <div className={`prose max-w-none font-sans text-xs ${
              theme === "dark" ? "prose-invert text-slate-300" : "prose-slate text-slate-800"
            }`}>
              {parseMarkdown(note.content, theme)}
            </div>
          </div>
        )}

        {/* AI SUMMARY VIEW */}
        {activeTab === "summary" && (
          <div className="max-w-2xl mx-auto">
            {summaryLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Sparkles className={`w-8 h-8 animate-spin mb-2 ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`} />
                <span className="text-xs font-medium">Gemini 3.5 is reading and compiling your notes...</span>
              </div>
            ) : summary ? (
              <div className="space-y-4">
                <div className={`p-3 border rounded-xl flex items-center gap-2 text-xs shadow-sm shrink-0 ${
                  theme === "dark" ? "bg-slate-950 border-slate-800 text-amber-300" : "bg-amber-50 border border-amber-200 text-amber-950"
                }`}>
                  <Sparkles className={`w-4 h-4 shrink-0 ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`} />
                  <span>AI Study Guide compiled from notes using **Gemini-3.5-Flash**</span>
                </div>
                <div className={`prose max-w-none font-sans text-xs ${
                  theme === "dark" ? "prose-invert text-slate-300" : "prose-amber text-slate-800"
                }`}>
                  {parseMarkdown(summary, theme)}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 text-xs">
                AI Summary failed to load. Try clicking the tab again to fetch.
              </div>
            )}
          </div>
        )}

        {/* AI MCQ QUIZ */}
        {activeTab === "quiz" && (
          <div className="max-w-2xl mx-auto space-y-6">
            {quizLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Brain className={`w-8 h-8 animate-spin mb-2 ${theme === "dark" ? "text-indigo-400" : "text-indigo-750"}`} />
                <span className="text-xs font-medium">Gemini is synthesizing high-yield test questions...</span>
              </div>
            ) : quizQuestions.length > 0 ? (
              <div className="space-y-6">
                <div className={`p-3.5 border rounded-xl flex items-center justify-between text-xs shadow-sm ${
                  theme === "dark" ? "bg-indigo-950/20 border-indigo-900/50 text-indigo-200" : "bg-indigo-50 border border-indigo-100 text-indigo-950"
                }`}>
                  <div className="flex items-center gap-2">
                    <Brain className={`w-4 h-4 shrink-0 ${theme === "dark" ? "text-indigo-400" : "text-indigo-800"}`} />
                    <span>Interactive Test: Assess your retention</span>
                  </div>
                  {quizSubmitted && (
                    <div className={`font-bold px-2.5 py-1 rounded-lg ${
                      theme === "dark" ? "text-indigo-350 bg-indigo-900/40" : "text-indigo-900 bg-indigo-100"
                    }`}>
                      Score: {score} / {quizQuestions.length}
                    </div>
                  )}
                </div>

                {quizQuestions.map((q, qIdx) => {
                  const isAnswered = selectedAnswers[qIdx] !== undefined;
                  const correctIdx = q.correctIndex;

                  return (
                    <div key={qIdx} className={`p-4 border rounded-2xl shadow-sm space-y-3 ${
                      theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
                    }`}>
                      <div className={`font-serif font-bold text-sm ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                        {qIdx + 1}. {q.question}
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {q.choices.map((choice, cIdx) => {
                          const isSelected = selectedAnswers[qIdx] === cIdx;
                          let btnClass = theme === "dark"
                            ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
                            : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100";

                          if (quizSubmitted) {
                            if (cIdx === correctIdx) {
                              btnClass = theme === "dark"
                                ? "border-emerald-600 bg-emerald-950/40 text-emerald-300 font-semibold"
                                : "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold";
                            } else if (isSelected) {
                              btnClass = theme === "dark"
                                ? "border-rose-800 bg-rose-950/40 text-rose-300"
                                : "border-rose-300 bg-rose-50 text-rose-950";
                            } else {
                              btnClass = theme === "dark"
                                ? "border-slate-900 bg-slate-950/20 text-slate-600 pointer-events-none"
                                : "border-slate-100 bg-slate-50/50 text-slate-400 pointer-events-none";
                            }
                          } else if (isSelected) {
                            btnClass = theme === "dark"
                              ? "border-indigo-500 bg-indigo-950/60 text-indigo-200 font-bold shadow-sm"
                              : "border-indigo-600 bg-indigo-50 text-indigo-950 font-bold shadow-sm";
                          }

                          return (
                            <button
                              key={cIdx}
                              disabled={quizSubmitted}
                              onClick={() => setSelectedAnswers({ ...selectedAnswers, [qIdx]: cIdx })}
                              className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${btnClass}`}
                            >
                              <span>{choice}</span>
                              {quizSubmitted && cIdx === correctIdx && (
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && isAnswered && (
                        <div className={`p-3 border rounded-xl text-[11px] leading-relaxed whitespace-pre-line ${
                          theme === "dark" ? "bg-slate-900/65 border-slate-800 text-slate-300" : "bg-slate-50 border border-slate-100 text-slate-600"
                        }`}>
                          <span className={`font-bold block mb-0.5 ${theme === "dark" ? "text-slate-150" : "text-slate-800"}`}>Explanation:</span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex gap-3 justify-end pt-4 shrink-0">
                  {quizSubmitted ? (
                    <button
                      onClick={fetchQuiz}
                      className={`flex items-center gap-1 px-4 py-2 font-semibold rounded-xl text-xs transition-colors ${
                        theme === "dark" ? "bg-slate-850 hover:bg-slate-800 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Re-Generate Quiz</span>
                    </button>
                  ) : (
                    <button
                      disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
                      onClick={() => setQuizSubmitted(true)}
                      className={`px-5 py-2.5 font-bold rounded-xl text-xs shadow-sm transition-colors ${
                        theme === "dark" ? "bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-850" : "bg-indigo-700 hover:bg-indigo-800 text-white disabled:bg-slate-300"
                      }`}
                    >
                      Grade Quiz Answers
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 text-xs">
                Unable to synthesize quiz. Click the tab again to generate.
              </div>
            )}
          </div>
        )}

        {/* REVISION FLASHCARDS */}
        {activeTab === "flashcards" && (
          <div className="max-w-md mx-auto py-6">
            {flashcardsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Award className={`w-8 h-8 animate-spin mb-2 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`} />
                <span className="text-xs font-medium">Gemini is writing active-recall cards...</span>
              </div>
            ) : flashcards.length > 0 ? (
              <div className="space-y-6 flex flex-col items-center">
                <div className={`text-xs font-sans text-center ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  Click the flashcard to flip and test your recollection!
                </div>

                {/* Tactile 3D-Flipping card */}
                <div
                   onClick={() => setIsFlipped(!isFlipped)}
                   className="w-full h-56 cursor-pointer select-none perspective-1000 group"
                >
                  <div
                    className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                      isFlipped ? "rotate-y-180" : ""
                    }`}
                  >
                    {/* Front side of the card */}
                    <div className={`absolute inset-0 w-full h-full p-6 border rounded-2xl shadow-md flex flex-col items-center justify-center backface-hidden text-center bg-gradient-to-br ${
                      theme === "dark" ? "bg-slate-950 border-slate-800 from-slate-950 to-slate-900" : "bg-white border-amber-900/10 from-white to-amber-50/20"
                    }`}>
                      <div className={`text-[10px] uppercase font-bold tracking-widest font-mono mb-3 ${
                        theme === "dark" ? "text-amber-400" : "text-amber-800"
                      }`}>
                        Term / Formula
                      </div>
                      <div className={`font-serif font-black text-base px-4 leading-snug ${
                        theme === "dark" ? "text-slate-100" : "text-slate-900"
                      }`}>
                        {flashcards[currentFlashIdx].front}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-6 group-hover:text-amber-800 transition-colors">
                        Click to flip / Reveal Explanation
                      </div>
                    </div>

                    {/* Back side of the card */}
                    <div className={`absolute inset-0 w-full h-full p-6 border rounded-2xl shadow-md flex flex-col items-center justify-center backface-hidden text-center rotate-y-180 ${
                      theme === "dark" ? "bg-emerald-950/40 border-emerald-900/60" : "bg-emerald-50 border border-emerald-200"
                    }`}>
                      <div className={`text-[10px] uppercase font-bold tracking-widest font-mono mb-2 ${
                        theme === "dark" ? "text-emerald-400" : "text-emerald-800"
                      }`}>
                        Definition / Core Answer
                      </div>
                      <div className={`font-sans text-xs font-medium px-2 leading-relaxed max-h-36 overflow-y-auto ${
                        theme === "dark" ? "text-slate-200" : "text-slate-800"
                      }`}>
                        {flashcards[currentFlashIdx].back}
                      </div>
                      <div className={`text-[10px] font-medium mt-4 ${
                        theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                      }`}>
                        Click to Flip Back
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card navigation selectors */}
                <div className="flex items-center gap-5 pt-2">
                  <button
                    disabled={currentFlashIdx === 0}
                    onClick={() => {
                      setCurrentFlashIdx(currentFlashIdx - 1);
                      setIsFlipped(false);
                    }}
                    className={`p-2 rounded-xl disabled:opacity-40 transition-colors ${
                      theme === "dark" ? "bg-slate-800 hover:bg-slate-700 text-slate-100" : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <span className={`text-xs font-mono font-bold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    {currentFlashIdx + 1} / {flashcards.length}
                  </span>

                  <button
                    disabled={currentFlashIdx === flashcards.length - 1}
                    onClick={() => {
                      setCurrentFlashIdx(currentFlashIdx + 1);
                      setIsFlipped(false);
                    }}
                    className={`p-2 rounded-xl disabled:opacity-40 transition-colors ${
                      theme === "dark" ? "bg-slate-800 hover:bg-slate-700 text-slate-100" : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                    }`}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 text-xs">
                No flashcards synthesized. Try switching back and forth.
              </div>
            )}
          </div>
        )}

        {/* ATTACHMENT VIEW */}
        {activeTab === "attachment" && note.fileAttached && !note.fileDataUrl && (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-400">Retrieving attached document from notes club cloud...</p>
          </div>
        )}

        {activeTab === "attachment" && note.fileAttached && note.fileDataUrl && (
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Control bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/60 p-3 rounded-xl shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs" title={note.fileName}>
                    {note.fileName || "attachment-file"}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Type: {note.fileName?.split(".").pop()?.toUpperCase() || "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleDownloadAttachment}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-sm"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-sm"
                  title="Open in new browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>New Tab</span>
                </button>
              </div>
            </div>

            {/* Renderer content */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm min-h-[400px] flex flex-col justify-between">
              {(() => {
                const ext = note.fileName?.split(".").pop()?.toLowerCase() || "";
                
                // 1. PDF
                if (ext === "pdf" || note.fileDataUrl.startsWith("data:application/pdf")) {
                  return (
                    <div className="space-y-3 flex-1 flex flex-col">
                      <div className="relative rounded-xl overflow-hidden border border-slate-200/80 shadow-inner flex-1 bg-slate-100">
                        <iframe
                          src={note.fileDataUrl}
                          className="w-full h-[400px] rounded-xl bg-white"
                          title={note.fileName}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans italic text-center">
                        Tip: If the PDF doesn't display or is blocked in the workspace preview frame, click the "New Tab" button above to view it.
                      </p>
                    </div>
                  );
                }

                // 2. Images (PNG, JPG, JPEG, GIF, WEBP)
                if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext) || note.fileDataUrl.startsWith("data:image/")) {
                  return (
                    <div className="space-y-4 flex-1 flex flex-col items-center">
                      <div className="w-full flex-1 min-h-[340px] bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center p-4 relative overflow-hidden">
                        <div 
                          className="absolute inset-0 opacity-5 pointer-events-none" 
                          style={{
                            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, #000000 1px)",
                            backgroundSize: "20px 20px",
                            backgroundPosition: "0 0, 10px 10px"
                          }}
                        />
                        <img
                          src={note.fileDataUrl}
                          style={{ transform: `scale(${imgZoom / 100})`, transition: "transform 0.15s ease-out" }}
                          className="max-w-full max-h-[340px] object-contain rounded-lg shadow-xl relative z-10 origin-center"
                          alt={note.fileName}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      {/* Zoom Controls */}
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 px-4 py-1.5 rounded-full shadow-sm">
                        <button
                          type="button"
                          onClick={() => setImgZoom(Math.max(25, imgZoom - 25))}
                          className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] font-mono font-bold text-slate-600 min-w-[40px] text-center">
                          {imgZoom}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setImgZoom(Math.min(300, imgZoom + 25))}
                          className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <div className="w-[1px] h-3 bg-slate-200" />
                        <button
                          type="button"
                          onClick={() => setImgZoom(100)}
                          className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                          title="Reset Zoom"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                // 3. Text Files (TXT)
                if (ext === "txt" || note.fileDataUrl.startsWith("data:text/plain")) {
                  let textValue = "";
                  try {
                    const parts = note.fileDataUrl.split(",");
                    if (parts[1]) {
                      textValue = decodeURIComponent(atob(parts[1]).split("").map(function(c) {
                          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                      }).join(""));
                    }
                  } catch (e) {
                    try {
                      textValue = atob(note.fileDataUrl.split(",")[1]);
                    } catch (e2) {
                      textValue = "Failed to parse text content.";
                    }
                  }

                  return (
                    <div className="space-y-3 flex-1 flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-mono">
                          Lines: {textValue.split("\n").length} • Words: {textValue.split(/\s+/).filter(Boolean).length}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(textValue);
                            setCopiedText(true);
                            setTimeout(() => setCopiedText(false), 2000);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md border border-slate-200 transition-all shadow-sm"
                        >
                          {copiedText ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Content</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-auto max-h-[360px]">
                        <pre className="text-[11px] text-slate-100 font-mono whitespace-pre-wrap leading-relaxed text-left">
                          {textValue || <span className="text-slate-500 italic">Empty text file.</span>}
                        </pre>
                      </div>
                    </div>
                  );
                }

                // 4. Binary Documents (DOCX / DOC / etc.)
                return (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                    <div className="w-16 h-16 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm mb-4 animate-bounce">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h4 className="font-serif font-bold text-sm text-slate-800">Rich Word Document Attached</h4>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      "{note.fileName}" is a Microsoft Word format. To open and edit this file with standard layouts directly on your machine, we recommend downloading:
                    </p>
                    <div className="flex items-center gap-3 mt-5 w-full">
                      <button
                        type="button"
                        onClick={handleDownloadAttachment}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Word Doc</span>
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-4 leading-normal">
                      Office files require native application integrations. Rest assured, downloading is safe and retains original layouts.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
