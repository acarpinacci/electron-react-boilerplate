/* eslint-disable no-lone-blocks */
/* eslint-disable jsx-a11y/media-has-caption */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  Container,
  TextField,
  Typography,
  Box,
  Paper,
  Slider,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import DownloadProgress from './downloadProgress/downloadProgress.js';

export default function App() {
  const prefersDarkMode = true;
  const [darkMode, setDarkMode] = useState(prefersDarkMode);
  const [videoCount, setVideoCount] = useState(0);
  const [inputUrl, setInputUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [localFile, setLocalFile] = useState(null);
  const [pauseInterval, setPauseInterval] = useState(10);
  const [error, setError] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const loadCount = async () => {
      const count = await window.electron.getDownloadedVideosCount();
      setVideoCount(count);
    };
    loadCount();
  }, []);

  useEffect(() => {
     console.log('Download progress updated:', downloadProgress);
  }, [downloadProgress]);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on('download-progress', ({ received, total }) => {
      setDownloadProgress({ received, total });
    });

    return () => {
      unsubscribe();
    };
  }, []);


  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
        },
      }),
    [darkMode],
  );

  const videoRef = useRef(null);
  const timeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Estado para controlar si ya se reprodujo video actual alguna vez
  const [hasPlayed, setHasPlayed] = useState(false);

  // Modal de confirmacion para perder progreso
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingLoad, setPendingLoad] = useState(null); // { type: 'url'|'file', value }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const playBeep = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  };

  const isDriveUrl = (url) => url.includes('drive.google.com/file/d/');

  const refreshVideoCount = async () => {
    const count = await window.electron.getDownloadedVideosCount();
    setVideoCount(count);
  };

  const handlePlay = () => {
    if (!hasPlayed) setHasPlayed(true);
    setError(null);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.pause();
        playBeep();
      }
    }, pauseInterval * 1000);
  };

  const handlePause = () => {
    clearTimeout(timeoutRef.current);
  };

  const transformDropboxUrl = (url) => {
    try {
      // Dropbox shared links: cambiar ?dl=0 o cualquier query a ?raw=1 para link directo
      if (url.includes('dropbox.com')) {
        const base = url.split('?')[0];
        return `${base}?raw=1`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const onLoadVideo = () => {
    setError(null);
  };

  const onErrorVideo = () => {
    setError(
      'No se pudo cargar el video. Verificá que la URL sea válida y que el archivo sea accesible.',
    );
  };

  const handleConfirmClose = (confirm) => {
    setConfirmOpen(false);
    if (confirm && pendingLoad) {
      if (pendingLoad.type === 'url') {
        const url = transformDropboxUrl(pendingLoad.value.trim());
        setVideoUrl(url);
        setLocalFile(null);
        setError(null);
        setHasPlayed(false);
      } else if (pendingLoad.type === 'file') {
        setLocalFile(pendingLoad.value);
        setVideoUrl('');
        setError(null);
        setHasPlayed(false);
      }
    }
    setPendingLoad(null);
  };

  const tryLoadNew = async (type, value) => {
    if ((videoUrl || localFile) && hasPlayed) {
      setPendingLoad({ type, value });
      setConfirmOpen(true);
      return;
    }

    if (type === 'url') {
      const trimmed = value.trim();

      // Caso especial: link de Google Drive
      if (isDriveUrl(trimmed)) {
        setError('Descargando video desde Google Drive...');
        try {
          const result = await window.electron.downloadFromDrive(trimmed);
          if (result.success) {
            const path = result.path.replace(/\\/g, '/');
            setVideoUrl(`file://${path}`);
            setLocalFile(null);
            setError(null);
            setHasPlayed(false);
            await refreshVideoCount(); // Actualizar el conteo de videos
            setDownloadProgress(null); // ⬅️ Limpiar progreso exitosamente
          } else {
            setError(`Error al descargar el video: ${result.error}`);
            setDownloadProgress(null); // ⬅️ Limpiar progreso si fallo
          }
        } catch (err) {
          setError(`Error inesperado: ${err.message}`);
          setDownloadProgress(null); // ⬅️ Limpiar progreso por error fatal
        }
        return;
      }

      // Caso Dropbox o link directo
      const finalUrl = transformDropboxUrl(trimmed);
      setVideoUrl(finalUrl);
      setLocalFile(null);
      setError(null);
      setHasPlayed(false);
    }

    if (type === 'file') {
      setLocalFile(value);
      setVideoUrl('');
      setError(null);
      setHasPlayed(false);
    }
  };

  const handleSubmitUrl = () => {
    if (!inputUrl.trim()) {
      setError('Por favor ingresá una URL.');
      setVideoUrl('');
      setLocalFile(null);
      return;
    }
    tryLoadNew('url', inputUrl);
  };

  const handleSelectFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      tryLoadNew('file', e.target.files[0]);
      e.target.value = null; // reset para poder seleccionar mismo archivo otra vez si quiere
    }
  };

  const onClickSelectFileButton = (e) => {
    if ((videoUrl || localFile) && hasPlayed) {
      e.preventDefault(); // cancela la apertura del explorador
      setPendingLoad({ type: 'file', value: null }); // valor null porque todavía no se seleccionó archivo
      setConfirmOpen(true);
    } else {
      // si no hay reproducción previa, abrimos selector
      fileInputRef.current?.click();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container
        maxWidth={false}
        sx={{
          py: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          alignContent: 'center',
          alignSelf: 'center',
        }}
      >
        <Typography variant="h4" gutterBottom>
          Video con Pausas Automáticas 🎬
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="URL del video"
            fullWidth
            variant="outlined"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitUrl()}
            disabled={false}
          />
          <Button variant="contained" onClick={handleSubmitUrl}>
            Cargar
          </Button>
          <Button variant="contained" onClick={onClickSelectFileButton}>
            Seleccionar archivo
          </Button>
          <input
            type="file"
            accept="video/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleSelectFile}
          />
        </Box>

        <Box sx={{ my: 2 }}>
          <Typography gutterBottom>
            Segundos antes de pausar: {pauseInterval}
          </Typography>
          <Slider
            value={pauseInterval}
            onChange={(e, val) => setPauseInterval(val)}
            min={1}
            max={60}
            valueLabelDisplay="auto"
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {downloadProgress && (
          <Box sx={{ my: 2, width: '100%' }}>
            <DownloadProgress
              received={downloadProgress.received}
              total={downloadProgress.total}
            />
          </Box>
        )}

        {(videoUrl || localFile) && !error && (
          <Paper
            elevation={3}
            sx={{
              p: 2,
              mt: 3,
              // width: '100%', // Este puede ser problema, mejor limitarlo:
              // maxWidth: 600, // o cualquier ancho máximo que quieras
              borderRadius: 2,
            }}
          >
            <video
              ref={videoRef}
              src={localFile ? URL.createObjectURL(localFile) : videoUrl}
              width="100%"
              controls
              onPlay={handlePlay}
              onPause={handlePause}
              onError={onErrorVideo}
              onLoadedData={onLoadVideo}
              style={{ borderRadius: 8 }}
            />
          </Paper>
        )}
        <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
          Los videos descargados desde Google Drive se guardan automáticamente
          en la carpeta <strong>videos-descargados</strong> en tu Escritorio.
          Videos descargados: {videoCount}
        </Alert>
        <Button
          variant="outlined"
          sx={{ mb: 2 }}
          onClick={() => window.electron.openDownloadsFolder()}
        >
          Abrir carpeta de videos descargados
        </Button>
        <Button
          variant="outlined"
          color="error"
          sx={{ mb: 3 }}
          onClick={async () => {
            const confirm = window.confirm(
              '¿Estás seguro que querés borrar todos los videos descargados?',
            );
            if (!confirm) return;

            // ⛔ Detener si está usando archivo de esa carpeta
            // const downloadsPath = `${window.process.env.HOME || window.process.env.USERPROFILE}\\Desktop\\videos-descargados`;

            if (videoUrl?.includes('videos-descargados')) {
              if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.removeAttribute('src'); // ⬅️ esto es clave
                videoRef.current.load(); // forzar descarga de nuevo DOM
              }
              setVideoUrl('');
              setLocalFile(null);
              setHasPlayed(false);
            }
            {
              if (videoRef.current) videoRef.current.pause();
              setVideoUrl('');
              setLocalFile(null);
              setHasPlayed(false);
            }

            try {
              const result = await window.electron.clearDownloadedVideos();
              await refreshVideoCount(); // Actualizar el conteo de videos
              if (result.success) {
                alert('Videos eliminados correctamente.');
              } else {
                alert(`Error al eliminar: ${result.error}`);
              }
            } catch (err) {
              alert(`Error inesperado: ${err.message}`);
            }
          }}
        >
          Borrar todos los videos descargados
        </Button>

        <Dialog open={confirmOpen} onClose={() => handleConfirmClose(false)}>
          <DialogTitle>Confirmar cambio</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Estás por cargar un nuevo video. Se perderá el progreso actual.
              ¿Querés continuar?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => handleConfirmClose(false)}>Cancelar</Button>
            <Button onClick={() => handleConfirmClose(true)} autoFocus>
              Continuar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
}
