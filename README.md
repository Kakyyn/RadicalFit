Radical Fit — Firestore Migration & Sync

This project is a vanilla JS PWA. Recent changes added optional Firebase Firestore sync and migration tools.

Quick start — enable Firestore

1. Add your Firebase config into `index.html` (above the Firebase SDK scripts):

<script>
  window.FIREBASE_CONFIG = {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    appId: "...",
    messagingSenderId: "...",
    measurementId: "..."
  };
</script>

2. Open the app in a browser. To avoid stale cached assets from the service worker, in Chrome DevTools: Application → Service Workers → Unregister.

3. If your Firestore rules require authentication, sign in or provision an admin user (you can use the helper `window.fbSignIn(email,password)` from the console after page load).

Migration (localStorage → Firestore)

- Open the app, go to Ajustes → Migrar a Firestore and confirm.
- The migration button uploads `gymMembers` -> `members`, `exercises` -> `exercises`, member measurementHistory entries -> `measurements`, and `comprasList` -> `purchases`.
- Migration is additive and skips uploading a document when a document with the same ID already exists.

Realtime sync and conflict handling

- When Firestore is configured, the app starts realtime listeners for `members` and `exercises`.
- The app merges server and local docs using a last-write-wins strategy (based on `updatedAt` timestamp). If a local version is newer, it is queued for upload and preserved locally.
- Offline writes are queued into `localStorage.pendingWrites` and flushed automatically when the app detects network connectivity.

Developer notes

- The code exposes helpers on `window`:
  - `createMember`, `updateMember`, `deleteMember`
  - `createExercise`, `updateExercise`, `deleteExercise`
  - `startRealtimeSync`, `stopRealtimeSync`
  - `fbSignIn`, `fbSignOut`

- To view or flush pending writes from the console:

```js
JSON.parse(localStorage.getItem('pendingWrites')||'[]')
// To clear:
localStorage.removeItem('pendingWrites')
```

Security & production

- If you plan to run this in production, prefer server-side migration using the Firebase Admin SDK to avoid exposing credentials or allowing public writes.
- Harden Firestore security rules to restrict writes and reads as needed.

Admin setup and secure rules

1) Set an admin custom claim on a user (server-side)

 - Create a Firebase service account key and download the JSON to a secure machine.
 - Use the included helper `tools/set_admin_claim.js` to set the `admin` custom claim by email.

PowerShell example:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\service-account.json'
node .\tools\set_admin_claim.js admin@example.com
```

After running this, the specified user will have the `admin: true` claim. The user will need to sign out and sign in again (or refresh their ID token) for the client SDK to see the claim.

2) Firestore rules that allow only admin writes

This example allows reads to authenticated users but only allows writes from users with the `admin` custom claim. Use this in the Console → Firestore → Rules.

```js
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated reads for most collections
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

3) Client behavior

 - In the app, restrict admin UI (migration button, bulk writes) to only users who are admins. You can check `firebase.auth().currentUser.getIdTokenResult()` on page load and inspect `claims.admin` before showing admin actions.
 - The migration button included in the app will attempt anonymous sign-in if there's no user; for admin-only writes that will not help — authenticate the admin account via email/password or other sign-in method, then run migration.

4) Server-side admin migration

 - Use `tools/migrate_to_firestore.js` with the exported JSON and service account credentials. This bypasses Firestore rules and is the safest production path.


If you'd like, I can:
- Replace any remaining full-array batch writes with per-document updates throughout the codebase.
- Add more unit/smoke tests and a CI lint step.
- Produce a server-side Node.js migration script using service account credentials.

---
