/**
 * MOMENTUM — firebase.js
 * Firebase Auth + Firestore sync module
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgmvkghH7ill_tRw-d5TGgh7t5o9kLa40",
  authDomain: "momentum-habit-tracker-ccb56.firebaseapp.com",
  projectId: "momentum-habit-tracker-ccb56",
  storageBucket: "momentum-habit-tracker-ccb56.firebasestorage.app",
  messagingSenderId: "1045852198013",
  appId: "1:1045852198013:web:47feb15175d62d86f10d14"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Enable offline persistence (works even without internet)
enableIndexedDbPersistence(db).catch(() => {});

/* ── AUTH METHODS ── */
const signInWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

const signInWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

const signUpWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

const logOut = () => signOut(auth);

/* ── FIRESTORE SYNC ── */
const getUserDocRef = (uid) => doc(db, 'users', uid, 'data', 'habits');

const saveHabitsToCloud = async (uid, habits) => {
  try {
    await setDoc(getUserDocRef(uid), { habits, updatedAt: Date.now() });
  } catch (err) {
    console.warn('Cloud save failed (offline?):', err);
  }
};

const loadHabitsFromCloud = async (uid) => {
  try {
    const snap = await getDoc(getUserDocRef(uid));
    if (snap.exists()) return snap.data().habits || [];
    return null; // no cloud data yet
  } catch (err) {
    console.warn('Cloud load failed (offline?):', err);
    return null;
  }
};

// Real-time listener — calls callback whenever cloud data changes
const subscribeToHabits = (uid, callback) =>
  onSnapshot(getUserDocRef(uid), (snap) => {
    if (snap.exists()) callback(snap.data().habits || []);
  });

export {
  auth, db,
  onAuthStateChanged,
  signInWithGoogle, signInWithEmail, signUpWithEmail, logOut,
  saveHabitsToCloud, loadHabitsFromCloud, subscribeToHabits,
};
