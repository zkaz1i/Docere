
/**
 * Firebase Configuration and Initialization
 * 
 * This module initializes Firebase Firestore for the Docere application.
 * Uses Firebase CDN SDK (no Node.js backend required - Netlify compatible)
 * 
 * SETUP REQUIRED:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Firestore Database
 * 3. Set Firestore rules (see FIRESTORE_RULES in comments below)
 * 4. Get your Firebase config from Project Settings
 * 5. Replace the config object below with your Firebase credentials
 */
const firebaseConfig = {
  apiKey: "AIzaSyCCAkm4sB7bRSNoxCFUhSp4LSEtQvCAUVQ",
  authDomain: "docreeproject.firebaseapp.com",
  projectId: "docreeproject",
  storageBucket: "docreeproject.firebasestorage.app",
  messagingSenderId: "468669359544",
  appId: "1:468669359544:web:16049c7beefe84a1a09b4d",
  measurementId: "G-V3X11K8CE6"
};
// Firebase Configuration
// TODO: Replace with your Firebase project configuration


// Initialize Firebase (only if not already initialized)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Firestore
const db = firebase.firestore();

// Initialize Firebase Authentication
const auth = firebase.auth();

// Enable Firestore persistence for offline support (optional but recommended)
db.enablePersistence().catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time.
    console.warn('Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The current browser does not support persistence
    console.warn('Firestore persistence not available in this browser');
  }
});

// Export db and auth for use in other modules
window.db = db;
window.auth = auth;

/* 
 * FIRESTORE SECURITY RULES (Set these in Firebase Console > Firestore > Rules):
 * 
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     // Allow read/write access to all documents
 *     // NOTE: This is for development. In production, you should add authentication
 *     // and proper authorization rules based on user roles
 *     match /{document=**} {
 *       allow read, write: if true;
 *     }
 *   }
 * }
 */


