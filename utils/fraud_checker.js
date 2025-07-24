// utils/fraud_checker.js

function detectFraud(claimData, summaries) {
  // Simulated fraud detection logic — replace with real logic later
  const fraudList = [];

  if (claimData.claimAmount > 10000) {
    fraudList.push('High claim amount');
  }

  if (summaries.images && summaries.images.length > 0) {
    fraudList.push('Image metadata mismatch');
  }

  if (summaries.documents.some(doc => doc.summary.toLowerCase().includes('suspicious'))) {
    fraudList.push('Suspicious document language');
  }

  return fraudList;
}

module.exports = { detectFraud };
