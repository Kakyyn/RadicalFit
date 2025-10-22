// Node.js Admin migration template (run from a secure server with service account)
// Usage: set GOOGLE_APPLICATION_CREDENTIALS=path\\to\\serviceAccount.json; node migrate_to_firestore.js /path/to/local-export.json

/*
  This script is a template. It expects a JSON file that contains keys:
  { gymMembers: [...], exercises: [...], comprasList: [...] }

  To run: create a Firebase service account key, set GOOGLE_APPLICATION_CREDENTIALS env var,
  then: node migrate_to_firestore.js exported-data.json
*/

const fs = require('fs');
const admin = require('firebase-admin');

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node migrate_to_firestore.js data.json'); process.exit(1); }
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);
  // Ensure GOOGLE_APPLICATION_CREDENTIALS is set to a service account JSON with Firestore permissions.
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn('Warning: GOOGLE_APPLICATION_CREDENTIALS not set. Make sure you are running this in a secure environment with service account credentials.');
  }
  admin.initializeApp({
    // If running on a machine with GOOGLE_APPLICATION_CREDENTIALS env var set, admin will use that.
  });
  const db = admin.firestore();

  if (Array.isArray(data.gymMembers)) {
    for (const m of data.gymMembers) {
      const id = m.id || (m.email ? m.email.replace(/[^a-z0-9]/gi,'_') : undefined);
      if (id) await db.collection('members').doc(id).set(m, { merge: true });
    }
  }
  if (Array.isArray(data.exercises)) {
    for (const ex of data.exercises) {
      const id = ex.id || undefined;
      if (id) await db.collection('exercises').doc(id).set(ex, { merge: true });
      else await db.collection('exercises').add(ex);
    }
  }
  if (Array.isArray(data.comprasList)) {
    for (const c of data.comprasList) await db.collection('purchases').add(c);
  }

  console.log('Migration completed.');
}

main().catch(err => { console.error(err); process.exit(1); });
