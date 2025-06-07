const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, dialog } = require('electron');
const { getMainWindow } = require('./main');


function extractFileId(driveUrl) {
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  return match ? match[1] : null;
}

async function downloadDriveVideo(driveUrl, mainWindow) {
  console.log('📥 Link recibido:', driveUrl);

  const fileId = extractFileId(driveUrl);
  if (!fileId) throw new Error('❌ No se pudo extraer el ID del archivo');

  const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  console.log('🔗 View:', viewUrl);
  console.log('🔗 Direct:', downloadUrl);

  const win = new BrowserWindow({
    show: false,
    width: 1000,
    height: 800,
    webPreferences: {
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
    },
  });

  const downloadFolder = path.join(app.getPath('desktop'), 'videos-descargados');
  fs.mkdirSync(downloadFolder, { recursive: true });

  // Paso 1: obtener nombre real desde página de vista
  await win.loadURL(viewUrl);
  const fileName = await win.webContents.executeJavaScript(`
    document.querySelector('meta[itemprop="name"]')?.getAttribute('content') || null
  `);

  if (!fileName) {
    win.close();
    throw new Error('❌ No se pudo obtener el nombre del archivo');
  }

  const filePath = path.join(downloadFolder, fileName);

  // Paso 2: si ya existe, preguntamos
  if (fs.existsSync(filePath)) {
  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    buttons: ['Usar archivo existente', 'Sobrescribir', 'Cancelar'],
    defaultId: 0, // "Usar existente" como opción por defecto
    cancelId: 2,  // "Cancelar"
    title: 'Archivo existente',
    message: `El archivo "${fileName}" ya existe.\n¿Qué querés hacer?`,
  });

  if (response === 0) {
    // Usar archivo existente
    console.log('✅ Usando archivo existente:', filePath);
    win.close();
    return filePath;
  } else if (response === 1) {
    // Sobrescribir
    try {
      fs.unlinkSync(filePath);
      console.log('🧹 Eliminado archivo existente');
    } catch (err) {
      win.close();
      throw new Error('❌ Error al eliminar archivo existente');
    }
  } else if (response === 2) {
    // Cancelar
    console.log('🚫 Usuario canceló');
    win.close();
    throw new Error('Cancelado por el usuario');
  }
}


  // Paso 3: esperar descarga
  const downloadPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('⏰ Timeout: No se inició ninguna descarga'));
    }, 15000);

    win.webContents.session.once('will-download', (event, item) => {
      clearTimeout(timeout);
      item.setSavePath(filePath);

      console.log('⬇️ Guardando en:', filePath);

      item.on('updated', () => {
        const received = item.getReceivedBytes();
        const total = item.getTotalBytes();
        // win.webContents.send('download-progress', { received, total });
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('download-progress', { received, total });
          }
        });

      item.once('done', (e, state) => {
        if (state === 'completed') {
          console.log('✅ Descarga completada:', filePath);
          win.webContents.send('download-progress', null); // limpia barra
          resolve(filePath);
        } else {
          console.error('❌ Descarga fallida:', state);
          win.webContents.send('download-progress', null); // limpia barra
          reject(new Error(`Fallo la descarga: ${state}`));
        }
        win.close();
      });
    });
  });

  // Paso 4: intentar iniciar la descarga
  console.log('🌐 Cargando página de descarga...');
  await win.loadURL(downloadUrl);

  await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const tryClick = () => {
        const inputBtn = document.querySelector('input[type="submit"]');
        if (inputBtn) {
          inputBtn.click();
          resolve(true);
          return;
        }

        const linkBtn = document.querySelector('a[href*="uc?export=download"][href*="confirm="]');
        if (linkBtn) {
          linkBtn.click();
          resolve(true);
          return;
        }

        resolve(false);
      };
      setTimeout(tryClick, 2000);
    });
  `);

  return await downloadPromise;
}

module.exports = { downloadDriveVideo };
