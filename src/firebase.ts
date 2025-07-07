import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAh0kiBl2iPJGKwBhRyrC0TK9k9TkrTZc4",
  authDomain: "flashcards-83e87.firebaseapp.com",
  projectId: "flashcards-83e87",
  storageBucket: "flashcards-83e87.firebasestorage.app",
  messagingSenderId: "81318481780",
  appId: "1:81318481780:web:cc5ce48f8959ef904e2621",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
