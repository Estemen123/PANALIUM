import { initializeApp } from "firebase/app"

import { getAuth } from "firebase/auth"

import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyC_akBR3oGRXtvusyEQYkERIDgkv-QvsAg",

  authDomain: "panalium-b5fb0.firebaseapp.com",

  projectId: "panalium-b5fb0",

  storageBucket: "panalium-b5fb0.firebasestorage.app",

  messagingSenderId: "1089370428036",

  appId: "1:1089370428036:web:33babaa9e9ecc6c6a9e8d1",

  measurementId: "G-6W8GTQ9YCV",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

export const db = getFirestore(app)

export const FIREBASE_API_KEY = firebaseConfig.apiKey
