export const PAUSE_BOUNDARY_EPSILON_SECONDS = 0.01;

export const getNextPauseBoundary = (
  currentTime: number,
  interval: number,
  duration = Infinity,
) => {
  if (!Number.isFinite(interval) || interval <= 0) return null;

  const time = Math.max(0, Number.isFinite(currentTime) ? currentTime : 0);
  const nextBoundary = (Math.floor(time / interval) + 1) * interval;

  if (Number.isFinite(duration) && nextBoundary > duration) return null;

  return nextBoundary;
};

export const getCrossedPauseBoundary = (
  previousTime: number,
  currentTime: number,
  interval: number,
  duration = Infinity,
) => {
  if (currentTime <= previousTime) return null;

  const nextBoundary = getNextPauseBoundary(
    previousTime,
    interval,
    duration,
  );

  if (nextBoundary === null) return null;

  return currentTime + PAUSE_BOUNDARY_EPSILON_SECONDS >= nextBoundary
    ? nextBoundary
    : null;
};
