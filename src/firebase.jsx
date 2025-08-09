// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeYbdoiRkIvFaRi3wiKxvhvBi7uTbC1nE",
  authDomain: "doctorrefral.firebaseapp.com",
  projectId: "doctorrefral",
  storageBucket: "doctorrefral.firebasestorage.app",
  messagingSenderId: "373291117151",
  appId: "1:373291117151:web:1667417dc596378d8c89ea"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);