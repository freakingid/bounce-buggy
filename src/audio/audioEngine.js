/**
 * WebAudio graph setup. All audio is synthesised at runtime — no sampled
 * assets (CLAUDE.md §4, spec §8).
 * @module audio/audioEngine
 */

/**
 * Create the audio engine.
 * @returns {{ context: AudioContext }}
 */
export function createAudioEngine() {
  throw new Error('not implemented — see Phase 10');
}
