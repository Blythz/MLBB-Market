import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type Auth } from "firebase/auth"
import { getFirestore, serverTimestamp, type Firestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const firebaseEnabled = !!config.apiKey && !!config.authDomain && !!config.projectId && !!config.appId

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null

export function ensureFirebaseApp() {
  if (!firebaseEnabled) {
    throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* env vars.")
  }
  if (!app) {
    app = getApps()[0] || initializeApp(config)
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
  }
  return app!
}

export function getFirebaseAuth() {
  ensureFirebaseApp()
  return auth!
}

export function getFirebaseDb() {
  ensureFirebaseApp()
  return db!
}

export function getFirebaseStorage() {
  ensureFirebaseApp()
  return storage!
}

export async function signInWithGooglePopup() {
  const a = getFirebaseAuth()
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(a, provider)
  return result.user
}

export async function signOutFirebase() {
  const a = getFirebaseAuth()
  await signOut(a)
}

export async function seedOrUpdateUserProfile(user: {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}) {
  const d = getFirebaseDb()
  const ref = doc(d, "users", user.uid)
  const snap = await getDoc(ref)

  const base = {
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    updatedAt: serverTimestamp(),
  }

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      fullName: user.displayName || "",
      role: "user",
      sellerStatus: "not_applied",
      createdAt: serverTimestamp(),
      ...base,
    })
  } else {
    // Update only non-privileged fields; do not touch role/sellerStatus when doc exists
    await updateDoc(ref, base)
  }
}
