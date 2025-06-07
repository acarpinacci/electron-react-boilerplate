// src/components/DownloadProgress.js
import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

export default function DownloadProgress({ received, total }) {
  const [speed, setSpeed] = useState(null); // bytes/second
  const [eta, setEta] = useState(null); // seconds

  const lastRef = useRef({
    timestamp: Date.now(),
    received: received || 0,
  });

  useEffect(() => {
    const now = Date.now();
    const elapsed = (now - lastRef.current.timestamp) / 1000; // en segundos
    const delta = received - lastRef.current.received;

    if (elapsed > 0 && delta >= 0) {
      const currentSpeed = delta / elapsed; // bytes/segundo
      setSpeed(currentSpeed);

      if (total && received < total) {
        const remainingBytes = total - received;
        const estimatedSeconds = remainingBytes / currentSpeed;
        setEta(estimatedSeconds);
      } else {
        setEta(null);
      }

      lastRef.current = { timestamp: now, received };
    }
  }, [received, total]);

  if (!received || !total || total <= 0) return null;

  const percentage = Math.round((received / total) * 100);

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B/s`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <Box sx={{ my: 2, width: '100%' }}>
      <Typography variant="body2" gutterBottom>
        Descargando: {percentage}% — {speed ? formatBytes(speed) : '...'} • Tiempo Descarga Estimado: {eta ? formatTime(eta) : '...'}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 10,
          borderRadius: 5,
          backgroundColor: '#e0e0e0',
          '& .MuiLinearProgress-bar': {
            backgroundColor: '#1976d2',
          },
        }}
      />
    </Box>
  );
}
