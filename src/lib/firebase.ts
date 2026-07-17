import 'server-only';

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCOEUekhnwxRQtdhhvYjXH6WZ-AJHFdZEc",
  authDomain: "academyedge-h1a1s.firebaseapp.com",
  databaseURL: "https://academyedge-h1a1s-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "academyedge-h1a1s",
  storageBucket: "academyedge-h1a1s.firebasestorage.app",
  messagingSenderId: "966241306387",
  appId: "1:966241306387:web:e7ebbec67d503f57843ce6"
};

// Initialize app, checking if it already exists to avoid errors during hot-reloading.
const app: FirebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// Export the Firestore instances for use in server actions
const appDb = getFirestore(app);
const studentDb = getFirestore(app); // Re-exported to avoid breaking existing imports

export { appDb, studentDb };
