const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const { Storage } = require('@google-cloud/storage');
const path = require('path');

const client = new DocumentProcessorServiceClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
const storage = new Storage();

const projectId = process.env.PROJECT_ID;
const location = process.env.LOCATION;
const processorId = process.env.PROCESSOR_ID;
const bucketName = process.env.BUCKET_NAME;

function detectMimeType(gcsUri) {
  const ext = gcsUri.split('.').pop().toLowerCase();
  const mimeTypes = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
  };
  if (mimeTypes[ext]) return mimeTypes[ext];
  throw new Error(`Unsupported file type: .${ext}`);
}

async function processDocumentFromGCS(gcsUri,folderType,userId) {
  const mimeType = detectMimeType(gcsUri);
  const  { GoogleGenerativeAI } =  require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.API_KEY);
  const model = genAI.getGenerativeModel({model:"gemini-1.5-flash"}); 
  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
  const fileName = path.basename(gcsUri).replace(/\.[^/.]+$/, '');
  const outputPrefix = `output_${fileName}_${Date.now()}`;
  const gcsOutputUri = `gs://${bucketName}/${userId}/summaries/${folderType}_outputs/${outputPrefix}/`;

  const request = {
    name,
    inputDocuments: {
      gcsDocuments: {
        documents: [{ gcsUri, mimeType }],
      },
    },
    documentOutputConfig: {
      gcsOutputConfig: {
        gcsUri: gcsOutputUri,
      },
    },
  };

  const [operation] = await client.batchProcessDocuments(request);
  await operation.promise();
  console.log(`✅ Batch processing complete for ${gcsUri}`);

  // Extract bucket and prefix for output path
  const [bucket, ...prefixParts] = gcsOutputUri.replace('gs://', '').split('/');
  const prefix = prefixParts.join('/');

  const [files] = await storage.bucket(bucket).getFiles({ prefix });

  if (!files.length) {
    throw new Error('❌ No output files found.');
  }
// // ✅ Make all output files public
// for (const file of files) {
//   await file.makePublic();
// }
  // Expecting only one result file
  const [contents] = await files[0].download();
  const document = JSON.parse(contents.toString());
//   const prompt =  document.text;
const prompt = `Please summarize the following insurance claim document:\n\n${document.text}`;
  console.log("The doc is\n",document);
    try {
            const result = await model.generateContent(prompt);
//             const result = await model.generateContent([ { role: "user", parts: [{ text: prompt }] } ]);
// const response = await result.response;
// const summary = response.text();

            const response = await result.response;
            summary = response.text();
            //console.log(res.response.text());

    } catch (error) {
        
            console.log(error)
    }

  //console.log(document.text);
// console.log(document)
// const summaryEntity = document.entities?.find(e => e.type === 'summary');
//   if (summaryEntity && summaryEntity.mentionText) {
//     summary = summaryEntity.mentionText.trim();
//   }
//   // console.log(files[0]);
//   const inputUri = gcsUri;
//   const outputFolderUri = `https://storage.googleapis.com/${bucketName}/${prefixParts.slice(0, -3).join('/')}/`;

//   // Print the URIs and summary
//   console.log('📥 Input GCS URI:', inputUri);
//   console.log('📤 Output Folder URL:', outputFolderUri);

  return summary || '[No text extracted]';
}

module.exports = { processDocumentFromGCS };
