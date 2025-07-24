// routes/claim.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { db } = require('../firebase');
const { uploadFilesToGCS } = require('../upload_file');
const { detectFraud } = require('../utils/fraud_checker');
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.array('files'), async (req, res) => {
  try {
    const {
      accidentTime,
      accidentDate,
      weather,
      claimAmount,
      claimId,
      policyId,
    } = req.body;

    const files = req.files;

    const userId = policyId || 'anonymous';
    //calling file upload to gcs
    const uploadedSummaries = await uploadFilesToGCS(files, userId);
    //calling fraud detection func
    const fraudList = detectFraud({ claimAmount }, uploadedSummaries);
    // 👇 Simple red flag logic for now
    let redFlagsCount = 0;
    if (fraudList) {
      const fraudItems = fraudList;
      redFlagsCount = fraudItems.length;
    }
    const filesData = [];

    for (const category in uploadedSummaries) {
      for (const item of uploadedSummaries[category]) {
        filesData.push({
          filename: item.uri.split('/').pop(),
          gcs_uri: item.uri,
          summary: item.summary,
          type: category,
        });
      }
    }
    const docData = {
      accidentTime,
      accidentDate,
      weather,
      claimAmount: Number(claimAmount),
      fraudList: fraudList,
      redFlagsCount,
      claimId,
      policyId,
      files: filesData,
      status: 'Submitted',
      createdAt: new Date().toISOString(),
    };

    await db.collection('claims').doc(claimId).set(docData);

    res.status(200).json({ message: 'Claim submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// 🔎 Get all claims
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('claims').get();
    const claims = [];
    snapshot.forEach(doc => claims.push(doc.data()));
    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching claims' });
  }
});

// 🔎 Get single claim by ID
router.get('/:claimId', async (req, res) => {
  try {
    const doc = await db.collection('claims').doc(req.params.claimId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Claim not found' });
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: 'Error fetching claim' });
  }
});

module.exports = router;
