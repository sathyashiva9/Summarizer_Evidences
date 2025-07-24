require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const app = express();
app.use(express.json()); 
const { Storage } = require('@google-cloud/storage');
const { processDocumentFromGCS } = require('./document_ai.js'); 
const { match } = require('assert');
const { summarizeJpgFromGCS } = require('./image_summarizer.js');
// const { saveClaimToFirestore } = require('./claimModel');
// const {summarizeDocumentWithGemini} = require('./extractor_details.js')
// const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);


// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

//const db = admin.firestore();
async function uploadFilesToGCS(files, userId) {
  const storage = new Storage({
    projectId: process.env.PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });

  const bucket = storage.bucket(process.env.BUCKET_NAME);

  const folderMap = {
    documents: ['.pdf', '.docx', '.txt'],
    images: ['.jpg', '.jpeg', '.png', '.gif'],
    videos: ['.mp4', '.mov', '.avi'],
    reports: []
  };

  const uploadedSummaries = {
    documents: [],
    images: [],
    videos: [],
    reports: []
  };

  for (const file of files) {
    const filePath = path.resolve(file.path);
    const ext = path.extname(file.originalname).toLowerCase();

    let matchedFolder = null;
    for (const [folder, extensions] of Object.entries(folderMap)) {
      if (extensions.includes(ext)) {
        matchedFolder = folder;
        break;
      }
    }

    if (!matchedFolder) {
      console.warn(`Unsupported file type: ${file.originalname}`);
      continue;
    }

    const destPath = `${userId}/${matchedFolder}/${file.originalname}`;
    await bucket.upload(filePath, { destination: destPath });
    const gcsUri = `gs://${process.env.BUCKET_NAME}/${destPath}`;

    let summary = '';
    if(matchedFolder=="documents"){
      try {
      summary = await processDocumentFromGCS(gcsUri,matchedFolder,userId);
      // const data_extracted = await summarizeDocumentWithGemini(summary);
      // console.log("extracting data ",data_extracted);
    } catch (e) {
      summary = `Failed to summarize: ${e.message}`;
    }
    }
    else if(matchedFolder=="images"){
      const prompt = "Please understand the image and tell what parts of the car are damaged";
      summary = await summarizeJpgFromGCS(gcsUri,prompt);
    }
    

    uploadedSummaries[matchedFolder].push({
      uri: gcsUri,
      summary
    });
  }
// await saveClaimToFirestore({
//   userId,
//   weather: 'Rainy',       // You can pass actual values from the request later
//   claimBy: 'Self',         // Replace with dynamic value if needed
//   policyId: 'ABC1234567',  // Replace with dynamic value
//   uploaded: uploadedSummaries
// });
  return uploadedSummaries;
}

module.exports = { uploadFilesToGCS };
