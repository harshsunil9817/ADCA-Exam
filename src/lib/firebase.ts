// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// This app's Firebase configuration (for submissions, etc.)
const firebaseConfigApp = {
  apiKey: "AIzaSyAeiQQ62Pn_MBPhsAruzqKHdZxLO1riJFY",
  authDomain: "examplify-262mw.firebaseapp.com",
  projectId: "examplify-262mw",
  storageBucket: "examplify-262mw.firebasestorage.app",
  messagingSenderId: "644265344193",
  appId: "1:644265344193:web:c3500be72fdc0aea77e840"
};

// Student data Firebase configuration (for authentication)
const firebaseConfigStudent = {
  apiKey: "AIzaSyB1U0qRrjlp1VIIBpIe-0rFbUpu1or30P8",
  authDomain: "academyedge-h1a1s.firebaseapp.com",
  projectId: "academyedge-h1a1s",
  storageBucket: "academyedge-h1a1s.firebasestorage.app",
  messagingSenderId: "966241306387",
  appId: "1:966241306387:web:5eed5b9ddc3ec7ed843ce6"
};

// Initialize the default app (for this app's data)
const app = getApps().length === 0 ? initializeApp(firebaseConfigApp) : getApp();
const appDb = getFirestore(app);

// Initialize the secondary app (for student data)
const studentAppName = 'studentAuthApp';
const studentApp = getApps().find(app => app.name === studentAppName) || initializeApp(firebaseConfigStudent, studentAppName);
const studentDb = getFirestore(studentApp);

export { appDb, studentDb };
