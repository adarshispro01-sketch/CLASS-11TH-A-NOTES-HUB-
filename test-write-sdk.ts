import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, setLogLevel } from "firebase/firestore";

setLogLevel("silent");

async function test() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) {
      console.log("Config file not found!");
      return;
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const firebaseApp = initializeApp(firebaseConfig);
    const db = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId || "(default)");

    console.log("Writing test note to Firestore...");
    const testId = "note-test-sdk-direct";
    const newNote = {
      id: testId,
      title: "Direct SDK Note",
      subject: "Math",
      content: "Written directly via SDK test script.",
      author: "Test script",
      date: new Date().toISOString().split("T")[0],
      fileAttached: false
    };

    await setDoc(doc(db, "notes", testId), newNote);
    console.log("Direct SDK Write Succeeded!");
  } catch (err: any) {
    console.error("Direct SDK Write Failed:", err.message, err.stack);
  }
}

test().then(() => process.exit(0));
