// Lightweight Firebase helper for the app
// Exports: initFirebase(config), addClient(data), getClients()
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

let _db = null;
let _storage = null;
let _auth = null;

export function initFirebase(config) {
  if (!_db) {
    const app = initializeApp(config);
    _db = getFirestore(app);
    try { _storage = getStorage(app); } catch (e) { console.warn('Storage init failed', e); }
    try { _auth = getAuth(app); } catch (e) { console.warn('Auth init failed', e); }
  }
  return _db;
}

export async function addClient(data) {
  if (!_db) throw new Error('Firestore not initialized. Call initFirebase first.');
  // If auth available, attach current user's uid to the client record
  if (_auth && _auth.currentUser) data.createdBy = _auth.currentUser.uid;
  const colRef = collection(_db, 'clients');
  const result = await addDoc(colRef, data);
  return result;
}

export async function getClients() {
  if (!_db) throw new Error('Firestore not initialized. Call initFirebase first.');
  const colRef = collection(_db, 'clients');
  const snap = await getDocs(colRef);
  const out = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  return out;
}

export async function getClientById(id) {
  if (!_db) throw new Error('Firestore not initialized. Call initFirebase first.');
  const d = await getDoc(doc(_db, 'clients', id));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() };
}

// --- Auth helpers ---
export async function signUp(email, password) {
  if (!_auth) throw new Error('Auth not initialized');
  const res = await createUserWithEmailAndPassword(_auth, email, password);
  return res.user;
}

export async function signIn(email, password) {
  if (!_auth) throw new Error('Auth not initialized');
  const res = await signInWithEmailAndPassword(_auth, email, password);
  return res.user;
}

export async function signOut() {
  if (!_auth) throw new Error('Auth not initialized');
  return fbSignOut(_auth);
}

export function onAuthStateChanged(callback) {
  if (!_auth) throw new Error('Auth not initialized');
  return fbOnAuthStateChanged(_auth, callback);
}

export function getCurrentUser() {
  return _auth ? _auth.currentUser : null;
}

async function uploadFile(file, path) {
  if (!_storage) throw new Error('Storage not initialized');
  const ref = storageRef(_storage, path);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);
  return url;
}

// data: object fields to create on the client doc
// beforeFile, afterFile: File objects from input[type=file]
export async function addClientWithImages(data, beforeFile, afterFile) {
  if (!_db) throw new Error('Firestore not initialized. Call initFirebase first.');
  if (_auth && _auth.currentUser) data.createdBy = _auth.currentUser.uid;
  const colRef = collection(_db, 'clients');
  const docRef = await addDoc(colRef, data);
  const updates = {};
  try {
    if (beforeFile && _storage) {
      const path = `clients/${docRef.id}/before_${Date.now()}_${beforeFile.name}`;
      updates.beforeImageUrl = await uploadFile(beforeFile, path);
    }
    if (afterFile && _storage) {
      const path = `clients/${docRef.id}/after_${Date.now()}_${afterFile.name}`;
      updates.afterImageUrl = await uploadFile(afterFile, path);
    }
    if (Object.keys(updates).length) {
      await updateDoc(doc(_db, 'clients', docRef.id), updates);
    }
  } catch (e) {
    console.error('Image upload failed', e);
    // don't throw — the doc exists; return info so caller can decide
  }
  return docRef;
}
