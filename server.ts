import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, doc, setDoc, getDoc, deleteDoc, setLogLevel } from "firebase/firestore";

dotenv.config();

// Silence internal Firestore SDK logs to prevent stream cancellation notices from appearing as errors
setLogLevel("silent");

const app = express();
const PORT = 3000;

// Initialize Firebase
let firebaseApp: any = null;
let db: any = null;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    firebaseApp = initializeApp(firebaseConfig);
    db = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    }, firebaseConfig.firestoreDatabaseId || "(default)");
    console.log("Firebase initialized successfully with project", firebaseConfig.projectId);
  } else {
    console.warn("firebase-applet-config.json not found, using file-based storage fallback.");
  }
} catch (err) {
  console.error("Failed to initialize Firebase:", err);
}

// Set up body parsers with generous limits to support rich-text notes and image/PDF file attachments
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));

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

// Pre-populated system config
const DEFAULT_CONFIG = {
  pt1Date: "2026-07-20",
  pt2Date: "2026-09-15",
  pt3Date: "2026-12-10",
  boardExamDate: "2027-03-01"
};

// Seeding Firestore database if empty to avoid empty application on first boot
async function seedFirebase() {
  if (!db) return;
  try {
    console.log("Verifying connection and permission to Firestore...");
    const notesCol = collection(db, "notes");
    
    // Quick getDocs query with a generous timeout to prevent startup hangs during container cold starts
    const notesSnapPromise = getDocs(notesCol);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore connection timed out")), 20000)
    );
    
    const notesSnap = await Promise.race([notesSnapPromise, timeoutPromise]) as any;
    console.log("Firestore connection verified successfully. Serving from cloud database.");

    if (notesSnap.empty) {
      console.log("Seeding default notes into Firestore...");
      for (const note of DEFAULT_NOTES) {
        await setDoc(doc(notesCol, note.id), note);
      }
    }

    const announceCol = collection(db, "announcements");
    const announceSnap = await getDocs(announceCol);
    if (announceSnap.empty) {
      console.log("Seeding default announcements into Firestore...");
      for (const announce of DEFAULT_ANNOUNCEMENTS) {
        await setDoc(doc(announceCol, announce.id), announce);
      }
    }

    const configDocRef = doc(db, "config", "system-config");
    const configSnap = await getDoc(configDocRef);
    if (!configSnap.exists()) {
      console.log("Seeding default config into Firestore...");
      await setDoc(configDocRef, DEFAULT_CONFIG);
    }
    console.log("Firebase seeding check complete.");
  } catch (err: any) {
    console.warn("Firestore database is inaccessible or locked (Permission Denied).");
    console.warn("Falling back to local persistent JSON storage. Reason:", err.message);
    db = null; // Disable Firestore, fallback to local storage
  }
}

// Start seeding
seedFirebase();

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

app.get("/api/test-db-state", (req, res) => {
  res.json({
    dbIsNull: db === null,
    firebaseAppIsNull: firebaseApp === null
  });
});

// Middleware to authorize only Adarsh (adarshispro01@gmail.com) for mutative actions
const requireAdarsh = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userEmail = req.headers["x-user-email"] || req.body.userEmail;
  if (userEmail !== "adarshispro01@gmail.com") {
    return res.status(403).json({
      error: "Access Denied. Only Adarsh (Admin) is authorized to make changes to this hub."
    });
  }
  next();
};

// --- NOTES ---
app.get("/api/notes", async (req, res) => {
  try {
    if (db) {
      try {
        const colRef = collection(db, "notes");
        const snapshot = await getDocs(colRef);
        const notes: any[] = [];
        
        for (const d of snapshot.docs) {
          const noteData = d.data();
          // We intentionally do NOT fetch file attachment chunks in the main list
          // to keep the list lightweight and ultra-fast.
          if (noteData.fileDataUrl) {
            delete noteData.fileDataUrl;
          }
          notes.push(noteData);
        }
        
        // Sort notes so newest is first
        notes.sort((a, b) => b.id.localeCompare(a.id));
        return res.json(notes);
      } catch (firestoreErr: any) {
        console.warn("Firestore GET /api/notes failed, falling back to local JSON:", firestoreErr.message);
        const notes = loadData(NOTES_PATH, DEFAULT_NOTES).map(({ fileDataUrl, ...rest }: any) => rest);
        return res.json(notes);
      }
    } else {
      const notes = loadData(NOTES_PATH, DEFAULT_NOTES).map(({ fileDataUrl, ...rest }: any) => rest);
      return res.json(notes);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch a single note's file attachment on demand to bypass Firestore/Proxy payload limits
app.get("/api/notes/:id/attachment", async (req, res) => {
  try {
    const { id } = req.params;
    if (db) {
      try {
        const docRef = doc(db, "notes", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          return res.status(404).json({ error: "Note not found" });
        }
        const noteData = docSnap.data();
        if (!noteData.fileAttached) {
          return res.status(400).json({ error: "Note does not have a file attachment" });
        }

        // Fetch chunks and reconstruct the fileDataUrl
        const chunksCol = collection(db, "notes", id, "chunks");
        const chunksSnap = await getDocs(chunksCol);
        const chunksList: any[] = [];
        chunksSnap.forEach((cDoc) => {
          chunksList.push(cDoc.data());
        });
        chunksList.sort((a, b) => a.index - b.index);
        const fileDataUrl = chunksList.map((c) => c.data).join("");
        return res.json({ fileDataUrl });
      } catch (firestoreErr: any) {
        console.warn(`Firestore GET /api/notes/${id}/attachment failed, falling back to local:`, firestoreErr.message);
        const notes = loadData(NOTES_PATH, DEFAULT_NOTES);
        const note = notes.find((n: any) => n.id === id);
        if (!note) {
          return res.status(404).json({ error: "Note not found" });
        }
        return res.json({ fileDataUrl: note.fileDataUrl || "" });
      }
    } else {
      const notes = loadData(NOTES_PATH, DEFAULT_NOTES);
      const note = notes.find((n: any) => n.id === id);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }
      return res.json({ fileDataUrl: note.fileDataUrl || "" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notes", async (req, res) => {
  try {
    const { title, subject, content, author, fileAttached, fileDataUrl, fileName } = req.body;
    if (!title || !subject || !content) {
      return res.status(400).json({ error: "Missing required fields: title, subject, content" });
    }

    const noteId = "note-" + Date.now();
    
    // Split the fileDataUrl into chunks to bypass Firestore's 1MB document limit
    const chunks: string[] = [];
    if (fileAttached && fileDataUrl) {
      const chunkSize = 800000; // ~800KB chunk size
      for (let i = 0; i < fileDataUrl.length; i += chunkSize) {
        chunks.push(fileDataUrl.substring(i, i + chunkSize));
      }
    }

    const newNote: any = {
      id: noteId,
      title,
      subject,
      content,
      author: author || "Anonymous",
      date: new Date().toISOString().split("T")[0],
      fileAttached: !!fileAttached,
      fileName: fileName || undefined,
      // Store the fileDataUrl in the note object ONLY if there are no chunks (or if local storage is used)
      fileDataUrl: db ? undefined : (fileDataUrl || undefined)
    };

    if (db) {
      try {
        // 1. Save the note metadata (without fileDataUrl to keep it small and safe from 1MB limit)
        await setDoc(doc(db, "notes", noteId), newNote);
        
        // 2. Save each chunk to the subcollection
        for (let idx = 0; idx < chunks.length; idx++) {
          await setDoc(doc(db, "notes", noteId, "chunks", `chunk-${idx}`), {
            index: idx,
            data: chunks[idx]
          });
        }

        // Return the full object to the client so the UI immediately has the data URL
        const returnNote = { ...newNote, fileDataUrl: fileDataUrl || undefined };
        return res.status(201).json(returnNote);
      } catch (firestoreErr: any) {
        fs.writeFileSync(path.join(process.cwd(), "firestore-error.log"), `${firestoreErr.message}\n${firestoreErr.stack}\n`);
        console.warn("Firestore POST /api/notes failed, falling back to local storage:", firestoreErr.message);
        const notes = loadData(NOTES_PATH, DEFAULT_NOTES);
        const noteToSave = { ...newNote, fileDataUrl: fileDataUrl || undefined };
        notes.unshift(noteToSave);
        saveData(NOTES_PATH, notes);
        return res.status(201).json(noteToSave);
      }
    } else {
      const notes = loadData(NOTES_PATH, DEFAULT_NOTES);
      const noteToSave = { ...newNote, fileDataUrl: fileDataUrl || undefined };
      notes.unshift(noteToSave);
      saveData(NOTES_PATH, notes);
      return res.status(201).json(noteToSave);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notes/:id", requireAdarsh, async (req, res) => {
  try {
    const { id } = req.params;

    if (db) {
      try {
        const docRef = doc(db, "notes", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          return res.status(404).json({ error: "Note not found" });
        }

        // Delete chunks if any exist to clean up space
        try {
          const chunksCol = collection(db, "notes", id, "chunks");
          const chunksSnap = await getDocs(chunksCol);
          for (const chunkDoc of chunksSnap.docs) {
            await deleteDoc(chunkDoc.ref);
          }
        } catch (chunkErr) {
          console.error(`Failed to clean up chunks for deleted note ${id}:`, chunkErr);
        }

        await deleteDoc(docRef);
        return res.json({ success: true, message: "Note deleted successfully" });
      } catch (firestoreErr: any) {
        console.warn("Firestore DELETE /api/notes failed, falling back to local storage:", firestoreErr.message);
        let notes = loadData(NOTES_PATH, DEFAULT_NOTES);
        const initialLen = notes.length;
        notes = notes.filter((n: any) => n.id !== id);
        if (notes.length === initialLen) {
          return res.status(404).json({ error: "Note not found" });
        }
        saveData(NOTES_PATH, notes);
        return res.json({ success: true, message: "Note deleted successfully" });
      }
    } else {
      let notes = loadData(NOTES_PATH, DEFAULT_NOTES);
      const initialLen = notes.length;
      notes = notes.filter((n: any) => n.id !== id);
      if (notes.length === initialLen) {
        return res.status(404).json({ error: "Note not found" });
      }
      saveData(NOTES_PATH, notes);
      return res.json({ success: true, message: "Note deleted successfully" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- ANNOUNCEMENTS ---
app.get("/api/announcements", async (req, res) => {
  try {
    if (db) {
      try {
        const colRef = collection(db, "announcements");
        const snapshot = await getDocs(colRef);
        const announcements: any[] = [];
        snapshot.forEach((d) => {
          announcements.push(d.data());
        });
        announcements.sort((a, b) => b.id.localeCompare(a.id));
        return res.json(announcements);
      } catch (firestoreErr: any) {
        console.warn("Firestore GET /api/announcements failed, falling back to local storage:", firestoreErr.message);
        const announcements = loadData(ANNOUNCEMENTS_PATH, DEFAULT_ANNOUNCEMENTS);
        return res.json(announcements);
      }
    } else {
      const announcements = loadData(ANNOUNCEMENTS_PATH, DEFAULT_ANNOUNCEMENTS);
      return res.json(announcements);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/announcements", requireAdarsh, async (req, res) => {
  try {
    const { title, content, tag, author } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Missing required fields: title, content" });
    }

    const announceId = "announce-" + Date.now();
    const newAnn = {
      id: announceId,
      title,
      content,
      tag: tag || "General",
      author: author || "Anonymous",
      date: new Date().toISOString().split("T")[0]
    };

    if (db) {
      try {
        await setDoc(doc(db, "announcements", announceId), newAnn);
        return res.status(201).json(newAnn);
      } catch (firestoreErr: any) {
        console.warn("Firestore POST /api/announcements failed, falling back to local storage:", firestoreErr.message);
        const announcements = loadData(ANNOUNCEMENTS_PATH, DEFAULT_ANNOUNCEMENTS);
        announcements.unshift(newAnn);
        saveData(ANNOUNCEMENTS_PATH, announcements);
        return res.status(201).json(newAnn);
      }
    } else {
      const announcements = loadData(ANNOUNCEMENTS_PATH, DEFAULT_ANNOUNCEMENTS);
      announcements.unshift(newAnn);
      saveData(ANNOUNCEMENTS_PATH, announcements);
      return res.status(201).json(newAnn);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/announcements/:id", requireAdarsh, async (req, res) => {
  try {
    const { id } = req.params;

    if (db) {
      try {
        const docRef = doc(db, "announcements", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          return res.status(404).json({ error: "Announcement not found" });
        }
        await deleteDoc(docRef);
        return res.json({ success: true, message: "Announcement deleted successfully" });
      } catch (firestoreErr: any) {
        console.warn("Firestore DELETE /api/announcements failed, falling back to local storage:", firestoreErr.message);
        let announcements = loadData(ANNOUNCEMENTS_PATH, DEFAULT_ANNOUNCEMENTS);
        const initialLen = announcements.length;
        announcements = announcements.filter((a: any) => a.id !== id);

        if (announcements.length === initialLen) {
          return res.status(404).json({ error: "Announcement not found" });
        }

        saveData(ANNOUNCEMENTS_PATH, announcements);
        return res.json({ success: true, message: "Announcement deleted successfully" });
      }
    } else {
      let announcements = loadData(ANNOUNCEMENTS_PATH, DEFAULT_ANNOUNCEMENTS);
      const initialLen = announcements.length;
      announcements = announcements.filter((a: any) => a.id !== id);

      if (announcements.length === initialLen) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      saveData(ANNOUNCEMENTS_PATH, announcements);
      return res.json({ success: true, message: "Announcement deleted successfully" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SYSTEM CONFIG ---
const CONFIG_PATH = path.join(DATA_DIR, "config.json");

app.get("/api/config", async (req, res) => {
  try {
    if (db) {
      try {
        const docRef = doc(db, "config", "system-config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return res.json(docSnap.data());
        } else {
          await setDoc(docRef, DEFAULT_CONFIG);
          return res.json(DEFAULT_CONFIG);
        }
      } catch (firestoreErr: any) {
        console.warn("Firestore GET /api/config failed, falling back to local storage:", firestoreErr.message);
        const config = loadData(CONFIG_PATH, DEFAULT_CONFIG);
        return res.json(config);
      }
    } else {
      const config = loadData(CONFIG_PATH, DEFAULT_CONFIG);
      return res.json(config);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/config", requireAdarsh, async (req, res) => {
  try {
    const { pt1Date, pt2Date, pt3Date, boardExamDate } = req.body;
    
    if (db) {
      try {
        const docRef = doc(db, "config", "system-config");
        const docSnap = await getDoc(docRef);
        const config = docSnap.exists() ? docSnap.data() : { ...DEFAULT_CONFIG };

        if (pt1Date) config.pt1Date = pt1Date;
        if (pt2Date) config.pt2Date = pt2Date;
        if (pt3Date) config.pt3Date = pt3Date;
        if (boardExamDate) config.boardExamDate = boardExamDate;

        await setDoc(docRef, config);
        return res.json({ success: true, config });
      } catch (firestoreErr: any) {
        console.warn("Firestore POST /api/config failed, falling back to local storage:", firestoreErr.message);
        const config = loadData(CONFIG_PATH, DEFAULT_CONFIG);
        if (pt1Date) config.pt1Date = pt1Date;
        if (pt2Date) config.pt2Date = pt2Date;
        if (pt3Date) config.pt3Date = pt3Date;
        if (boardExamDate) config.boardExamDate = boardExamDate;
        saveData(CONFIG_PATH, config);
        return res.json({ success: true, config });
      }
    } else {
      const config = loadData(CONFIG_PATH, DEFAULT_CONFIG);
      if (pt1Date) config.pt1Date = pt1Date;
      if (pt2Date) config.pt2Date = pt2Date;
      if (pt3Date) config.pt3Date = pt3Date;
      if (boardExamDate) config.boardExamDate = boardExamDate;
      saveData(CONFIG_PATH, config);
      return res.json({ success: true, config });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- GEMINI SERVICES ---

// Fallback study material and quizzes
const PREDEFINED_QUIZZES: Record<string, any[]> = {
  "note-1": [
    {
      question: "What angle of projection yields the maximum horizontal range for a projectile?",
      choices: ["30 degrees", "45 degrees", "60 degrees", "90 degrees"],
      correctIndex: 1,
      explanation: "The formula for horizontal range is R = (u^2 * sin(2*theta)) / g. sin(2*theta) is maximum and equals 1 when 2*theta = 90 degrees, i.e., theta = 45 degrees."
    },
    {
      question: "To cross a river in the shortest possible time, in which direction should the boat head?",
      choices: ["Perpendicular to the river flow", "At an angle upstream", "At an angle downstream", "Parallel to the river flow"],
      correctIndex: 0,
      explanation: "Shortest time is achieved when the boat heads perpendicular to the river flow, making t = d / v_b."
    },
    {
      question: "Which force acts on a projectile in motion under ideal conditions?",
      choices: ["Air resistance only", "Gravity only", "Both gravity and thrust", "Centripetal force"],
      correctIndex: 1,
      explanation: "By definition, projectile motion experiences only acceleration due to gravity acting vertically downwards."
    }
  ],
  "note-2": [
    {
      question: "What is the formula for the radius of the n-th orbit in Bohr's model of a hydrogen-like atom?",
      choices: ["0.529 * (n / Z) Å", "0.529 * (n^2 / Z) Å", "0.529 * (Z^2 / n) Å", "13.6 * (n^2 / Z^2) Å"],
      correctIndex: 1,
      explanation: "According to Bohr's model, the radius of the orbit is proportional to n^2 and inversely proportional to the atomic number Z."
    },
    {
      question: "Which quantum number determines the shape of an electron's orbital?",
      choices: ["Principal quantum number (n)", "Azimuthal quantum number (l)", "Magnetic quantum number (ml)", "Spin quantum number (ms)"],
      correctIndex: 1,
      explanation: "The Azimuthal (or orbital angular momentum) quantum number l determines the subshell and shape (s, p, d, f) of the orbital."
    },
    {
      question: "What are the allowed values for the magnetic quantum number (ml) for a given value of l?",
      choices: ["0 to n-1", "-l to +l", "1/2 and -1/2", "n^2 values"],
      correctIndex: 1,
      explanation: "The magnetic quantum number ml describes the spatial orientation of the orbital and can take any integer value from -l to +l."
    }
  ],
  "note-3": [
    {
      question: "If Set A has 3 elements and Set B has 4 elements, what is the maximum number of elements in A union B?",
      choices: ["3", "4", "7", "12"],
      correctIndex: 2,
      explanation: "The maximum number of elements in the union occurs when A and B are disjoint, so n(A union B) = n(A) + n(B) = 3 + 4 = 7."
    },
    {
      question: "In Set-Builder notation, how would you write the set of even natural numbers less than 10?",
      choices: ["{2, 4, 6, 8}", "{x : x is even and x < 10}", "{x : x ∈ N, x is even, and x < 10}", "{x ∈ N : x < 10}"],
      correctIndex: 2,
      explanation: "Set-builder notation must define both the domain (N) and the specific properties (even, less than 10)."
    },
    {
      question: "Which of the following defines a Relation from set A to set B?",
      choices: ["Any subset of A x B", "Only the Cartesian product A x B", "A function from A to B only", "Any subset of B x A"],
      correctIndex: 0,
      explanation: "A relation from A to B is defined mathematically as any subset of the Cartesian product A x B."
    }
  ],
  "note-4": [
    {
      question: "Which statement is used in Python to skip the rest of the current iteration and move to the next iteration of a loop?",
      choices: ["break", "pass", "continue", "skip"],
      correctIndex: 2,
      explanation: "The 'continue' statement stops the current iteration of the loop and immediately goes to the start of the next iteration."
    },
    {
      question: "What is the output of range(5) in Python?",
      choices: ["1, 2, 3, 4, 5", "0, 1, 2, 3, 4", "0, 1, 2, 3, 4, 5", "1, 2, 3, 4"],
      correctIndex: 1,
      explanation: "The range(n) function generates a sequence of integers starting from 0 up to, but not including, n."
    },
    {
      question: "What is the purpose of the 'pass' statement in Python?",
      choices: ["To skip the entire loop", "As a placeholder indicating no action (null statement)", "To exit the function and return a value", "To handle exceptions"],
      correctIndex: 1,
      explanation: "'pass' is a null statement used as a placeholder when a statement is syntactically required but no code needs to be executed."
    }
  ],
  "note-5": [
    {
      question: "Who is the author of the autobiographical chapter 'The Portrait of a Lady'?",
      choices: ["Khushwant Singh", "Ruskin Bond", "Rabindranath Tagore", "Vikram Seth"],
      correctIndex: 0,
      explanation: "'The Portrait of a Lady' is written by the famous Indian author Khushwant Singh about his grandmother."
    },
    {
      question: "What was the turning point in the relationship between the author and his grandmother?",
      choices: ["When the author went to university", "When they shifted to the city", "When the grandmother fell ill", "When the author went abroad"],
      correctIndex: 1,
      explanation: "Shifting to the city was the turning point because they began to see less of each other, and the grandmother could no longer help with his English school lessons."
    },
    {
      question: "How did the grandmother spend her afternoon hours in the city?",
      choices: ["Reading religious scriptures", "Feeding sparrows and spinning the wheel", "Talking to neighbors", "Helping the author with his studies"],
      correctIndex: 1,
      explanation: "In the city, she accepted her seclusion and spent her time spinning the wheel and feeding hundreds of sparrows in the courtyard."
    }
  ]
};

const PREDEFINED_FLASHCARDS: Record<string, any[]> = {
  "note-1": [
    { front: "Horizontal Range Formula", back: "R = (u^2 * sin(2*theta)) / g" },
    { front: "Time of Flight Formula", back: "T = (2 * u * sin(theta)) / g" },
    { front: "Equation of Trajectory", back: "y = x * tan(theta) - (g * x^2) / (2 * u^2 * cos^2(theta))" },
    { front: "Shortest Path River Crossing", back: "Head at an angle upstream such that sin(alpha) = v_r / v_b." }
  ],
  "note-2": [
    { front: "Energy of n-th orbit (Bohr's Model)", back: "E_n = -13.6 * (Z^2 / n^2) eV" },
    { front: "Quantization of Angular Momentum", back: "mvr = n * h / (2 * pi)" },
    { front: "Principal Quantum Number (n)", back: "Specifies the shell number, principal energy level, and size of the shell." },
    { front: "Azimuthal Quantum Number (l) values for p-orbital", back: "l = 1 corresponds to a p-orbital subshell (dumbbell shape)." }
  ],
  "note-3": [
    { front: "n(A ∪ B) Formula", back: "n(A ∪ B) = n(A) + n(B) - n(A ∩ B)" },
    { front: "Relation Domain", back: "The set of all first elements in the ordered pairs of the relation." },
    { front: "Roster Form", back: "A form where all elements of the set are explicitly listed inside curly brackets, separated by commas." },
    { front: "Relation Codomain", back: "The entire target set B, whereas the Range is a subset of the codomain." }
  ],
  "note-4": [
    { front: "Python break statement", back: "Terminates the loop prematurely and resumes execution at the next statement outside the loop." },
    { front: "Python range(start, stop, step)", back: "Generates numbers from 'start' to 'stop - 1' incremented by 'step'." },
    { front: "Conditionals", back: "if-elif-else blocks used to make decisions based on boolean evaluations." },
    { front: "while loop", back: "Repeats a block of code as long as a specified condition remains true." }
  ],
  "note-5": [
    { front: "Village Schooling Companion", back: "The grandmother accompanied him to school because it was attached to the temple, where she sat reading scriptures." },
    { front: "Snap of Friendship's Link", back: "Occurred when the author was given a separate room at University, ending their shared room companionship." },
    { front: "Grandmother's Last Hours", back: "She ignored everyone's protests, lay peacefully in bed praying, and counting her beads until her lips stopped moving." },
    { front: "Reaction of the Sparrows", back: "Thousands of sparrows sat silently around her corpse, took no notice of bread crumbs, and flew away quietly when her body was carried off." }
  ]
};

function generateFallbackSummary(content: string, title: string, subject: string): string {
  const lines = content.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  let firstSentence = "";
  let concepts: string[] = [];
  
  for (const line of lines) {
    if (!line.startsWith("#") && !line.startsWith("!") && !line.startsWith("-") && !line.startsWith("*")) {
      firstSentence = line;
      break;
    }
  }
  if (!firstSentence) firstSentence = `Review material covering essential theories of ${title || "this Class 11th topic"}.`;
  if (firstSentence.length > 180) {
    firstSentence = firstSentence.substring(0, 180) + "...";
  }

  for (const line of lines) {
    if (line.startsWith("##") || line.startsWith("###")) {
      const cleanHeader = line.replace(/^#+\s*/, "");
      concepts.push(`**${cleanHeader}**: Standard curriculum subsection containing core concepts.`);
    } else {
      const boldMatch = line.match(/\*\*(.*?)\*\*/);
      if (boldMatch && boldMatch[1] && concepts.length < 5) {
        const desc = line.replace(/\*\*(.*?)\*\*/, "").replace(/^[-*+\s]*/, "").trim();
        concepts.push(`**${boldMatch[1]}**: ${desc || "Key definition outlining central curriculum rules."}`);
      }
    }
  }

  if (concepts.length === 0) {
    concepts.push(`**Foundational Theories**: Covers core syllabus parameters of ${title || subject}.`);
    concepts.push(`**Methodology & Numerical Application**: Formulas and numerical review.`);
    concepts.push(`**Terminology Definition**: Establishes high scoring responses for board exams.`);
  }

  return `# Class 11th Study Mentor Guide: ${title}

## Quick Executive Summary
${firstSentence} This guide outlines the key concepts and revision points for ${title} to assist with your preparations.

## Core Key Concepts Explained
${concepts.slice(0, 5).map(c => `- ${c}`).join("\n")}

## Pro-Tips / Tricks to Remember
- **Pro-Tip**: Always write down formulas first before applying parameters to ensure step-marking.
- **Pro-Tip**: Double check units (e.g. converting calculations to standard SI formats).
- **Pro-Tip**: Use structured diagrams with neat label indicators to score maximum marks.

---
*Note: Due to temporary high demand on the Gemini AI Service, this revision guide was generated using our offline Smart Fallback Engine.*`;
}

function generateFallbackQuiz(content: string, title: string, subject: string): any[] {
  const words = content.replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 5);
  const terms = Array.from(new Set(words)).slice(0, 3);
  
  const t1 = terms[0] || "Foundational Theory";
  const t2 = terms[1] || "Core Formulae";
  const t3 = terms[2] || "Conceptual Context";

  return [
    {
      question: `What is the primary significance of "${t1}" as discussed in "${title}"?`,
      choices: [
        `It serves as a core conceptual framework within the material.`,
        `It is a minor historical reference with no practical usage.`,
        `It represents an external theory not covered in Class 11th.`,
        `It has been replaced by more modern terminology.`
      ],
      correctIndex: 0,
      explanation: `The material highlights "${t1}" as a cornerstone for understanding the topic of "${title}".`
    },
    {
      question: `Which of the following describes the role of "${t2}" in "${subject}"?`,
      choices: [
        `It is irrelevant to the overall subject matter.`,
        `It provides an analytical perspective or practical application of the concepts.`,
        `It is only used as an alternative name.`,
        `It has been disproven in practical exams.`
      ],
      correctIndex: 1,
      explanation: `"${t2}" plays a key role in the analytical and practical understanding of "${subject}".`
    },
    {
      question: `For studying "${title}", how is "${t3}" best integrated?`,
      choices: [
        `By understanding its definitions, contexts, and linkages with other ideas.`,
        `By completely bypassing it to save revision time.`,
        `By studying it in isolation without contextual references.`,
        `By memorizing its spelling without understanding its meaning.`
      ],
      correctIndex: 0,
      explanation: `An integrated study of "${t3}" improves overall performance and builds long-term retention.`
    }
  ];
}

function generateFallbackFlashcards(content: string, title: string, subject: string): any[] {
  const words = content.replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 5);
  const terms = Array.from(new Set(words)).slice(0, 2);
  
  const t1 = terms[0] || "Core Fundamentals";
  const t2 = terms[1] || "Key Application";

  return [
    {
      front: `Main Focus of ${title}`,
      back: `A foundational review of ${title} within ${subject}, outlining major facts and structures.`
    },
    {
      front: `Concept: ${t1}`,
      back: `A major theme in this note that is highly recommended for study and exam revision.`
    },
    {
      front: `Concept: ${t2}`,
      back: `An essential concept that supports the core theories presented in the study guide.`
    },
    {
      front: `Best Study Approach`,
      back: `Write down key equations, define terms clearly, and practice explaining the concepts in your own words.`
    }
  ];
}

// Route 1: Summarize Note content
app.post("/api/gemini/summarize", async (req, res) => {
  try {
    const { content, title, subject } = req.body;
    if (!content) {
      return res.status(400).json({ error: "No content provided to summarize." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      const fallbackSummary = generateFallbackSummary(content, title, subject);
      return res.json({ 
        summary: fallbackSummary,
        warning: "Gemini API key is not configured. Displaying a smart local study guide instead!"
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

    let delay = 1000;
    let attempts = 2;
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });
        return res.json({ summary: response.text });
      } catch (err: any) {
        console.warn(`Gemini Summarize attempt ${i+1} failed:`, err.message || err);
        const isTransient = String(err).includes("503") || String(err).includes("429") || 
                            String(err).includes("UNAVAILABLE") || String(err).includes("ResourceExhausted") ||
                            err.status === 503 || err.status === 429;
        if (i < attempts - 1 && isTransient) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.info("Falling back to local summary generator due to Gemini API failure.");
          const fallbackSummary = generateFallbackSummary(content, title, subject);
          return res.json({ 
            summary: fallbackSummary, 
            warning: "Gemini AI is currently under high load. Displaying an instant smart local study guide instead!" 
          });
        }
      }
    }
  } catch (err: any) {
    console.error("Gemini Summarize Error:", err);
    res.status(500).json({ error: err.message || "An error occurred with Gemini." });
  }
});

// Route 2: Generate Quiz or Flashcards
app.post("/api/gemini/quiz", async (req, res) => {
  try {
    const { content, title, subject, mode, id } = req.body; // mode: "quiz" or "flashcards"
    if (!content) {
      return res.status(400).json({ error: "No content provided to generate quiz." });
    }

    const requestMode = mode || "quiz";
    const noteKey = id || "";

    const ai = getGeminiClient();
    if (!ai) {
      let fallbackData: any;
      if (requestMode === "quiz") {
        fallbackData = PREDEFINED_QUIZZES[noteKey] || generateFallbackQuiz(content, title, subject);
      } else {
        fallbackData = PREDEFINED_FLASHCARDS[noteKey] || generateFallbackFlashcards(content, title, subject);
      }
      return res.json({ 
        data: fallbackData,
        warning: "Gemini API key is not configured. Displaying smart local revision material instead!"
      });
    }

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

    let delay = 1000;
    let attempts = 2;
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          }
        });

        const parsedData = JSON.parse(response.text.trim());
        return res.json({ data: parsedData });
      } catch (err: any) {
        console.warn(`Gemini Quiz/Flashcards attempt ${i+1} failed:`, err.message || err);
        const isTransient = String(err).includes("503") || String(err).includes("429") || 
                            String(err).includes("UNAVAILABLE") || String(err).includes("ResourceExhausted") ||
                            err.status === 503 || err.status === 429;
        if (i < attempts - 1 && isTransient) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.info("Falling back to local generator due to Gemini API failure.");
          let fallbackData: any;
          if (requestMode === "quiz") {
            fallbackData = PREDEFINED_QUIZZES[noteKey] || generateFallbackQuiz(content, title, subject);
          } else {
            fallbackData = PREDEFINED_FLASHCARDS[noteKey] || generateFallbackFlashcards(content, title, subject);
          }
          return res.json({ 
            data: fallbackData, 
            warning: "Gemini AI is currently under high load. Displaying instant smart local revision material instead!" 
          });
        }
      }
    }
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
