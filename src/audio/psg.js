/**
 * Square/noise voice synthesis. Voice count is unconstrained — the
 * original's 6-tone/2-noise limit was hardware, not design (spec §8).
 * @module audio/psg
 */

/**
 * Create a synth voice.
 * @param {'square'|'noise'} type
 * @returns {{ play: (freq: number, duration: number) => void }}
 */
export function createVoice(type) {
  throw new Error('not implemented — see Phase 10');
}
