// ultraShortSummarizeCommonJS-gcs.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Storage } = require("@google-cloud/storage");
const dotenv = require("dotenv");
const path = require("path");
const os = require("os");
const fs = require("fs").promises;

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

const storage = new Storage(); // Uses default GCP credentials (via Workload Identity or key file)

async function summarizeJpgFromGCS(gcsUri, prompt) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Parse GCS URI
  const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
  if (!match) {
    throw new Error("Invalid GCS URI format. Use gs://bucket-name/path/to/file.jpg");
  }

  const bucketName = match[1];
  const filePath = match[2];

  // Download image from GCS
  const tmpFile = path.join(os.tmpdir(), path.basename(filePath));
  await storage.bucket(bucketName).file(filePath).download({ destination: tmpFile });

  // Read downloaded image
  const imageBuffer = await fs.readFile(tmpFile);
  const imagePart = {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType: "image/jpeg",
    },
  };

  // Generate summary
  const result = await model.generateContent([prompt, imagePart]);
  return result.response.text();
}

// --- Example Usage ---
module.exports = { summarizeJpgFromGCS }
