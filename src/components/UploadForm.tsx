import React, { useState, useRef } from "react";
import { Upload, X, FileText, CheckCircle2, User, BookOpen, AlertCircle, Loader } from "lucide-react";
import { StudyNote } from "../types";

interface UploadFormProps {
  onAddNote: (note: {
    title: string;
    subject: StudyNote["subject"];
    content: string;
    author: string;
    fileAttached: boolean;
    fileDataUrl?: string;
    fileName?: string;
  }) => Promise<void>;
  currentUserEmail: string;
  theme: "dark" | "light";
}

const SUBJECT_OPTIONS: Array<StudyNote["subject"]> = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Computer Science",
  "English",
  "Datesheets",
  "General",
];

export default function UploadForm({ onAddNote, currentUserEmail, theme }: UploadFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<StudyNote["subject"]>("General");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File Upload States
  const [isDragActive, setIsDragActive] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    dataUrl: string;
    size: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse files and encode to Base64
  const handleFileProcess = (file: File) => {
    if (!file) return;

    // Check size limit (limit attachment size to 100MB to avoid overwhelming memory/disk)
    if (file.size > 100 * 1024 * 1024) {
      setError("File size exceeds 100MB limit. Please choose a smaller document.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const sizeStr =
        file.size > 1024 * 1024
          ? (file.size / (1024 * 1024)).toFixed(1) + " MB"
          : (file.size / 1024).toFixed(0) + " KB";

      setAttachedFile({
        name: file.name,
        dataUrl: reader.result as string,
        size: sizeStr,
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please provide a note title.");
      return;
    }
    if (!content.trim() && !attachedFile) {
      setError("Please write note content or upload an attachment study file.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddNote({
        title: title.trim(),
        subject,
        content: content.trim() || `Study materials uploaded inside attached file: ${attachedFile?.name}`,
        author: author.trim() || "Class 11th Student",
        fileAttached: !!attachedFile,
        fileDataUrl: attachedFile?.dataUrl,
        fileName: attachedFile?.name,
      });

      // Clear form
      setTitle("");
      setSubject("General");
      setAuthor("");
      setContent("");
      setAttachedFile(null);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to publish study note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="notes-uploader-card" className={`w-full border p-5 rounded-2xl shadow-sm transition-all duration-350 ${
      theme === "dark"
        ? "bg-slate-900/85 border-slate-800 text-white"
        : "bg-white border-amber-900/10 text-slate-900"
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-base font-bold font-serif flex items-center gap-2 ${
            theme === "dark" ? "text-slate-100" : "text-amber-950"
          }`}>
            <BookOpen className={`w-5 h-5 ${theme === "dark" ? "text-amber-400" : "text-amber-900"}`} />
            <span>Upload & Publish Study Notes</span>
          </h2>
          <p className={`text-xs font-sans mt-0.5 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}>
            Share physics derivations, chemistry diagrams, computer science code, or literature guides with your class.
          </p>
        </div>
        <button
          id="toggle-upload-drawer-btn"
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 ${
            isOpen
              ? theme === "dark" ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" : "bg-slate-900 hover:bg-slate-800 text-white"
              : theme === "dark" ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold" : "bg-amber-800 hover:bg-amber-900 text-white"
          }`}
        >
          {isOpen ? "Close Editor" : "Compose Note"}
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className={`mt-5 pt-5 border-t space-y-4 ${
          theme === "dark" ? "border-slate-800" : "border-slate-100"
        }`}>
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={`text-xs font-semibold block mb-1 ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}>
                Note Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Laws of Thermodynamics, Trigonometry Identities, Python File Handling..."
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full text-xs p-3 rounded-xl focus:outline-none transition-colors ${
                  theme === "dark"
                    ? "bg-slate-950 border-slate-800 text-white focus:border-amber-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-800 focus:bg-white"
                }`}
              />
            </div>

            <div>
              <label className={`text-xs font-semibold block mb-1 ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}>
                Subject Board <span className="text-rose-500">*</span>
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as StudyNote["subject"])}
                className={`w-full text-xs p-3 rounded-xl focus:outline-none transition-colors ${
                  theme === "dark"
                    ? "bg-slate-950 border-slate-800 text-white focus:border-amber-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-800 focus:bg-white"
                }`}
              >
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub} value={sub} className={theme === "dark" ? "bg-slate-950 text-white" : ""}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={`text-xs font-semibold block mb-1 ${
              theme === "dark" ? "text-slate-300" : "text-slate-700"
            }`}>
              Author Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="e.g. Adarsh (Admin), Sanya S. (optional)"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className={`w-full text-xs pl-10 pr-4 py-3 rounded-xl focus:outline-none transition-colors ${
                  theme === "dark"
                    ? "bg-slate-950 border-slate-800 text-white focus:border-amber-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-800 focus:bg-white"
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`text-xs font-semibold block mb-1 flex items-center justify-between ${
              theme === "dark" ? "text-slate-300" : "text-slate-700"
            }`}>
              <span>Write Notes Content (Supports Markdown headers & list styling)</span>
              <span className="text-[10px] text-slate-400 font-mono">Use standard heading lines e.g. # Topic</span>
            </label>
            {/* Rule-lined paper style notes content area */}
            <div className={`relative border rounded-xl overflow-hidden shadow-inner ${
              theme === "dark" ? "border-slate-800 bg-slate-950" : "border-amber-900/10 bg-[#fdfcf7]"
            }`}>
              <div className={`absolute left-8 top-0 bottom-0 w-[1px] pointer-events-none ${
                theme === "dark" ? "bg-rose-950/40" : "bg-rose-200"
              }`} />
              <textarea
                placeholder="Type your study summary or notes here directly. You can use markdown titles, bullet points, and equations..."
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`w-full text-xs font-sans p-6 pl-12 bg-transparent focus:outline-none resize-y leading-6 ${
                  theme === "dark" ? "text-slate-100" : "text-slate-800"
                }`}
                style={{
                  backgroundImage: theme === "dark"
                    ? "linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)"
                    : "linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px)",
                  backgroundSize: "100% 24px",
                }}
              />
            </div>
          </div>

          {/* Usability-Complaint Drag & Drop File Upload Station */}
          <div>
            <label className={`text-xs font-semibold block mb-1 ${
              theme === "dark" ? "text-slate-300" : "text-slate-700"
            }`}>
              Attach Reference Document / File (PDF, Image, Text)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
              className="hidden"
            />

            {!attachedFile ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`w-full py-6 px-4 border-2 border-dashed rounded-xl cursor-pointer flex flex-col items-center justify-center transition-all ${
                  isDragActive
                    ? theme === "dark"
                      ? "border-amber-500 bg-slate-950"
                      : "border-amber-800 bg-amber-50"
                    : theme === "dark"
                      ? "border-slate-800 hover:border-amber-500 hover:bg-slate-950/40"
                      : "border-slate-300 hover:border-amber-800 hover:bg-amber-50/20"
                }`}
              >
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className={`text-xs font-semibold ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}>
                  Drag and drop your document file here, or <span className={theme === "dark" ? "text-amber-400 hover:underline" : "text-amber-800 hover:underline"}>browse</span>
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Supports PDF, PNG, JPG, Text files up to 100MB
                </span>
              </div>
            ) : (
              <div className={`flex items-center justify-between p-3.5 border rounded-xl ${
                theme === "dark"
                  ? "bg-slate-950 border-slate-800"
                  : "bg-amber-50/50 border border-amber-200"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    theme === "dark" ? "bg-slate-900 text-amber-400" : "bg-amber-100 text-amber-900"
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-xs font-semibold truncate max-w-[200px] sm:max-w-md ${
                      theme === "dark" ? "text-slate-100" : "text-slate-900"
                    }`}>
                      {attachedFile.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {attachedFile.size} • Attached ready to save
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`text-xs px-4 py-2 rounded-xl border transition-colors ${
                theme === "dark"
                  ? "text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-950"
                  : "text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`text-xs font-semibold px-5 py-2 rounded-xl shadow-sm flex items-center gap-2 transition-colors ${
                theme === "dark"
                  ? "bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-bold"
                  : "bg-amber-800 hover:bg-amber-900 disabled:bg-slate-300 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Publishing Note...</span>
                </>
              ) : (
                <span>Publish Study Note</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
