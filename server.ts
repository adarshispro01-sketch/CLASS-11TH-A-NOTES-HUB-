import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up body parsers with generous limits to support rich-text notes and image/PDF file attachments
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Shared folder for database storage
const DATA_DIR = path.join(process.cwd(), "data");
const NOTES_PATH = path.join(DATA_DIR, "notes.json");
const ANNOUNCEMENTS_PATH = path.join(DATA_DIR, "announcements.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Lazy load Gemini Client to prevent crashing on boot if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Pre-populated study notes for Class 11th
const DEFAULT_NOTES = [
  {
    id: "note-1",
    title: "Kinematics: Projectile & Relative Motion",
    subject: "Physics",
    content: `# Physics - Kinematics Summary\n\n## Projectile Motion\nProjectile motion is a form of motion experienced by an object or particle (a projectile) that is thrown near the Earth's surface and moves along a curved path under the action of gravity only.\n\n### Key Formulas:\n1. **Time of Flight (T):** \n   $$T = \\frac{2u \\sin\\theta}{g}$$\n2. **Horizontal Range (R):** \n   $$R = \\frac{u^2 \\sin 2\\theta}{g}$$\n   *Range is maximum when $\\theta = 45^\\circ$*\n3. **Maximum Height (H):** \n   $$H = \\frac{u^2 \\sin^2\\theta}{2g}$$\n4. **Equation of Trajectory:**\n   $$y = x\\tan\\theta - \\frac{gx^2}{2u^2\\cos^2\\theta}$$\n\n## Relative Motion in 2D\n* **River-Boat Problems:**\n  * To cross the river in shortest time: Boat must head perpendicular to the river flow ($\\theta = 90^\\circ$). Time $t = d/v_b$.\n  * To cross the river in shortest path (zero drift): Boat must head at an angle $\\sin\\alpha = v_r/v_b$ upstream.\n* **Rain-Umbrella Problems:**\n  * Relative velocity of rain w.r.t. man: $\\vec{v}_{rm} = \\vec{v}_r - \\vec{v}_m$. Hold the umbrella in the direction of $\\vec{v}_{rm}$ to protect yourself.`,
    author: "Adarsh (Admin)",
    date: "2026-06-24",
    fileAttached: false
  },
  {
    id: "note-2",
    title: "Bohr's Atomic Model & Quantum Numbers",
    subject: "Chemistry",
    content: `# Chemistry - Structure of Atom\n\n## Bohr's Model of Hydrogen Atom\nNiels Bohr proposed a model for the hydrogen atom based on Planck's quantum theory.\n\n### Postulates:\n1. Electrons revolve around the nucleus in certain stable circular orbits without radiating energy.\n2. The angular momentum of the electron is quantized:\n   $$mvr = n\\frac{h}{2\\pi}$$\n3. Energy is emitted or absorbed only when an electron jumps from one orbit to another:\n   $$\\Delta E = E_2 - E_1 = h\\nu$$\n\n### Radius and Energy:\n* **Radius of $n$-th orbit:** $r_n = 0.529 \\times \\frac{n^2}{Z}$ Å\n* **Energy of $n$-th orbit:** $E_n = -13.6 \\times \\frac{Z^2}{n^2}$ eV\n\n## Quantum Numbers\nQuantum numbers describe the state, energy, and orientation of orbitals and electrons:\n1. **Principal Quantum Number ($n$):** Determines size and energy of shell ($n = 1, 2, 3...$).\n2. **Azimuthal Quantum Number ($l$):** Determines shape of orbital ($l = 0$ to $n-1$).\n   * $l=0$ (s), $l=1$ (p), $l=2$ (d), $l=3$ (f).\n3. **Magnetic Quantum Number ($m_l$):** Determines spatial orientation ($m_l = -l$ to $+l$).\n4. **Spin Quantum Number ($m_s$):** Specifies spin direction ($+1/2$ or $-1/2$).`,
    author: "Sanya S.",
    date: "2026-06-23",
    fileAttached: false
  },
  {
    id: "note-3",
    title: "Sets, Relations & Venn Diagrams",
    subject: "Mathematics",
    content: `# Mathematics - Sets & Relations\n\n## Sets Definition\nA set is a well-defined collection of distinct objects. \n\n### Representation:\n1. **Roster / Tabular Form:** List elements inside curly braces, e.g., $A = \\{1, 2, 3, 4, 5\\}$.\n2. **Set-Builder Form:** State the properties characterizing the elements, e.g., $A = \\{x : x \\in \\mathbb{N} \\text{ and } x < 6\\}$.\n\n### Important Formulas (Union & Intersection):\nFor any two finite sets $A$ and $B$:\n* $n(A \\cup B) = n(A) + n(B) - n(A \\cap B)$\n\nFor three finite sets $A$, $B$ and $C$:\n* $n(A \\cup B \\cup C) = n(A) + n(B) + n(C) - n(A \\cap B) - n(B \\cap C) - n(A \\cap C) + n(A \\cap B \\cap C)$\n\n## Relations\n* A relation $R$ from set $A$ to set $B$ is a subset of the Cartesian product $A \\times B$.\n* **Domain:** Set of first coordinates of ordered pairs in $R$.\n* **Range:** Set of second coordinates of ordered pairs in $R$.\n* **Codomain:** The whole set $B$.`,
    author: "Rahul K.",
    date: "2026-06-22",
    fileAttached: false
  },
  {
    id: "note-4",
    title: "Python Flow Control and Loops Guide",
    subject: "Computer Science",
    content: `# Computer Science - Python Basics\n\n## Conditional Statements\nConditional structures in Python execute different blocks of code based on conditions.\n\n\`\`\`python\nscore = 85\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelse:\n    grade = "C"\nprint(f"Your grade is: {grade}")\n\`\`\`\n\n## Iteration / Loops\n\n### 1. The \`while\` Loop\nRepeats a block of code as long as a condition is true.\n\`\`\`python\ncount = 1\nwhile count <= 5:\n    print(f"Iteration {count}")\n    count += 1\n\`\`\`\n\n### 2. The \`for\` Loop\nIterates over a sequence (list, tuple, string, or range).\n\`\`\`python\n# Iterating from 0 to 4\nfor i in range(5):\n    print(i)\n\n# Iterating through a list\nsubjects = ["Physics", "Chemistry", "Maths"]\nfor sub in subjects:\n    print(f"Studying {sub}")\n\`\`\`\n\n### Loop Control:\n* \`break\`: Terminates the loop prematurely.\n* \`continue\`: Skips the current iteration and moves to the next.\n* \`pass\`: Placeholder statement (does nothing).`,
    author: "Priyan Patel",
    date: "2026-06-20",
    fileAttached: false
  },
  {
    id: "note-5",
    title: "The Portrait of a Lady - Key Themes",
    subject: "English",
    content: `# English Literature - The Portrait of a Lady\n**Author:** Khushwant Singh\n\n## Summary Overview\n"The Portrait of a Lady" is an autobiographical pen-portrait of the author's grandmother. It traces the beautiful relationship between the grandmother and her grandson as it goes through several developmental phases.\n\n## Phases of Their Relationship\n\n1. **Phase 1: Village Life**\n   * Complete companionship. She wakes him up, prepares his wooden slate, and accompanies him to school adjacent to the temple.\n2. **Phase 2: City Life (Turning Point)**\n   * They shift to the city. The author joins an English school and goes by motor bus. She can no longer help him with lessons (Science, English, Music). They see less of each other, creating a silent rift.\n3. **Phase 3: University Days**\n   * The author is given a separate room. The final link of their friendship is snapped. She accepts her seclusion with resignation and spends time spinning wheel and feeding sparrows.\n\n## Core Themes\n* **Generation Gap & Seclusion:** The shifting dynamics of family bonds when moving into urban modernity.\n* **The Beauty of Unspoken Affection:** The deep spiritual love expressed through quiet prayer and devotion.\n* **Animal Connection:** The grandmother's relationship with dogs in the village and sparrows in the city, showing her kind soul.`,
    author: "Anjali Gupta",
    date: "2026-06-18",
    fileAttached: false
  }
];

// Pre-populated announcements
const DEFAULT_ANNOUNCEMENTS = [
  {
    id: "announce-1",
    title: "Physics Syllabus for Unit Test 1",
    content: "Hi Class, the syllabus for Physics Unit Test 1 (July 10th) is: Dimensional Analysis, Vectors, and 1D Kinematics. Refer to notes shared in the folder!",
    date: "2026-06-24",
    tag: "Exam",
    author: "Physics Monitor"
  },
  {
    id: "announce-2",
    title: "Chemistry Lab Notebooks Submission",
    content: "All Chemistry lab practical files must be neat, indexed, and signed. Submission deadline is this Friday by 12:00 PM in the science staff room.",
    date: "2026-06-23",
    tag: "Submission",
    author: "Sanya S."
  },
  {
    id: "announce-3",
    title: "Maths Group Study: Trigonometry Session",
    content: "Since many of us are struggling with trigonometric identities, we're holding a group study session on Wednesday after class (3 PM) in Room 12. Let's solve previous questions together!",
    date: "2026-06-22",
    tag: "Study Group",
    author: "Rahul K."
  }
];

// Helper to load/save JSON data
function loadData(filePath: string, defaultData: any) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Error reading ${filePath}, restoring defaults.`, error);
    return defaultData;
  }
}

function saveData(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving ${filePath}`, error);
  }
}

// REST API endpoints

// Middleware to authorize only Adarsh (adarshispro01@gmail.com) for mutative actions
const requireAdarsh = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userEmail = req.headers["x-user-email"] || req.body.userEmail;
  if (userEmail !== "adarshispro01@gmail.com") {
    return res.status(403).json({
      error: "Access Denied. Only Adarsh (adarshispro01@gmail.com) is authorized to make changes to this hub."
    });
  }
  next();
};

// --- NOTES ---
app.get("/api/notes", (req, res) => {
  const notes = loadData(NOTES_PATH, DEFAULT_NOTES);
  res.json(notes);
});

app.post("/api/notes", (req, res) => {
  try {
    const { title, subject, content, author, fileAttached, fileDataUrl, fileName } = req.body;
    if (!title || !subject || !content) {
      return res.status(400).json({ error: "Missing required fields: title, subject, content" });
    }

    const notes = loadData(NOTES_PATH, DEFAULT_NOTES);
    const newNote = {
      id: "note-" + Date.now(),
      title,
      subject,
      content,
      author: author || "Anonymous",
      date: new Date().toISOString().split("T")[0],
      fileAttached: !!fileAttached,
      fileDataUrl: fileDataUrl || undefined,
      fileName: fileName || undefined
    };

    notes.unshift(newNote); // Put newest note first
    saveData(NOTES_PATH, notes);
    res.status(201).json(newNote);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notes/:id", requireAdarsh, (req, res) => {
  try {
    const { id } = req.params;
    let notes = loadData(NOTES_PATH, DEFAULT_NOTES);
    const initialLen = notes.length;
    notes = notes.filter((n: any) => n.id !== id);
    
    if (notes.length === initialLen) {
      return res.status(404).json({ error: "Note not found" });
    }

    saveData(NOTES_PATH, notes);
    res.json({ success: true, message: "Note deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- ANNOUNCEMENTS ---
app.get("/api/announcements", (req, res) => {
  const announcements = loadData(ANNOUNCEMENTS_PATH, DEFAULT_ANNOUNCEMENTS);
  res.json(announcements);
});

app.post("/api/announcements", requireAdarsh, (req, res) => {
  try {
    const { title, content, tag, author } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Missing required fields: title, content" });
    }

    const announcements = loadData(ANNOUNCEMENTS_PATH, DEFAULT_ANNOUNCEMENTS);
    const newAnn = {
      id: "announce-" + Date.now(),
      title,
      content,
      tag: tag || "General",
      author: author || "Anonymous",
      date: new Date().toISOString().split("T")[0]
    };

    announcements.unshift(newAnn);
    saveData(ANNOUNCEMENTS_PATH, announcements);
    res.status(201).json(newAnn);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/announcements/:id", requireAdarsh, (req, res) => {
  try {
    const { id } = req.params;
    let announcements = loadData(ANNOUNCEMENTS_PATH, DEFAULT_ANNOUNCEMENTS);
    const initialLen = announcements.length;
    announcements = announcements.filter((a: any) => a.id !== id);

    if (announcements.length === initialLen) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    saveData(ANNOUNCEMENTS_PATH, announcements);
    res.json({ success: true, message: "Announcement deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SYSTEM CONFIG ---
const CONFIG_PATH = path.join(DATA_DIR, "config.json");
const DEFAULT_CONFIG = {
  pt1Date: "2026-07-20",
  pt2Date: "2026-09-15",
  pt3Date: "2026-12-10",
  boardExamDate: "2027-03-01"
};

app.get("/api/config", (req, res) => {
  const config = loadData(CONFIG_PATH, DEFAULT_CONFIG);
  res.json(config);
});

app.post("/api/config", requireAdarsh, (req, res) => {
  try {
    const { pt1Date, pt2Date, pt3Date, boardExamDate } = req.body;
    const config = loadData(CONFIG_PATH, DEFAULT_CONFIG);
    
    if (pt1Date) config.pt1Date = pt1Date;
    if (pt2Date) config.pt2Date = pt2Date;
    if (pt3Date) config.pt3Date = pt3Date;
    if (boardExamDate) config.boardExamDate = boardExamDate;
    
    saveData(CONFIG_PATH, config);
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- GEMINI SERVICES ---

// Route 1: Summarize Note content
app.post("/api/gemini/summarize", async (req, res) => {
  try {
    const { content, title, subject } = req.body;
    if (!content) {
      return res.status(400).json({ error: "No content provided to summarize." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API is currently not configured. Please add the GEMINI_API_KEY inside the Secrets menu."
      });
    }

    const prompt = `You are an expert study mentor for Indian high school Class 11th. Summarize the following study note perfectly.
The note title is: "${title || 'Untitled note'}" in the subject "${subject || 'General'}".

Generate a beautiful structured study guide in Markdown. Follow these guidelines:
1. Provide a "Quick Executive Summary" (2-3 sentences).
2. Generate "Core Key Concepts Explained" with bulleted points of the most essential theories or facts.
3. List 3-4 "Pro-Tips / Tricks to Remember" (like mnemonics, common mistakes, exam tips).
4. Do NOT use fancy external Markdown styling, just standard bold, bullet points, headers, and math formatting where appropriate. Ensure it is highly readable and direct.

Note content:
${content}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ summary: response.text });
  } catch (err: any) {
    console.error("Gemini Summarize Error:", err);
    res.status(500).json({ error: err.message || "An error occurred with Gemini." });
  }
});

// Route 2: Generate Quiz or Flashcards
app.post("/api/gemini/quiz", async (req, res) => {
  try {
    const { content, title, subject, mode } = req.body; // mode: "quiz" or "flashcards"
    if (!content) {
      return res.status(400).json({ error: "No content provided to generate quiz." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API is currently not configured. Please add the GEMINI_API_KEY inside the Secrets menu."
      });
    }

    const requestMode = mode || "quiz";

    let prompt = "";
    let responseSchema: any = {};

    if (requestMode === "quiz") {
      prompt = `Generate a 3-question multiple-choice quiz based on this study note.
The note title is: "${title || 'Untitled'}" (${subject || 'General'}).

Return ONLY a JSON list of questions. Do not write any markdown blocks. Each question must include the question text, exactly 4 distinct choices, the correct answer index (0-3), and a short explanation of why it is correct.

Note Content:
${content}`;

      responseSchema = {
        type: Type.ARRAY,
        description: "List of multiple-choice quiz questions",
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: "The text of the question" },
            choices: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Exactly four choices"
            },
            correctIndex: { type: Type.INTEGER, description: "Index of correct answer (0-3)" },
            explanation: { type: Type.STRING, description: "Short educational explanation of the answer" }
          },
          required: ["question", "choices", "correctIndex", "explanation"]
        }
      };
    } else {
      // flashcards
      prompt = `Generate 4 high-quality revision flashcards based on this study note.
The note title is: "${title || 'Untitled'}" (${subject || 'General'}).

Return ONLY a JSON list of flashcards. Do not write any markdown blocks. Each flashcard must have a "front" (a conceptual question, term, or formula name) and a "back" (the definition, explanation, or solved formula).

Note Content:
${content}`;

      responseSchema = {
        type: Type.ARRAY,
        description: "List of revision study flashcards",
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING, description: "The front of the flashcard (question, formula title, key term)" },
            back: { type: Type.STRING, description: "The back of the flashcard (answer, definition, simplified explanation)" }
          },
          required: ["front", "back"]
        }
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const parsedData = JSON.parse(response.text.trim());
    res.json({ data: parsedData });
  } catch (err: any) {
    console.error("Gemini Quiz Error:", err);
    res.status(500).json({ error: err.message || "An error occurred with Gemini." });
  }
});

// Setup development or production build flows
async function main() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Class 11th A Notes Hub backend running at http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
});
