/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable prettier/prettier */
const fs = require('fs');

const path = require('path');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

function extractDriveId(url) {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function downloadDriveFile(driveUrl, destFolder = 'downloads') {
  const id = extractDriveId(driveUrl);
  if (!id) throw new Error('ID de Google Drive inválido');

  const downloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;
  const outputPath = path.join(process.cwd(), destFolder, `${id}.mp4`);


  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error('No se pudo descargar el archivo');

  const fileStream = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', () => resolve(outputPath));
  });
}

module.exports = { downloadDriveFile };
