require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');


const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const bucket = admin.storage().bucket(process.env.BUCKET_NAME);

module.exports = { db, bucket };
