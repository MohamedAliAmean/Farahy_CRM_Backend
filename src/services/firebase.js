const admin = require("firebase-admin");
const serviceAccount = require("./../../firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firebase = admin.firestore();

module.exports = { admin, firebase };