// Set an 'admin' custom claim on a Firebase Auth user (server-side).
// Usage (PowerShell):
// $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\service-account.json'
// node .\tools\set_admin_claim.js admin@example.com

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('ERROR: Set GOOGLE_APPLICATION_CREDENTIALS env var to your service account JSON path.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const email = process.argv[2];
if (!email) {
  console.error('Usage: node .\\tools\\set_admin_claim.js admin@example.com');
  process.exit(1);
}

(async function main() {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log('Custom claim set: admin=true for', email, 'uid:', user.uid);
    console.log('Tokens for this user will include the claim after the user refreshes their ID token (sign out/in).');
  } catch (err) {
    console.error('Failed to set admin claim:', err);
    process.exit(1);
  }
})();