import 'server-only';

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Config for the primary app (submissions)
const firebaseConfigApp = {
  apiKey: "AIzaSyAeiQQ62Pn_MBPhsAruzqKHdZxLO1riJFY",
  authDomain: "examplify-262mw.firebaseapp.com",
  projectId: "examplify-262mw",
  storageBucket: "examplify-262mw.firebasestorage.app",
  messagingSenderId: "644265344193",
  appId: "1:644265344193:web:c3500be72fdc0aea77e840"
};

// Config for the student data app
const firebaseConfigStudent = {
  apiKey: "AIzaSyB1U0qRrjlp1VIIBpIe-0rFbUpu1or30P8",
  authDomain: "academyedge-h1a1s.firebaseapp.com",
  projectId: "academyedge-h1a1s",
  storageBucket: "academyedge-h1a1s.firebasestorage.app",
  messagingSenderId: "966241306387",
  appId: "1:966241306387:web:5eed5b9ddc3ec7ed843ce6"
};

// Initialize apps, checking if they already exist to avoid errors during hot-reloading.
// Using explicit names to prevent conflicts.
const primaryApp: FirebaseApp = getApps().find(app => app.name === 'primary') || initializeApp(firebaseConfigApp, 'primary');
const studentApp: FirebaseApp = getApps().find(app => app.name === 'studentDB') || initializeApp(firebaseConfigStudent, 'studentDB');


// Export the Firestore instances for use in server actions
const appDb = getFirestore(primaryApp);
const studentDb = getFirestore(studentApp);

export { appDb, studentDb };
