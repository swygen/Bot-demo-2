// firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCeRzFBpHBS9qozjaDWt2xQrxvebwdQidQ",
  authDomain: "fir-1-71f8b.firebaseapp.com",
  projectId: "fir-1-71f8b",
  storageBucket: "fir-1-71f8b.appspot.com",
  messagingSenderId: "1091849366933",
  appId: "1:1091849366933:web:4384a9be26dee1f9d95a9c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
