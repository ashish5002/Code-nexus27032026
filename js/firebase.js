// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, setDoc, getDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEuJKXzvVlPW6PZXg1RyhLwAUW43o3DBg",
  authDomain: "smartspend-4d5af.firebaseapp.com",
  projectId: "smartspend-4d5af",
  storageBucket: "smartspend-4d5af.firebasestorage.app",
  messagingSenderId: "985397988812",
  appId: "1:985397988812:web:483fa69aa155ded8f8e169",
  measurementId: "G-Z6GTPL0050"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, setDoc, getDoc, serverTimestamp, writeBatch };