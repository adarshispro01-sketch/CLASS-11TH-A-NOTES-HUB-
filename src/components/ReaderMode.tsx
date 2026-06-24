import React, { useState, useEffect } from "react";
import { X, BookOpen, Sparkles, Brain, Award, ArrowLeft, ArrowRight, BookMarked, Download, FileText, Check, AlertTriangle, RefreshCw } from "lucide-react";
import { StudyNote, QuizQuestion, Flashcard } from "../types";

interface ReaderModeProps {
  note: StudyNote;
  onClose: () => void;
}

// Simple, React 19-safe regex markdown parser to render high-impact study notes nicely
function parseMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  const lines = text.split("\n");
  
  let inList = false;
  
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith("### ")) {
      return (
        <h4 key={idx} className="text-sm font-bold text-slate-900 mt-4 mb-1.5 font-serif">
          {parseInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={idx} className="text-base font-extrabold text-amber-900 mt-5 mb-2.5 font-serif border-b border-amber-900/10 pb-1 flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-amber-800 shrink-0" />
          <span>{parseInlineMarkdown(trimmed.slice(3))}</span>
        </h3>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h2 key={idx} className="text-lg font-black text-slate-900 mt-6 mb-3 font-serif">
          {parseInlineMarkdown(trimmed.slice(2))}
        </h2>
      );
    }
    
    // Lists formatting
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return (
        <div key={idx} className="flex items-start gap-2 ml-4 mb-2 text-xs text-slate-700 leading-relaxed">
          <span className="text-amber-800 shrink-0 mt-1.5">•</span>
          <span className="flex-1">{parseInlineMarkdown(trimmed.slice(2))}</span>
        </div>
      );
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)/);
      if (match) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-4 mb-2 text-xs text-slate-700 leading-relaxed">
            <span className="text-amber-900 font-mono font-bold shrink-0">{match[1]}.</span>
            <span className="flex-1">{parseInlineMarkdown(match[2])}</span>
          </div>
        );
      }
    }

    if (trimmed === "") {
      return <div key={idx} className="h-3" />;
    }

    // Default Paragraph rendering
    return (
      <p key={idx} className="text-xs text-slate-700 leading-relaxed mb-3">
        {parseInlineMarkdown(line)}
      </p>
    );
  });
}

function parseInlineMarkdown(text: string): React.ReactNode {
  // Bold matching with regex
  const parts = text.split(/(\*\*.*?\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-slate-950 bg-amber-500/5 px-0.5 rounded">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function ReaderMode({ note, onClose }: ReaderModeProps) {
  // Tabs: "read" (note content), "summary" (AI summary), "quiz" (AI MCQ test), "flashcards" (Revision cards)
  const [activeTab, setActiveTab] = useState<"read" | "summary" | "quiz" | "flashcards">("read");
  
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

  // Reset tab and states when note changes
  useEffect(() => {
    setActiveTab("read");
    setSummary(null);
    setQuizQuestions([]);
    setFlashcards([]);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setCurrentFlashIdx(0);
    setIsFlipped(false);
    setApiError(null);
  }, [note]);

  // AI Feature: Summarize Note
  const fetchSummary = async () => {
    if (summary) return; // cache locally
    setSummaryLoading(true);
    setApiError(null);
    try {
      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: note.content,
          title: note.title,
          subject: note.subject,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch summary.");
      setSummary(data.summary);
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
    setQuizSubmitted(false);
    setSelectedAnswers({});
    try {
      const response = await fetch("/api/gemini/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: note.content,
          title: note.title,
          subject: note.subject,
          mode: "quiz",
        }),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Failed to compile revision quiz.");
      setQuizQuestions(resData.data);
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
    setCurrentFlashIdx(0);
    setIsFlipped(false);
    try {
      const response = await fetch("/api/gemini/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: note.content,
          title: note.title,
          subject: note.subject,
          mode: "flashcards",
        }),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Failed to load flashcards.");
      setFlashcards(resData.data);
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

  const score = quizQuestions.reduce((acc, q, idx) => {
    return selectedAnswers[idx] === q.correctIndex ? acc + 1 : acc;
  }, 0);

  return (
    <div id="notes-reader-panel" className="bg-white rounded-2xl border border-amber-900/10 shadow-md flex flex-col h-[650px] overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-xs font-mono text-slate-300 uppercase tracking-widest font-semibold">
              {note.subject} Board Note
            </h2>
            <h1 className="text-sm font-bold font-serif text-white truncate max-w-[280px] sm:max-w-[450px]">
              {note.title}
            </h1>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1 shrink-0 overflow-x-auto select-none scrollbar-none">
        <button
          onClick={() => handleTabChange("read")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "read"
              ? "bg-amber-900/10 text-amber-900 font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Reader View
        </button>
        <button
          onClick={() => handleTabChange("summary")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
            activeTab === "summary"
              ? "bg-amber-900/10 text-amber-900 font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-800" />
          <span>AI Summary</span>
        </button>
        <button
          onClick={() => handleTabChange("quiz")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
            activeTab === "quiz"
              ? "bg-amber-900/10 text-amber-900 font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-indigo-700" />
          <span>Interactive Quiz</span>
        </button>
        <button
          onClick={() => handleTabChange("flashcards")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
            activeTab === "flashcards"
              ? "bg-amber-900/10 text-amber-900 font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Award className="w-3.5 h-3.5 text-emerald-600" />
          <span>Flashcards</span>
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-y-auto p-6 bg-amber-50/10">
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

        {/* READER VIEW */}
        {activeTab === "read" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-amber-900/5 pb-4">
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <div>Published by: <span className="font-semibold text-slate-800">{note.author}</span></div>
                <div className="font-mono">Date: {note.date}</div>
              </div>

              {note.fileAttached && note.fileDataUrl && (
                <button
                  onClick={handleDownloadAttachment}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-900/5 hover:bg-amber-900/10 px-3 py-2 rounded-xl border border-amber-900/10 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Doc ({note.fileName})</span>
                </button>
              )}
            </div>

            {/* Note text rendered like a clean textbook chapter */}
            <div className="prose prose-slate max-w-none text-slate-800 font-sans text-xs">
              {parseMarkdown(note.content)}
            </div>
          </div>
        )}

        {/* AI SUMMARY VIEW */}
        {activeTab === "summary" && (
          <div className="max-w-2xl mx-auto">
            {summaryLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Sparkles className="w-8 h-8 animate-spin mb-2 text-amber-800" />
                <span className="text-xs font-medium">Gemini 3.5 is reading and compiling your notes...</span>
              </div>
            ) : summary ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-950 shadow-sm shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-800 shrink-0" />
                  <span>AI Study Guide compiled from notes using **Gemini-3.5-Flash**</span>
                </div>
                <div className="prose prose-amber max-w-none text-slate-800 font-sans text-xs">
                  {parseMarkdown(summary)}
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
                <Brain className="w-8 h-8 animate-spin mb-2 text-indigo-700" />
                <span className="text-xs font-medium">Gemini is synthesizing high-yield test questions...</span>
              </div>
            ) : quizQuestions.length > 0 ? (
              <div className="space-y-6">
                <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-950 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-800 shrink-0" />
                    <span>Interactive Test: Assess your retention</span>
                  </div>
                  {quizSubmitted && (
                    <div className="font-bold text-indigo-900 bg-indigo-100 px-2.5 py-1 rounded-lg">
                      Score: {score} / {quizQuestions.length}
                    </div>
                  )}
                </div>

                {quizQuestions.map((q, qIdx) => {
                  const isAnswered = selectedAnswers[qIdx] !== undefined;
                  const correctIdx = q.correctIndex;

                  return (
                    <div key={qIdx} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                      <div className="font-serif font-bold text-sm text-slate-900">
                        {qIdx + 1}. {q.question}
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {q.choices.map((choice, cIdx) => {
                          const isSelected = selectedAnswers[qIdx] === cIdx;
                          let btnClass = "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100";

                          if (quizSubmitted) {
                            if (cIdx === correctIdx) {
                              btnClass = "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold";
                            } else if (isSelected) {
                              btnClass = "border-rose-300 bg-rose-50 text-rose-950";
                            } else {
                              btnClass = "border-slate-100 bg-slate-50/50 text-slate-400 pointer-events-none";
                            }
                          } else if (isSelected) {
                            btnClass = "border-indigo-600 bg-indigo-50 text-indigo-950 font-bold shadow-sm";
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
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">
                          <span className="font-bold text-slate-800 block mb-0.5">Explanation:</span>
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
                      className="flex items-center gap-1 px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-200"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Re-Generate Quiz</span>
                    </button>
                  ) : (
                    <button
                      disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
                      onClick={() => setQuizSubmitted(true)}
                      className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-sm"
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
                <Award className="w-8 h-8 animate-spin mb-2 text-emerald-600" />
                <span className="text-xs font-medium">Gemini is writing active-recall cards...</span>
              </div>
            ) : flashcards.length > 0 ? (
              <div className="space-y-6 flex flex-col items-center">
                <div className="text-xs text-slate-500 font-sans text-center">
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
                    <div className="absolute inset-0 w-full h-full p-6 bg-white border border-amber-900/10 rounded-2xl shadow-md flex flex-col items-center justify-center backface-hidden text-center bg-gradient-to-br from-white to-amber-50/20">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-amber-800 font-mono mb-3">
                        Term / Formula
                      </div>
                      <div className="font-serif font-black text-base text-slate-900 px-4 leading-snug">
                        {flashcards[currentFlashIdx].front}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-6 group-hover:text-amber-800 transition-colors">
                        Click to flip / Reveal Explanation
                      </div>
                    </div>

                    {/* Back side of the card */}
                    <div className="absolute inset-0 w-full h-full p-6 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-md flex flex-col items-center justify-center backface-hidden text-center rotate-y-180">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 font-mono mb-2">
                        Definition / Core Answer
                      </div>
                      <div className="font-sans text-xs text-slate-800 font-medium px-2 leading-relaxed max-h-36 overflow-y-auto">
                        {flashcards[currentFlashIdx].back}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-medium mt-4">
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
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-opacity"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-mono font-bold text-slate-600">
                    {currentFlashIdx + 1} / {flashcards.length}
                  </span>

                  <button
                    disabled={currentFlashIdx === flashcards.length - 1}
                    onClick={() => {
                      setCurrentFlashIdx(currentFlashIdx + 1);
                      setIsFlipped(false);
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-opacity"
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
      </div>
    </div>
  );
}
