import React, { useState, useEffect } from "react";
import { BookOpen, Search, Calendar, User, FileText, Trash2, HelpCircle, Smile, Clock, Sparkles, BookMarked, GraduationCap, ChevronRight, AlertCircle, Loader, ArrowLeft, Sun, Moon, RefreshCw } from "lucide-react";
import SubjectBinders from "./components/SubjectBinders";
import PomodoroTimer from "./components/PomodoroTimer";
import NoticeBoard from "./components/NoticeBoard";
import ReaderMode from "./components/ReaderMode";
import UploadForm from "./components/UploadForm";
import FluidBackground from "./components/FluidBackground";
import BackgroundMusic from "./components/BackgroundMusic";
import { StudyNote, Announcement } from "./types";

const MOTIVATIONAL_QUOTES = [
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Do not wait to strike till the iron is hot; but make it hot by striking.", author: "William Butler Yeats" },
  { text: "Genius is 1% talent and 99% hard work.", author: "Albert Einstein" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Focus is a muscle, and you build it through daily study.", author: "Adarsh Pandey" },
  { text: "Work hard in silence, let your success be your noise.", author: "Frank Ocean" },
  { text: "Yesterday is history, tomorrow is a mystery, today is a gift of God, which is why we call it the present.", author: "Bill Keane" }
];

const saveNotesToLocalStorage = (notesArray: StudyNote[]) => {
  try {
    // Strip fileDataUrl from the saved copy to prevent QuotaExceededError in localStorage
    const simplified = notesArray.map((note) => {
      if (note.fileDataUrl) {
        const { fileDataUrl, ...rest } = note;
        return rest;
      }
      return note;
    });
    localStorage.setItem("study_hub_notes", JSON.stringify(simplified));
  } catch (err) {
    console.warn("Failed to write study_hub_notes to localStorage:", err);
  }
};

const saveBackupToLocalStorage = (backupData: { notes: StudyNote[]; announcements: any[]; timestamp: string }) => {
  try {
    const simplifiedNotes = backupData.notes.map((note) => {
      if (note.fileDataUrl) {
        const { fileDataUrl, ...rest } = note;
        return rest;
      }
      return note;
    });
    const simplifiedBackup = {
      ...backupData,
      notes: simplifiedNotes,
    };
    localStorage.setItem("study_hub_auto_backup", JSON.stringify(simplifiedBackup));
  } catch (err) {
    console.warn("Failed to write study_hub_auto_backup to localStorage:", err);
  }
};

export default function App() {
  const [notes, setNotes] = useState<StudyNote[]>(() => {
    try {
      const saved = localStorage.getItem("study_hub_notes");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      }
      
      // Fallback recovery check from the dedicated auto-backup
      const backupStr = localStorage.getItem("study_hub_auto_backup");
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        if (backup && Array.isArray(backup.notes) && backup.notes.length > 0) {
          console.log("Recovered notes from study_hub_auto_backup");
          return backup.notes;
        }
      }
      return [];
    } catch {
      return [];
    }
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const saved = localStorage.getItem("study_hub_announcements");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      }
      
      // Fallback recovery check from the dedicated auto-backup
      const backupStr = localStorage.getItem("study_hub_auto_backup");
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        if (backup && Array.isArray(backup.announcements) && backup.announcements.length > 0) {
          console.log("Recovered announcements from study_hub_auto_backup");
          return backup.announcements;
        }
      }
      return [];
    } catch {
      return [];
    }
  });
  
  // Dynamic Settings & Simulated User Role States
  const [pt1Date, setPt1Date] = useState(() => {
    return localStorage.getItem("study_hub_pt1Date") || "2026-07-20";
  });
  const [pt2Date, setPt2Date] = useState(() => {
    return localStorage.getItem("study_hub_pt2Date") || "2026-09-15";
  });
  const [pt3Date, setPt3Date] = useState(() => {
    return localStorage.getItem("study_hub_pt3Date") || "2026-12-10";
  });
  const [boardExamDate, setBoardExamDate] = useState(() => {
    return localStorage.getItem("study_hub_boardExamDate") || "2027-03-01";
  });
  const [selectedDeadlineTest, setSelectedDeadlineTest] = useState<"PT1" | "PT2" | "PT3" | "Boards">("Boards");

  const [pt1Input, setPt1Input] = useState(() => {
    return localStorage.getItem("study_hub_pt1Date") || "2026-07-20";
  });
  const [pt2Input, setPt2Input] = useState(() => {
    return localStorage.getItem("study_hub_pt2Date") || "2026-09-15";
  });
  const [pt3Input, setPt3Input] = useState(() => {
    return localStorage.getItem("study_hub_pt3Date") || "2026-12-10";
  });
  const [boardInput, setBoardInput] = useState(() => {
    return localStorage.getItem("study_hub_boardExamDate") || "2027-03-01";
  });

  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    return localStorage.getItem("study_hub_user_email") || "priyan@school.com";
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pendingAdminAction, setPendingAdminAction] = useState<{ onSuccess: () => void } | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("study_hub_theme") as "dark" | "light") || "dark";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("study_hub_theme", nextTheme);
  };

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configSubmitting, setConfigSubmitting] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // UI States
  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    return localStorage.getItem("study_hub_selected_subject") || "General";
  });
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);
  const [readerInitialTab, setReaderInitialTab] = useState<"read" | "summary" | "quiz" | "flashcards" | "attachment">("read");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Loading & Error States
  const [notesLoading, setNotesLoading] = useState(true);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Quote & Countdown States
  const [activeQuoteIdx, setActiveQuoteIdx] = useState(() => Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length));
  const [daysToExam, setDaysToExam] = useState(0);

  // Fetch Board exam & PT deadlines configuration
  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const data = await response.json();
        
        const finalPt1 = data.pt1Date || pt1Date;
        const finalPt2 = data.pt2Date || pt2Date;
        const finalPt3 = data.pt3Date || pt3Date;
        const finalBoard = data.boardExamDate || boardExamDate;

        setPt1Date(finalPt1);
        setPt1Input(finalPt1);
        localStorage.setItem("study_hub_pt1Date", finalPt1);

        setPt2Date(finalPt2);
        setPt2Input(finalPt2);
        localStorage.setItem("study_hub_pt2Date", finalPt2);

        setPt3Date(finalPt3);
        setPt3Input(finalPt3);
        localStorage.setItem("study_hub_pt3Date", finalPt3);

        setBoardExamDate(finalBoard);
        setBoardInput(finalBoard);
        localStorage.setItem("study_hub_boardExamDate", finalBoard);
      }
    } catch (err) {
      console.error("Failed to load dynamic configurations", err);
    }
  };

  // Fetch all notes from backend
  const fetchNotes = async (isBackground = false) => {
    if (!isBackground) setNotesLoading(notes.length === 0);
    try {
      const response = await fetch("/api/notes");
      if (!response.ok) throw new Error("Failed to gather class notes.");
      const serverNotes: StudyNote[] = await response.json();
      
      setNotes((prevNotes) => {
        // Only retain local optimistic/unsynced notes (where ID starts with "temp-note-")
        const unsynced = prevNotes.filter((n) => n.id.startsWith("temp-note-"));
        const updated = [...unsynced];
        serverNotes.forEach((sNote) => {
          // If this note already exists in prevNotes and has fileDataUrl (loaded on demand), preserve it!
          const existing = prevNotes.find((p) => p.id === sNote.id);
          const noteToAdd = existing && existing.fileDataUrl 
            ? { ...sNote, fileDataUrl: existing.fileDataUrl } 
            : sNote;

          if (!updated.some((u) => u.id === noteToAdd.id)) {
            updated.push(noteToAdd);
          }
        });
        saveNotesToLocalStorage(updated);
        return updated;
      });
    } catch (err: any) {
      console.error(err);
      if (notes.length === 0 && !isBackground) {
        setErrorMessage("Could not connect to notes database. Please check connection.");
      }
    } finally {
      if (!isBackground) setNotesLoading(false);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async (isBackground = false) => {
    if (!isBackground) setNoticesLoading(announcements.length === 0);
    try {
      const response = await fetch("/api/announcements");
      if (!response.ok) throw new Error("Failed to load notice board.");
      const serverNotices: Announcement[] = await response.json();

      setAnnouncements((prevNotices) => {
        // Only retain local optimistic/unsynced notices (where ID starts with "temp-announce-")
        const unsynced = prevNotices.filter((a) => a.id.startsWith("temp-announce-"));
        const updated = [...unsynced];
        serverNotices.forEach((sAnn) => {
          if (!updated.some((u) => u.id === sAnn.id)) {
            updated.push(sAnn);
          }
        });
        localStorage.setItem("study_hub_announcements", JSON.stringify(updated));
        return updated;
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      if (!isBackground) setNoticesLoading(false);
    }
  };

  // Synchronize both notes, announcements, and config seamlessly in background
  const syncWithCloud = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([
        fetchNotes(true),
        fetchAnnouncements(true),
        fetchConfig()
      ]);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error("Cloud synchronization failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchAnnouncements();
    fetchConfig();
    setLastSyncTime(new Date());

    // Polling interval (every 6 seconds) for other user devices to automatically fetch newly uploaded documents in real-time
    const syncInterval = setInterval(() => {
      syncWithCloud();
    }, 6000);

    // Rotate quote every 12 seconds
    const quoteInterval = setInterval(() => {
      setActiveQuoteIdx((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 12000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(quoteInterval);
    };
  }, []);

  // Sync references to latest notes and announcements to prevent stale state inside backup interval
  const notesRef = React.useRef(notes);
  const announcementsRef = React.useRef(announcements);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    announcementsRef.current = announcements;
  }, [announcements]);

  // Fetch attachment on demand when a note with a file attachment is selected
  useEffect(() => {
    if (selectedNote && selectedNote.fileAttached && !selectedNote.fileDataUrl) {
      const fetchAttachment = async () => {
        try {
          const response = await fetch(`/api/notes/${selectedNote.id}/attachment`);
          if (response.ok) {
            const data = await response.json();
            if (data.fileDataUrl) {
              // Update selectedNote with the loaded file data
              setSelectedNote((prev) => {
                if (prev && prev.id === selectedNote.id) {
                  return { ...prev, fileDataUrl: data.fileDataUrl };
                }
                return prev;
              });

              // Update the notes list in memory so we don't have to fetch it again if they reopen
              setNotes((prevNotes) =>
                prevNotes.map((n) =>
                  n.id === selectedNote.id ? { ...n, fileDataUrl: data.fileDataUrl } : n
                )
              );
            }
          }
        } catch (err) {
          console.error("Failed to load note attachment:", err);
        }
      };
      fetchAttachment();
    }
  }, [selectedNote?.id]);

  // Periodic Auto-Backup of notes and announcements to 'study_hub_auto_backup' every 5 minutes
  useEffect(() => {
    const backupInterval = setInterval(() => {
      try {
        const backupData = {
          notes: notesRef.current,
          announcements: announcementsRef.current,
          timestamp: new Date().toISOString()
        };
        saveBackupToLocalStorage(backupData);
        console.log("Study Hub full state auto-backed up successfully at", backupData.timestamp);
      } catch (err) {
        console.error("Study Hub auto-backup failed:", err);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(backupInterval);
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
    // Optimistically save locally with temporary ID starting with 'temp-note-'
    const tempId = "temp-note-" + Date.now();
    const tempNote: StudyNote = {
      id: tempId,
      ...newNoteData,
      date: new Date().toISOString().split("T")[0]
    };

    setNotes((prev) => {
      const updated = [tempNote, ...prev];
      saveNotesToLocalStorage(updated);
      return updated;
    });

    try {
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

      // Replace the temp note with the saved note from the server
      const savedNote = await response.json();
      setNotes((prev) => {
        const updated = prev.map((n) => (n.id === tempId ? savedNote : n));
        saveNotesToLocalStorage(updated);
        return updated;
      });
    } catch (err: any) {
      console.warn("Saved locally, but backend could not sync note:", err.message);
    }
  };

  // Handler: Delete note from server
  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering reader view on click

    // Instantly remove locally
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== noteId);
      saveNotesToLocalStorage(updated);
      return updated;
    });
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": currentUserEmail
        }
      });

      if (!response.ok) throw new Error("Failed to delete study note.");
    } catch (err: any) {
      console.warn("Deleted locally, but backend sync failed:", err.message);
    }
  };

  // Handler: Add pinned announcement to board
  const handleAddAnnouncement = async (newAnn: {
    title: string;
    content: string;
    tag: string;
    author: string;
  }) => {
    const tempId = "temp-announce-" + Date.now();
    const tempAnn: Announcement = {
      id: tempId,
      ...newAnn,
      date: new Date().toISOString().split("T")[0]
    };

    setAnnouncements((prev) => {
      const updated = [tempAnn, ...prev];
      localStorage.setItem("study_hub_announcements", JSON.stringify(updated));
      return updated;
    });

    try {
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
      setAnnouncements((prev) => {
        const updated = prev.map((a) => (a.id === tempId ? savedAnn : a));
        localStorage.setItem("study_hub_announcements", JSON.stringify(updated));
        return updated;
      });
    } catch (err: any) {
      console.warn("Saved announcement locally, backend sync failed:", err.message);
    }
  };

  // Handler: Delete announcement
  const handleDeleteAnnouncement = async (id: string) => {
    setAnnouncements((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      localStorage.setItem("study_hub_announcements", JSON.stringify(updated));
      return updated;
    });

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-email": currentUserEmail
        }
      });

      if (!response.ok) throw new Error("Failed to remove pinned note.");
    } catch (err: any) {
      console.warn("Deleted locally, but server sync failed:", err.message);
    }
  };

  // Handler: Update Board Exams & Periodic Tests configuration
  const handleUpdateExamDate = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);
    setConfigSubmitting(true);

    // Save locally immediately
    setPt1Date(pt1Input);
    setPt2Date(pt2Input);
    setPt3Date(pt3Input);
    setBoardExamDate(boardInput);
    localStorage.setItem("study_hub_pt1Date", pt1Input);
    localStorage.setItem("study_hub_pt2Date", pt2Input);
    localStorage.setItem("study_hub_pt3Date", pt3Input);
    localStorage.setItem("study_hub_boardExamDate", boardInput);
    setShowConfigModal(false);

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
    } catch (err: any) {
      console.warn("Saved local deadlines, server sync failed:", err.message);
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
    <div className={`min-h-screen bg-transparent font-sans pb-12 selection:bg-orange-500/20 select-none relative z-10 transition-colors duration-350 ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
      <FluidBackground theme={theme} />
      <BackgroundMusic />
      {/* Dynamic Header */}
      <header className="w-full bg-slate-950/85 backdrop-blur-md text-white border-b border-slate-800/60 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-800 rounded-xl text-white shadow-md shadow-amber-900/10">
              <GraduationCap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold font-serif tracking-tight text-white flex items-center gap-1.5">
                <span>CLASS 11TH 'A' NOTES CLUB</span>
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <p className="text-[10px] text-slate-400 font-mono font-medium tracking-wider uppercase">
                  Collaborative Student Repository & AI Assistant
                </p>
                <div className="hidden sm:block h-2.5 w-px bg-slate-800" />
                <div className="flex items-center gap-1 bg-slate-900/40 border border-slate-800/50 px-1.5 py-0.5 rounded-md">
                  <span className="relative flex h-1.5 w-1.5">
                    {isSyncing && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isSyncing ? "bg-amber-400" : "bg-emerald-500 animate-pulse"}`}></span>
                  </span>
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                    {isSyncing ? "syncing..." : "live cloud"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Countdown & Simulated Identity display */}
          <div className="flex items-center flex-wrap gap-3.5 shrink-0">
            {/* Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-white transition-all flex items-center justify-center shadow-md cursor-pointer"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-amber-500" />}
            </button>

            {/* Identity Switcher replaced by password protected Admin login button */}
            {currentUserEmail !== "adarshispro01@gmail.com" ? (
              <button
                id="admin-login-btn"
                onClick={() => {
                  setPasswordError(null);
                  setPasswordInput("");
                  setPendingAdminAction(null);
                  setShowPasswordModal(true);
                }}
                className="bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 px-3.5 py-1.5 rounded-xl text-left flex items-center gap-2 text-white hover:text-amber-400 transition-all cursor-pointer shadow-md"
              >
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider font-semibold">User Role</span>
                  <span className="text-xs font-bold font-sans flex items-center gap-1">
                    <span>Student</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">(🔑 Verify Admin)</span>
                  </span>
                </div>
              </button>
            ) : (
              <div className="bg-slate-800/80 border border-slate-700/60 px-3.5 py-1.5 rounded-xl text-left flex items-center gap-3 text-white shadow-md">
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider font-semibold">User Role</span>
                  <span className="text-xs font-bold font-sans text-amber-400">
                    Adarsh (Admin)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCurrentUserEmail("priyan@school.com");
                    localStorage.setItem("study_hub_user_email", "priyan@school.com");
                  }}
                  className="text-[10px] bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-lg transition-all font-semibold font-mono cursor-pointer"
                  title="Lock Admin Access"
                >
                  Lock
                </button>
              </div>
            )}

            {/* Column containing Deadline Box and Motivational Quotes */}
            <div className="flex flex-col gap-2 min-w-[245px] w-full sm:w-[265px]">
              {/* Countdown Selector and Displays */}
              <div className="bg-slate-900/90 border border-slate-700/50 rounded-xl p-2 shadow-lg flex flex-col gap-1.5 w-full">
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
                  <button
                    id="edit-deadline-trigger"
                    onClick={() => {
                      if (currentUserEmail === "adarshispro01@gmail.com") {
                        setConfigError(null);
                        setShowConfigModal(true);
                      } else {
                        setPasswordError(null);
                        setPasswordInput("");
                        setPendingAdminAction({
                          onSuccess: () => {
                            setConfigError(null);
                            setShowConfigModal(true);
                          }
                        });
                        setShowPasswordModal(true);
                      }
                    }}
                    className="text-[9px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer"
                    title="Click to edit all deadlines (requires admin password)"
                  >
                    <span>✎ Edit Dates {currentUserEmail !== "adarshispro01@gmail.com" && "🔒"}</span>
                  </button>
                </div>
                <div className="px-1 font-mono">
                  <span className="text-sm font-black text-amber-400">
                    {daysToExam} Days Left
                  </span>
                </div>
              </div>

              {/* Inspirational Study Quote Carousel - Placed right below the deadline box */}
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-slate-300 relative overflow-hidden min-h-[74px] flex flex-col justify-between w-full">
                <div>
                  <span className="text-[8px] font-bold text-amber-500 tracking-widest font-mono select-none uppercase block mb-1">
                    MOTIVATION
                  </span>
                  <p className="font-serif italic leading-relaxed pr-8">
                    "{MOTIVATIONAL_QUOTES[activeQuoteIdx].text}"
                  </p>
                </div>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                  <p className="text-[9px] font-semibold text-slate-400 font-mono">
                    — {MOTIVATIONAL_QUOTES[activeQuoteIdx].author}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveQuoteIdx((current) => {
                        if (MOTIVATIONAL_QUOTES.length <= 1) return current;
                        let nextIdx = current;
                        while (nextIdx === current) {
                          nextIdx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
                        }
                        return nextIdx;
                      });
                    }}
                    className="p-1 rounded bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border border-white/5 hover:border-amber-500/20 transition-all duration-200 cursor-pointer group"
                    title="Refresh Quote Only"
                  >
                    <RefreshCw className="w-2.5 h-2.5 group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                </div>
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
            localStorage.setItem("study_hub_selected_subject", sub);
            setSelectedNote(null); // Close note when changing filter
          }}
          notes={notes}
          theme={theme}
        />

        {/* Note Composer Panel */}
        <UploadForm onAddNote={handleAddNote} currentUserEmail={currentUserEmail} theme={theme} />

        {/* Bottom Workspace Split (Left: Notes Desk, Right: Sidebar widgets) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Notes Deck or Reader */}
          <div className="lg:col-span-2 space-y-4">
            
            {selectedNote ? (
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedNote(null)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all ${
                    theme === "dark"
                      ? "text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 border-slate-800"
                      : "text-amber-900 bg-amber-500/5 hover:bg-amber-500/10 border-amber-900/5 hover:text-amber-950"
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to {selectedSubject === "General" ? "All" : selectedSubject} Note Sheets</span>
                </button>
                <ReaderMode
                  note={selectedNote}
                  onClose={() => setSelectedNote(null)}
                  initialTab={readerInitialTab}
                  theme={theme}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search & Stats Header */}
                <div className={`rounded-2xl border p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
                  theme === "dark" ? "bg-slate-900/85 border-slate-800 text-white" : "bg-white border-amber-900/10 text-slate-900"
                }`}>
                  <div>
                    <h3 className={`font-serif text-sm font-bold flex items-center gap-2 ${
                      theme === "dark" ? "text-slate-100" : "text-slate-900"
                    }`}>
                      <BookMarked className={`w-4 h-4 ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`} />
                      <span>{selectedSubject} Notes Archive</span>
                    </h3>
                    <p className={`text-[10px] mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
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
                      className={`w-full text-xs pl-9 pr-4 py-2 border rounded-xl focus:outline-none transition-colors ${
                        theme === "dark"
                          ? "bg-slate-950 border-slate-800 text-white focus:border-amber-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-800 focus:bg-white"
                      }`}
                    />
                  </div>
                </div>

                {/* Notes Grid */}
                {notesLoading ? (
                  <div className={`flex flex-col items-center justify-center py-24 rounded-2xl border shadow-inner ${
                    theme === "dark" ? "bg-slate-900/40 border-slate-800 text-slate-400" : "bg-white border-slate-100 text-slate-400"
                  }`}>
                    <Loader className={`w-7 h-7 animate-spin mb-2 ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`} />
                    <span className="text-xs font-medium">Filing through cabinets...</span>
                  </div>
                ) : filteredNotes.length === 0 ? (
                  <div className={`text-center py-20 rounded-2xl border border-dashed p-6 flex flex-col items-center justify-center ${
                    theme === "dark" ? "bg-slate-900/40 border-slate-800 text-slate-500" : "bg-white border-amber-900/10 text-slate-400"
                  }`}>
                    <Smile className="w-8 h-8 text-slate-400 mb-2" />
                    <h4 className={`font-serif text-sm font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>No Notes Filed Here</h4>
                    <p className={`text-xs mt-1 max-w-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
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
                        onClick={() => {
                          setReaderInitialTab("read");
                          setSelectedNote(note);
                        }}
                        className={`rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden p-5 shadow-sm hover:shadow-md ${
                          theme === "dark"
                            ? "bg-slate-900/60 backdrop-blur-[14px] border-slate-800/80 text-white hover:border-amber-500/30 hover:bg-slate-900/75"
                            : "bg-white/70 backdrop-blur-[6px] border-slate-200/60 hover:border-amber-800/25 hover:bg-white/85"
                        }`}
                      >
                        {/* Visual Binder tab on side */}
                        <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500/5 rounded-full translate-x-3 -translate-y-3" />

                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                              theme === "dark"
                                ? "bg-slate-950 border-slate-800 text-slate-300"
                                : "bg-slate-100 border-slate-200 text-slate-600"
                            }`}>
                              {note.subject}
                            </span>
                            
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {note.fileAttached && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReaderInitialTab("attachment");
                                    setSelectedNote(note);
                                  }}
                                  className={`p-1 px-1.5 rounded transition-colors flex items-center gap-1 text-[10px] font-sans font-bold border cursor-pointer shadow-sm ${
                                    theme === "dark"
                                      ? "bg-slate-950 hover:bg-slate-850 border-slate-800 text-amber-400"
                                      : "bg-amber-100 hover:bg-amber-200 border-amber-200 text-amber-950"
                                  }`}
                                  title="Open Attached Document Inline"
                                >
                                  <FileText className={`w-3 h-3 ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`} />
                                  <span>View File</span>
                                </button>
                              )}
                              {currentUserEmail && (
                                <>
                                  {confirmDeleteId === note.id ? (
                                    <div className={`flex items-center gap-1 border rounded-lg p-0.5 shadow-sm ${
                                      theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-rose-50 border-rose-200/50"
                                    }`}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteId(null);
                                        }}
                                        className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold text-slate-500 hover:text-slate-850 hover:bg-slate-100 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteId(null);
                                          handleDeleteNote(note.id, e);
                                        }}
                                        className="px-2 py-0.5 rounded text-[9px] font-sans font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (currentUserEmail === "adarshispro01@gmail.com") {
                                          setConfirmDeleteId(note.id);
                                          // Auto-reset after 4 seconds if they don't confirm
                                          setTimeout(() => {
                                            setConfirmDeleteId((prev) => prev === note.id ? null : prev);
                                          }, 4000);
                                        } else {
                                          setPasswordError(null);
                                          setPasswordInput("");
                                          setPendingAdminAction({
                                            onSuccess: () => {
                                              setConfirmDeleteId(note.id);
                                              // Auto-reset after 4 seconds if they don't confirm
                                              setTimeout(() => {
                                                setConfirmDeleteId((prev) => prev === note.id ? null : prev);
                                              }, 4000);
                                            }
                                          });
                                          setShowPasswordModal(true);
                                        }
                                      }}
                                      title="Delete Note"
                                      className={`p-1 rounded transition-colors ${
                                        theme === "dark" ? "text-slate-500 hover:text-rose-500 hover:bg-slate-950" : "text-slate-400 hover:text-rose-600 hover:bg-slate-50"
                                      }`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <h4 className={`font-serif text-sm font-bold mt-2.5 leading-snug transition-colors line-clamp-2 ${
                            theme === "dark" ? "text-slate-100 group-hover:text-amber-400" : "text-slate-950 group-hover:text-amber-900"
                          }`}>
                            {note.title}
                          </h4>

                          <p className={`text-[11px] font-sans mt-2 line-clamp-3 leading-relaxed whitespace-pre-line ${
                            theme === "dark" ? "text-slate-400" : "text-slate-500"
                          }`}>
                            {note.content.replace(/#+\s/g, "")} {/* strip headers for clean preview */}
                          </p>
                        </div>

                        <div className={`flex items-center justify-between mt-5 pt-3 border-t text-[10px] font-sans ${
                          theme === "dark" ? "border-slate-850/60 text-slate-450" : "border-slate-100 text-slate-400"
                        }`}>
                          <span className={`flex items-center gap-1 font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                            <User className={`w-3 h-3 ${theme === "dark" ? "text-amber-400/60" : "text-amber-800/40"}`} />
                            <span>{note.author}</span>
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className={`w-3.5 h-3.5 ${theme === "dark" ? "text-amber-400/60" : "text-amber-800/40"}`} />
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
            <PomodoroTimer theme={theme} />

            {/* Class notice board corkboard */}
            <NoticeBoard
              announcements={announcements}
              loading={noticesLoading}
              onAddAnnouncement={handleAddAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              currentUserEmail={currentUserEmail}
              theme={theme}
              onRequireAdmin={(onSuccess) => {
                setPasswordError(null);
                setPasswordInput("");
                setPendingAdminAction({ onSuccess });
                setShowPasswordModal(true);
              }}
            />

          </div>

        </div>

      </main>

      {/* Visual Credit Footer */}
      <footer className={`w-full mt-16 py-10 border-t text-center transition-colors duration-350 ${
        theme === "dark"
          ? "bg-slate-950/80 backdrop-blur-md border-slate-800/80 text-white"
          : "bg-white/80 backdrop-blur-md border-slate-200/80 text-slate-900"
      }`}>
        <p className={`text-[10px] font-mono tracking-[0.25em] font-bold uppercase ${
          theme === "dark" ? "text-amber-500" : "text-amber-800"
        }`}>
          CLASS 11TH 'A' NOTES CLUB
        </p>
        <p className="text-sm font-black font-serif mt-1.5 tracking-wider">
          MADE BY 🗿 <span className={theme === "dark" ? "text-amber-400" : "text-amber-800 font-extrabold"}>ADARSH PANDEY</span>
        </p>
        <p className={`text-[10px] mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
          Designed for high-performance class study & offline notes backup
        </p>
      </footer>

      {/* Admin Password Verification Modal */}
      {showPasswordModal && (
        <div id="admin-password-modal" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden text-white">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif text-base font-bold">Admin Verification</h3>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput("");
                  setPasswordError(null);
                  setPendingAdminAction(null);
                }}
                className="text-slate-400 hover:text-white transition-colors font-sans text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (passwordInput === "757473") {
                  setCurrentUserEmail("adarshispro01@gmail.com");
                  localStorage.setItem("study_hub_user_email", "adarshispro01@gmail.com");
                  setShowPasswordModal(false);
                  setPasswordInput("");
                  setPasswordError(null);
                  if (pendingAdminAction && pendingAdminAction.onSuccess) {
                    pendingAdminAction.onSuccess();
                  }
                  setPendingAdminAction(null);
                } else {
                  setPasswordError("Invalid Admin Password. Please try again.");
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Enter Admin Password
                </label>
                <input
                  type="password"
                  placeholder="••••••"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-center tracking-widest font-mono text-amber-400 placeholder:text-slate-700"
                  autoFocus
                />
              </div>

              {passwordError && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                Access to notice pinning, deadline configuration, and other admin features requires entering Pandey Ji's master key.
              </p>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput("");
                    setPasswordError(null);
                    setPendingAdminAction(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-500/10"
                >
                  Verify Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <span className="text-slate-700 font-semibold">
                    {currentUserEmail === "adarshispro01@gmail.com" ? "Adarsh (Admin)" : "Student"}
                  </span>
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
                    <strong>Note:</strong> Only Adarsh is permitted to change the deadline. Click "Verify Admin" in the top header or verify via the prompt to test the edit capability.
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
