import React, { useState } from "react";
import { Pin, Calendar, User, Plus, Trash2, Tag, Loader } from "lucide-react";
import { Announcement } from "../types";

interface NoticeBoardProps {
  announcements: Announcement[];
  loading: boolean;
  onAddAnnouncement: (announcement: { title: string; content: string; tag: string; author: string }) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  currentUserEmail: string;
  theme: "dark" | "light";
  onRequireAdmin?: (onSuccess: () => void) => void;
}

const TAG_STYLES: Record<string, string> = {
  Exam: "bg-rose-100 text-rose-800 border-rose-200",
  Submission: "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Study Group": "bg-emerald-100 text-emerald-800 border-emerald-200",
  Syllabus: "bg-amber-100 text-amber-800 border-amber-200",
  General: "bg-slate-100 text-slate-800 border-slate-200",
};

// Subtle color variants for sticky notes to make them look tactile and organic
const STICKY_COLORS = [
  "bg-amber-50/90 border-amber-200 shadow-amber-900/5",
  "bg-blue-50/90 border-blue-200 shadow-blue-900/5",
  "bg-green-50/90 border-green-200 shadow-green-900/5",
  "bg-pink-50/90 border-pink-200 shadow-pink-900/5",
];

const STICKY_COLORS_DARK = [
  "bg-amber-950/40 border-amber-900/60 shadow-amber-950/5 text-amber-100",
  "bg-blue-950/40 border-blue-900/60 shadow-blue-950/5 text-blue-100",
  "bg-emerald-950/40 border-emerald-900/60 shadow-emerald-950/5 text-emerald-100",
  "bg-pink-950/40 border-pink-900/60 shadow-pink-950/5 text-pink-100",
];

export default function NoticeBoard({
  announcements,
  loading,
  onAddAnnouncement,
  onDeleteAnnouncement,
  currentUserEmail,
  theme,
  onRequireAdmin,
}: NoticeBoardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("General");
  const [author, setAuthor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setSubmitting(true);
    try {
      await onAddAnnouncement({
        title,
        content,
        tag,
        author: author.trim() || "11th-A Student",
      });
      setTitle("");
      setContent("");
      setTag("General");
      setAuthor("");
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="noticeboard-widget" className={`rounded-2xl border p-5 shadow-sm transition-all duration-350 ${
      theme === "dark"
        ? "bg-slate-900/85 border-slate-800 text-white"
        : "bg-[#fbf9f4] border-amber-900/10 text-slate-900"
    }`}>
      <div className={`flex items-center justify-between mb-4 pb-2 border-b ${
        theme === "dark" ? "border-slate-800" : "border-amber-900/5"
      }`}>
        <h3 className={`font-serif text-lg font-bold flex items-center gap-2 ${
          theme === "dark" ? "text-slate-100" : "text-amber-950"
        }`}>
          <Pin className={`w-4 h-4 rotate-12 ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`} />
          <span>Class 11th A Board</span>
        </h3>
        
        <button
          id="pin-notice-btn"
          onClick={() => {
            if (currentUserEmail === "adarshispro01@gmail.com") {
              setIsOpen(!isOpen);
            } else if (onRequireAdmin) {
              onRequireAdmin(() => setIsOpen(true));
            }
          }}
          className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
            theme === "dark"
              ? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
              : "text-amber-900 bg-amber-900/5 hover:bg-amber-900/10"
          }`}
        >
          <Plus className="w-3 h-3" />
          <span>Pin Notice {currentUserEmail !== "adarshispro01@gmail.com" && "🔒"}</span>
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className={`mb-4 p-3 border rounded-xl space-y-3 shadow-inner ${
          theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-white border-amber-950/10"
        }`}>
          <div className={`text-xs font-bold ${theme === "dark" ? "text-slate-200" : "text-amber-950"}`}>New Announcement</div>
          
          <input
            type="text"
            placeholder="Title (e.g. Maths Syllabus)"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full text-xs p-2 rounded focus:outline-none transition-colors ${
              theme === "dark"
                ? "bg-slate-900 border-slate-800 text-white focus:border-amber-500"
                : "bg-slate-50 border border-slate-200 focus:border-amber-800 text-slate-900"
            }`}
          />

          <textarea
            placeholder="Write announcement details here..."
            required
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`w-full text-xs p-2 rounded focus:outline-none resize-none transition-colors ${
              theme === "dark"
                ? "bg-slate-900 border-slate-800 text-white focus:border-amber-500"
                : "bg-slate-50 border border-slate-200 focus:border-amber-800 text-slate-900"
            }`}
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5 font-semibold">Author</label>
              <input
                type="text"
                placeholder="Your Name / Role"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className={`w-full text-xs p-1.5 rounded focus:outline-none transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-800 text-white focus:border-amber-500"
                    : "bg-slate-50 border border-slate-200 focus:border-amber-800 text-slate-900"
                }`}
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5 font-semibold">Category</label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className={`w-full text-xs p-1.5 rounded focus:outline-none transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-800 text-white focus:border-amber-500"
                    : "bg-slate-50 border border-slate-200 focus:border-amber-800 text-slate-900 bg-white"
                }`}
              >
                <option value="General" className={theme === "dark" ? "bg-slate-950 text-white" : ""}>General</option>
                <option value="Exam" className={theme === "dark" ? "bg-slate-950 text-white" : ""}>Exam</option>
                <option value="Submission" className={theme === "dark" ? "bg-slate-950 text-white" : ""}>Submission</option>
                <option value="Study Group" className={theme === "dark" ? "bg-slate-950 text-white" : ""}>Study Group</option>
                <option value="Syllabus" className={theme === "dark" ? "bg-slate-950 text-white" : ""}>Syllabus</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] text-slate-500 hover:text-slate-400 px-2 py-1 rounded font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`text-[10px] font-semibold px-3 py-1 rounded flex items-center gap-1 shadow-sm transition-colors ${
                theme === "dark"
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                  : "bg-amber-800 hover:bg-amber-900 text-white"
              }`}
            >
              {submitting ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Pin className="w-3 h-3" />
                  <span>Pin Up</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <Loader className={`w-5 h-5 animate-spin mb-1 ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`} />
          <span className="text-xs">Gathering notes...</span>
        </div>
      ) : announcements.length === 0 ? (
        <div className={`text-center py-8 border border-dashed rounded-xl text-xs ${
          theme === "dark"
            ? "border-slate-800 bg-slate-950/40 text-slate-500"
            : "border-amber-900/10 bg-amber-50/20 text-slate-400"
        }`}>
          No pins on the chalkboard yet. Be the first to pin a study reminder!
        </div>
      ) : (
        <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
          {announcements.map((ann, idx) => {
            const stickyStyle = theme === "dark"
              ? STICKY_COLORS_DARK[idx % STICKY_COLORS_DARK.length]
              : STICKY_COLORS[idx % STICKY_COLORS.length];
            const tagClass = TAG_STYLES[ann.tag] || TAG_STYLES.General;

            return (
              <div
                key={ann.id}
                className={`p-3.5 rounded-xl border-l-4 shadow-sm transition-transform duration-150 hover:-rotate-1 relative overflow-hidden ${stickyStyle}`}
              >
                {/* Visual Pin Asset */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-rose-600 rounded-full border border-rose-800/20 shadow" />

                <div className="flex items-start justify-between gap-2 mt-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${tagClass}`}>
                    {ann.tag}
                  </span>
                  <button
                    onClick={() => {
                      if (currentUserEmail === "adarshispro01@gmail.com") {
                        onDeleteAnnouncement(ann.id);
                      } else if (onRequireAdmin) {
                        onRequireAdmin(() => onDeleteAnnouncement(ann.id));
                      }
                    }}
                    title="Remove Pin (requires admin password)"
                    className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <h4 className={`font-serif text-sm font-bold mt-1 leading-snug ${theme === "dark" ? "text-white" : "text-slate-950"}`}>
                  {ann.title}
                </h4>

                <p className={`text-xs font-sans mt-1 leading-relaxed whitespace-pre-line ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                  {ann.content}
                </p>

                <div className={`flex items-center justify-between text-[10px] mt-2.5 pt-1 border-t ${
                  theme === "dark" ? "border-slate-850/40 text-slate-400" : "border-slate-900/5 text-slate-500"
                }`}>
                  <span className={`flex items-center gap-1 font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    <User className={`w-3 h-3 ${theme === "dark" ? "text-amber-400" : "text-amber-800/50"}`} />
                    <span>{ann.author}</span>
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className={`w-3 h-3 ${theme === "dark" ? "text-amber-400" : "text-amber-800/50"}`} />
                    <span>{ann.date}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
