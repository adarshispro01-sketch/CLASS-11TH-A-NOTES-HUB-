import { BookOpen, FileText, Compass, Code, PenTool, Hash } from "lucide-react";
import { StudyNote } from "../types";

interface SubjectBindersProps {
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
  notes: StudyNote[];
}

const SUBJECTS_INFO = [
  {
    name: "General",
    label: "All Material",
    icon: Compass,
    spineColor: "bg-slate-700",
    coverColor: "from-slate-800 to-slate-900",
    accentColor: "text-slate-200",
    bgPattern: "bg-slate-50",
    borderColor: "border-slate-800",
  },
  {
    name: "Physics",
    label: "Physics",
    icon: Hash, // orbits/atom symbol alternative
    spineColor: "bg-indigo-800",
    coverColor: "from-indigo-700 to-indigo-900",
    accentColor: "text-indigo-200",
    bgPattern: "bg-indigo-50/50",
    borderColor: "border-indigo-800",
  },
  {
    name: "Chemistry",
    label: "Chemistry",
    icon: Compass, // beaker symbol alternative
    spineColor: "bg-emerald-800",
    coverColor: "from-emerald-700 to-emerald-900",
    accentColor: "text-emerald-200",
    bgPattern: "bg-emerald-50/50",
    borderColor: "border-emerald-800",
  },
  {
    name: "Mathematics",
    label: "Mathematics",
    icon: BookOpen, // math symbols
    spineColor: "bg-rose-800",
    coverColor: "from-rose-700 to-rose-900",
    accentColor: "text-rose-200",
    bgPattern: "bg-rose-50/50",
    borderColor: "border-rose-800",
  },
  {
    name: "Computer Science",
    label: "Computer Sci.",
    icon: Code,
    spineColor: "bg-zinc-800",
    coverColor: "from-zinc-700 to-zinc-900",
    accentColor: "text-zinc-200",
    bgPattern: "bg-zinc-50/50",
    borderColor: "border-zinc-800",
  },
  {
    name: "English",
    label: "English Lit.",
    icon: PenTool,
    spineColor: "bg-amber-800",
    coverColor: "from-amber-700 to-amber-900",
    accentColor: "text-amber-200",
    bgPattern: "bg-amber-50/50",
    borderColor: "border-amber-800",
  },
  {
    name: "Datesheets",
    label: "Datesheets",
    icon: FileText,
    spineColor: "bg-teal-800",
    coverColor: "from-teal-700 to-teal-900",
    accentColor: "text-teal-200",
    bgPattern: "bg-teal-50/50",
    borderColor: "border-teal-800",
  },
];

export default function SubjectBinders({
  selectedSubject,
  onSelectSubject,
  notes,
}: SubjectBindersProps) {
  return (
    <div id="subject-binders-shelf" className="w-full bg-[#fdfbf7] border border-amber-900/10 p-5 rounded-2xl shadow-sm relative overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-amber-900/10 to-transparent pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-widest">
          Study Binder Rack
        </h3>
        <span className="text-[10px] text-amber-900 font-serif font-bold">
          Class 11th Syllabus Binders
        </span>
      </div>

      {/* Grid of beautifully stylized physical spiral notebook binders */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {SUBJECTS_INFO.map((sub) => {
          const isSelected = selectedSubject === sub.name;
          const Icon = sub.icon;
          const count = sub.name === "General"
            ? notes.length
            : notes.filter((n) => n.subject === sub.name).length;

          return (
            <button
              id={`binder-${sub.name.toLowerCase().replace(/\s+/g, "-")}`}
              key={sub.name}
              onClick={() => onSelectSubject(sub.name)}
              className={`flex h-28 rounded-xl overflow-hidden text-left border relative transition-all duration-200 ${
                isSelected
                  ? `ring-2 ring-amber-800 shadow-md translate-y-[-4px] ${sub.borderColor}`
                  : `border-slate-200 hover:border-amber-900/20 hover:shadow-sm hover:translate-y-[-2px] bg-white`
              }`}
            >
              {/* Spine edge of binder */}
              <div className={`w-4 h-full shrink-0 flex flex-col justify-between items-center py-2 relative overflow-hidden ${sub.spineColor}`}>
                {/* Spiral binder notches */}
                <div className="absolute inset-y-0 right-[-1px] w-[2px] bg-black/15 flex flex-col justify-between py-1 pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1 bg-slate-300 rounded-full border border-black/20" />
                  ))}
                </div>
              </div>

              {/* Binder Cover */}
              <div className="flex-1 p-3.5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-white to-slate-50/25">
                {/* Visual binder tabs */}
                <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500/5 rounded-full translate-x-3 -translate-y-3 pointer-events-none" />

                <div>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-amber-800" : "text-slate-400"}`} />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-sans">
                      {sub.name === "General" ? "Folder" : "Binder"}
                    </span>
                  </div>
                  <h4 className="font-serif text-xs font-extrabold text-slate-900 leading-tight mt-1 truncate max-w-full">
                    {sub.label}
                  </h4>
                </div>

                <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Documents</span>
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {count}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
