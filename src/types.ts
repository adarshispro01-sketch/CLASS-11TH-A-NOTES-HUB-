export interface StudyNote {
  id: string;
  title: string;
  subject: "Physics" | "Chemistry" | "Mathematics" | "Computer Science" | "English" | "Datesheets" | "General";
  content: string;
  author: string;
  date: string;
  fileAttached: boolean;
  fileDataUrl?: string;
  fileName?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  tag: string;
  author: string;
}

export interface QuizQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
}
