import {
  getCrossedPauseBoundary,
  getNextPauseBoundary,
} from '../renderer/pauseBoundary';

describe('pause boundaries', () => {
  it('calculates absolute pause boundaries', () => {
    expect(getNextPauseBoundary(0, 10)).toBe(10);
    expect(getNextPauseBoundary(2, 10)).toBe(10);
    expect(getNextPauseBoundary(8, 10)).toBe(10);
    expect(getNextPauseBoundary(24, 10)).toBe(30);
    expect(getNextPauseBoundary(12, 10)).toBe(20);
    expect(getNextPauseBoundary(12, 5)).toBe(15);
  });

  it('uses the next boundary when starting exactly on one', () => {
    expect(getNextPauseBoundary(10, 10)).toBe(20);
    expect(getNextPauseBoundary(20, 10)).toBe(30);
    expect(getNextPauseBoundary(44, 10)).toBe(50);
  });

  it('ignores invalid intervals and boundaries past the duration', () => {
    expect(getNextPauseBoundary(24, 10, 25)).toBeNull();
    expect(getNextPauseBoundary(12, 0)).toBeNull();
    expect(getNextPauseBoundary(12, -1)).toBeNull();
    expect(getNextPauseBoundary(12, Number.NaN)).toBeNull();
  });

  it('detects the first boundary crossed by forward playback', () => {
    expect(getCrossedPauseBoundary(0, 10, 10)).toBe(10);
    expect(getCrossedPauseBoundary(10, 10.2, 10)).toBeNull();
    expect(getCrossedPauseBoundary(32, 40.2, 10)).toBe(40);
    expect(getCrossedPauseBoundary(18, 20.2, 10)).toBe(20);
    expect(getCrossedPauseBoundary(39, 40.2, 10)).toBe(40);
    expect(getCrossedPauseBoundary(12, 44, 10)).toBe(20);
  });

  it('does not treat backward movement as playback crossing', () => {
    expect(getCrossedPauseBoundary(40, 32, 10)).toBeNull();
  });
});
