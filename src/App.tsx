import React, { useState, useEffect } from "react";
import { BookOpen, Search, Calendar, User, FileText, Trash2, HelpCircle, Smile, Clock, Sparkles, BookMarked, GraduationCap, ChevronRight, AlertCircle, Loader, ArrowLeft } from "lucide-react";
import SubjectBinders from "./components/SubjectBinders";
import PomodoroTimer from "./components/PomodoroTimer";
import NoticeBoard from "./components/NoticeBoard";
import ReaderMode from "./components/ReaderMode";
import UploadForm from "./components/UploadForm";
import { StudyNote, Announcement } from "./types";

const MOTIVATIONAL_QUOTES = [
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" }
];

export default function App() {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Dynamic Settings & Simulated User Role States
  const [pt1Date, setPt1Date] = useState("2026-07-20");
  const [pt2Date, setPt2Date] = useState("2026-09-15");
  const [pt3Date, setPt3Date] = useState("2026-12-10");
  const [boardExamDate, setBoardExamDate] = useState("2027-03-01");
  const [selectedDeadlineTest, setSelectedDeadlineTest] = useState<"PT1" | "PT2" | "PT3" | "Boards">("Boards");

  const [pt1Input, setPt1Input] = useState("2026-07-20");
  const [pt2Input, setPt2Input] = useState("2026-09-15");
  const [pt3Input, setPt3Input] = useState("2026-12-10");
  const [boardInput, setBoardInput] = useState("2027-03-01");

  const [currentUserEmail, setCurrentUserEmail] = useState("adarshispro01@gmail.com");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configSubmitting, setConfigSubmitting] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // UI States
  const [selectedSubject, setSelectedSubject] = useState<string>("General");
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Loading & Error States
  const [notesLoading, setNotesLoading] = useState(true);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quote & Countdown States
  const [activeQuoteIdx, setActiveQuoteIdx] = useState(0);
  const [daysToExam, setDaysToExam] = useState(0);

  // Fetch Board exam & PT deadlines configuration
  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const data = await response.json();
        if (data.pt1Date) {
          setPt1Date(data.pt1Date);
          setPt1Input(data.pt1Date);
        }
        if (data.pt2Date) {
          setPt2Date(data.pt2Date);
          setPt2Input(data.pt2Date);
        }
        if (data.pt3Date) {
          setPt3Date(data.pt3Date);
          setPt3Input(data.pt3Date);
        }
        if (data.boardExamDate) {
          setBoardExamDate(data.boardExamDate);
          setBoardInput(data.boardExamDate);
        }
      }
    } catch (err) {
      console.error("Failed to load dynamic configurations", err);
    }
  };

  // Fetch all notes from backend
  const fetchNotes = async () => {
    setNotesLoading(true);
    try {
      const response = await fetch("/api/notes");
      if (!response.ok) throw new Error("Failed to gather class notes.");
      const data = await response.json();
      setNotes(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Could not connect to notes database. Please check connection.");
    } finally {
      setNotesLoading(false);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    setNoticesLoading(true);
    try {
      const response = await fetch("/api/announcements");
      if (!response.ok) throw new Error("Failed to load notice board.");
      const data = await response.json();
      setAnnouncements(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setNoticesLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchAnnouncements();
    fetchConfig();

    // Rotate quote every 12 seconds
    const quoteInterval = setInterval(() => {
      setActiveQuoteIdx((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 12000);

    return () => clearInterval(quoteInterval);
  }, []);

  useEffect(() => {
    // Calculate countdown days based on selected test date
    const calculateCountdown = () => {
      const now = new Date();
      let targetDateStr = boardExamDate;
      if (selectedDeadlineTest === "PT1") targetDateStr = pt1Date;
      else if (selectedDeadlineTest === "PT2") targetDateStr = pt2Date;
      else if (selectedDeadlineTest === "PT3") targetDateStr = pt3Date;
      
      const examDate = new Date(`${targetDateStr}T00:00:00`);
      const diffTime = examDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysToExam(diffDays > 0 ? diffDays : 0);
    };
    calculateCountdown();
  }, [pt1Date, pt2Date, pt3Date, boardExamDate, selectedDeadlineTest]);

  // Handler: Add new note to server
  const handleAddNote = async (newNoteData: {
    title: string;
    subject: StudyNote["subject"];
    content: string;
    author: string;
    fileAttached: boolean;
    fileDataUrl?: string;
    fileName?: string;
  }) => {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-user-email": currentUserEmail
      },
      body: JSON.stringify(newNoteData),
    });

    if (!response.ok) {
      const errRes = await response.json();
      throw new Error(errRes.error || "Failed to publish notes.");
    }

    // Refresh Notes Grid
    const savedNote = await response.json();
    setNotes((prev) => [savedNote, ...prev]);
  };

  // Handler: Delete note from server
  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering reader view on click
    if (!window.confirm("Are you sure you want to delete this study note?")) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": currentUserEmail
        }
      });

      if (!response.ok) throw new Error("Failed to delete study note.");

      // Remove from UI state
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handler: Add pinned announcement to board
  const handleAddAnnouncement = async (newAnn: {
    title: string;
    content: string;
    tag: string;
    author: string;
  }) => {
    const response = await fetch("/api/announcements", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-user-email": currentUserEmail
      },
      body: JSON.stringify(newAnn),
    });

    if (!response.ok) throw new Error("Failed to pin announcement.");

    const savedAnn = await response.json();
    setAnnouncements((prev) => [savedAnn, ...prev]);
  };

  // Handler: Delete announcement
  const handleDeleteAnnouncement = async (id: string) => {
    const response = await fetch(`/api/announcements/${id}`, {
      method: "DELETE",
      headers: {
        "x-user-email": currentUserEmail
      }
    });

    if (!response.ok) throw new Error("Failed to remove pinned note.");
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  // Handler: Update Board Exams & Periodic Tests configuration
  const handleUpdateExamDate = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);
    setConfigSubmitting(true);
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUserEmail
        },
        body: JSON.stringify({
          pt1Date: pt1Input,
          pt2Date: pt2Input,
          pt3Date: pt3Input,
          boardExamDate: boardInput,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update target deadlines.");
      }
      setPt1Date(pt1Input);
      setPt2Date(pt2Input);
      setPt3Date(pt3Input);
      setBoardExamDate(boardInput);
      setShowConfigModal(false);
    } catch (err: any) {
      setConfigError(err.message || "An error occurred updating the deadline.");
    } finally {
      setConfigSubmitting(false);
    }
  };

  // Filter notes based on subject and search query
  const filteredNotes = notes.filter((note) => {
    const matchesSubject = selectedSubject === "General" || note.subject === selectedSubject;
    const matchesSearch =
      searchQuery.trim() === "" ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-950 font-sans pb-12 selection:bg-amber-800/10 select-none">
      {/* Dynamic Header */}
      <header className="w-full bg-slate-900 text-white border-b border-slate-950 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-800 rounded-xl text-white shadow-md shadow-amber-900/10">
              <GraduationCap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold font-serif tracking-tight text-white flex items-center gap-1.5">
                <span>CLASS 11TH A NOTES HUB</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono font-medium tracking-wider uppercase">
                Collaborative Student Repository & AI Assistant
              </p>
            </div>
          </div>

          {/* Inspirational Study Quote Carousel */}
          <div className="flex-1 max-w-md bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 mx-0 md:mx-6 text-xs text-slate-300 relative overflow-hidden hidden sm:block">
            <span className="absolute top-1 right-2 text-[9px] font-bold text-amber-500 tracking-widest font-mono select-none">
              MOTIVATION
            </span>
            <p className="font-serif italic leading-relaxed pr-10">
              "{MOTIVATIONAL_QUOTES[activeQuoteIdx].text}"
            </p>
            <p className="text-[10px] font-semibold text-slate-400 mt-1 font-mono">
              — {MOTIVATIONAL_QUOTES[activeQuoteIdx].author}
            </p>
          </div>

          {/* Countdown & Simulated Identity display */}
          <div className="flex items-center flex-wrap gap-3.5 shrink-0">
            {/* Identity Switcher */}
            <div className="bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl text-left">
              <span className="text-[9px] font-mono block text-slate-400 uppercase tracking-wider font-semibold">Simulated User (Test Roles)</span>
              <select
                id="simulated-user-select"
                value={currentUserEmail}
                onChange={(e) => setCurrentUserEmail(e.target.value)}
                className="bg-transparent text-white font-sans font-bold text-xs focus:outline-none cursor-pointer mt-0.5"
              >
                <option value="adarshispro01@gmail.com" className="bg-slate-900 text-white">Adarsh (Admin - adarshispro01@gmail.com)</option>
                <option value="priyan@school.com" className="bg-slate-900 text-white">Priyan (Student - priyan@school.com)</option>
              </select>
            </div>

            {/* Countdown Selector and Displays */}
            <div className="bg-slate-900/90 border border-slate-700/50 rounded-xl p-2 min-w-[240px] shadow-lg flex flex-col gap-1.5">
              <div className="flex gap-1">
                {(["PT1", "PT2", "PT3", "Boards"] as const).map((test) => (
                  <button
                    key={test}
                    id={`toggle-deadline-${test.toLowerCase()}`}
                    onClick={() => setSelectedDeadlineTest(test)}
                    className={`flex-1 px-1.5 py-1 rounded text-[9px] font-black tracking-wider font-mono transition-all duration-150 ${
                      selectedDeadlineTest === test
                        ? "bg-amber-500 text-slate-950 shadow-md font-extrabold scale-105"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {test === "Boards" ? "Boards" : test}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center justify-between border-t border-slate-800 pt-1 px-1">
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
                  {selectedDeadlineTest === "Boards" ? "Boards Countdown" : `${selectedDeadlineTest} Exam`}
                </span>
                {currentUserEmail === "adarshispro01@gmail.com" && (
                  <button
                    id="edit-deadline-trigger"
                    onClick={() => {
                      setConfigError(null);
                      setShowConfigModal(true);
                    }}
                    className="text-[9px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5"
                    title="Click to edit all deadlines"
                  >
                    <span>✎ Edit Dates</span>
                  </button>
                )}
              </div>
              <div className="px-1 font-mono">
                <span className="text-sm font-black text-amber-400">
                  {daysToExam} Days Left
                </span>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-xl text-right hidden xl:block">
              <span className="text-[9px] font-mono block text-slate-400 uppercase">Study Clock</span>
              <span className="text-xs font-semibold text-white font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>IST Standard</span>
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-2xl flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Binders Shelf navigation */}
        <SubjectBinders
          selectedSubject={selectedSubject}
          onSelectSubject={(sub) => {
            setSelectedSubject(sub);
            setSelectedNote(null); // Close note when changing filter
          }}
          notes={notes}
        />

        {/* Note Composer Panel */}
        <UploadForm onAddNote={handleAddNote} currentUserEmail={currentUserEmail} />

        {/* Bottom Workspace Split (Left: Notes Desk, Right: Sidebar widgets) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Notes Deck or Reader */}
          <div className="lg:col-span-2 space-y-4">
            
            {selectedNote ? (
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedNote(null)}
                  className="flex items-center gap-1.5 text-xs text-amber-900 hover:text-amber-950 font-semibold bg-amber-500/5 hover:bg-amber-500/10 px-3.5 py-2 rounded-xl border border-amber-900/5 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to {selectedSubject === "General" ? "All" : selectedSubject} Note Sheets</span>
                </button>
                <ReaderMode
                  note={selectedNote}
                  onClose={() => setSelectedNote(null)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search & Stats Header */}
                <div className="bg-white rounded-2xl border border-amber-900/10 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BookMarked className="w-4 h-4 text-amber-800" />
                      <span>{selectedSubject} Notes Archive</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Showing {filteredNotes.length} matching files from total {notes.length} notes
                    </p>
                  </div>

                  {/* Search bar */}
                  <div className="relative w-full sm:w-64">
                    <span className="absolute left-3 top-2.5 text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search note titles or authors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl focus:outline-none focus:border-amber-800 transition-colors"
                    />
                  </div>
                </div>

                {/* Notes Grid */}
                {notesLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100 text-slate-400 shadow-inner">
                    <Loader className="w-7 h-7 animate-spin mb-2 text-amber-800" />
                    <span className="text-xs font-medium">Filing through cabinets...</span>
                  </div>
                ) : filteredNotes.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-amber-900/10 p-6 flex flex-col items-center justify-center">
                    <Smile className="w-8 h-8 text-slate-400 mb-2" />
                    <h4 className="font-serif text-sm font-bold text-slate-800">No Notes Filed Here</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      {searchQuery
                        ? "We couldn't find any note matching your search. Try tweaking the spelling."
                        : "No notes have been posted in this study binder yet. Drag and drop notes above to write one!"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredNotes.map((note) => (
                      <div
                        id={`note-card-${note.id}`}
                        key={note.id}
                        onClick={() => setSelectedNote(note)}
                        className="bg-white rounded-2xl border border-slate-200 hover:border-amber-800/20 p-5 shadow-sm hover:shadow transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                      >
                        {/* Visual Binder tab on side */}
                        <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500/5 rounded-full translate-x-3 -translate-y-3" />

                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {note.subject}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              {note.fileAttached && (
                                <span className="p-1 rounded bg-amber-100 text-amber-900" title="Reference File Attached">
                                  <FileText className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {currentUserEmail === "adarshispro01@gmail.com" && (
                                <button
                                  onClick={(e) => handleDeleteNote(note.id, e)}
                                  title="Delete Note"
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <h4 className="font-serif text-sm font-bold text-slate-950 mt-2.5 leading-snug group-hover:text-amber-900 transition-colors line-clamp-2">
                            {note.title}
                          </h4>

                          <p className="text-[11px] text-slate-500 font-sans mt-2 line-clamp-3 leading-relaxed whitespace-pre-line">
                            {note.content.replace(/#+\s/g, "")} {/* strip headers for clean preview */}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-sans">
                          <span className="flex items-center gap-1 font-semibold text-slate-600">
                            <User className="w-3 h-3 text-amber-800/40" />
                            <span>{note.author}</span>
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-amber-800/40" />
                            <span>{note.date}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

          </div>

          {/* RIGHT: Desk Tools sidebar (Timer & Board) */}
          <div className="space-y-6">
            
            {/* Pomodoro Desk Timer */}
            <PomodoroTimer />

            {/* Class notice board corkboard */}
            <NoticeBoard
              announcements={announcements}
              loading={noticesLoading}
              onAddAnnouncement={handleAddAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              currentUserEmail={currentUserEmail}
            />

          </div>

        </div>

      </main>

      {/* Visual Credit Footer */}
      <footer className="w-full mt-12 py-8 border-t border-amber-900/10 text-center bg-slate-900 text-white">
        <p className="text-[10px] font-mono tracking-[0.25em] text-amber-500 font-bold uppercase">
          CLASS 11TH A STUDY HUB
        </p>
        <p className="text-sm font-black font-serif text-white mt-1.5 tracking-wider">
          MADE BY 🗿 <span className="text-amber-400">ADARSH PANDEY</span>
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          Designed for high-performance class study & offline notes backup
        </p>
      </footer>

      {/* Dynamic Board Exams Configuration Modal */}
      {showConfigModal && (
        <div id="config-deadline-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in duration-200">
            <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <h3 className="font-serif text-base font-bold">Edit Exam & PT Deadlines</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white transition-colors font-sans text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateExamDate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {configError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{configError}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Simulated Active Identity
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-700 font-semibold">{currentUserEmail}</span>
                  {currentUserEmail === "adarshispro01@gmail.com" ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-sans font-bold">
                      ✓ Authorized (Me)
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-sans font-bold">
                      🔒 Unauthorized
                    </span>
                  )}
                </div>
                {currentUserEmail !== "adarshispro01@gmail.com" && (
                  <p className="text-[10px] text-amber-800 mt-1.5 leading-relaxed bg-amber-50 p-2 rounded-lg border border-amber-100">
                    <strong>Note:</strong> As requested, only Adarsh is permitted to change the deadline. Select "Adarsh (Admin - adarshispro01@gmail.com)" in the top header simulated user select dropdown to test the edit capability.
                  </p>
                )}
              </div>

              <div className="space-y-3.5 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Periodic Test 1 (PT 1) Target Date
                  </label>
                  <input
                    type="date"
                    value={pt1Input}
                    onChange={(e) => setPt1Input(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-700 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Periodic Test 2 (PT 2) Target Date
                  </label>
                  <input
                    type="date"
                    value={pt2Input}
                    onChange={(e) => setPt2Input(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-700 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Periodic Test 3 (PT 3) Target Date
                  </label>
                  <input
                    type="date"
                    value={pt3Input}
                    onChange={(e) => setPt3Input(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-700 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Class 11th Final Boards Target Date
                  </label>
                  <input
                    type="date"
                    value={boardInput}
                    onChange={(e) => setBoardInput(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-slate-600 border border-slate-200 text-xs font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={configSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-55"
                >
                  {configSubmitting ? (
                    <>
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
