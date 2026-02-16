/**
 * jutsu-detector.js — Naruto Jutsu Sequence Detection
 * 
 * Monitors a stream of detected hand signs and matches them against
 * known jutsu sequences. Handles timeouts, partial matches, and
 * progress tracking.
 */

const JutsuDetector = (() => {

  // ─── Jutsu Definitions ──────────────────────────────────────────

  const jutsus = [
    {
      id: 'fireball',
      name: 'Fireball Jutsu',
      japanese: 'Katon: Gōkakyū no Jutsu',
      element: 'Fire',
      signs: ['Snake', 'Ram', 'Monkey', 'Boar', 'Horse', 'Tiger'],
      effect: 'fireball',
      color: '#ff4400',
      description: 'A massive ball of roaring fire erupts from the user\'s mouth!'
    },
    {
      id: 'chidori',
      name: 'Chidori',
      japanese: 'Chidori — One Thousand Birds',
      element: 'Lightning',
      signs: ['Ox', 'Hare', 'Monkey'],
      effect: 'chidori',
      color: '#44aaff',
      description: 'Lightning chakra concentrates in the palm, chirping like a thousand birds!'
    },
    {
      id: 'shadowclone',
      name: 'Shadow Clone Jutsu',
      japanese: 'Kage Bunshin no Jutsu',
      element: 'None',
      signs: ['Ram', 'Snake', 'Tiger'],
      effect: 'shadowclone',
      color: '#aa88ff',
      description: 'The user splits into multiple solid shadow clones!'
    },
    {
      id: 'waterdragon',
      name: 'Water Dragon Jutsu',
      japanese: 'Suiton: Suiryūdan no Jutsu',
      element: 'Water',
      signs: ['Ox', 'Monkey', 'Hare', 'Rat', 'Boar', 'Bird'],
      // Simplified from the full 14-sign sequence for practicality
      effect: 'waterdragon',
      color: '#0088ff',
      description: 'A massive dragon made of water rises and strikes the target!'
    }
  ];

  // ─── State ──────────────────────────────────────────────────────

  let currentSequence = [];
  let lastSignTime = 0;
  let lastDetectedSign = null;
  let signHoldCount = 0;
  let matchingJutsus = [];
  let onJutsuComplete = null;
  let onSequenceUpdate = null;
  let onSequenceReset = null;

  // Config
  const SEQUENCE_TIMEOUT_MS = 5000;   // Reset if no sign for 5 seconds
  const SIGN_HOLD_FRAMES = 8;         // Must hold sign for N frames to register
  const MIN_CONFIDENCE = 0.5;         // Minimum confidence to accept a sign

  // ─── Core Logic ─────────────────────────────────────────────────

  function processSign(classification) {
    if (!classification) return;

    const now = Date.now();
    const sign = classification.sign;
    const confidence = classification.confidence;

    // Check timeout
    if (currentSequence.length > 0 && now - lastSignTime > SEQUENCE_TIMEOUT_MS) {
      resetSequence('timeout');
    }

    // Must have a valid sign with enough confidence
    if (!sign || confidence < MIN_CONFIDENCE) {
      // If we were holding a sign, reset the hold counter
      if (lastDetectedSign !== null) {
        signHoldCount = 0;
        lastDetectedSign = null;
      }
      return;
    }

    // Sign hold detection — must hold the same sign for several frames
    if (sign === lastDetectedSign) {
      signHoldCount++;
    } else {
      lastDetectedSign = sign;
      signHoldCount = 1;
    }

    // Only register when held long enough
    if (signHoldCount !== SIGN_HOLD_FRAMES) return;

    // Don't register the same sign twice in a row
    if (currentSequence.length > 0 && currentSequence[currentSequence.length - 1] === sign) {
      return;
    }

    // Add to sequence
    currentSequence.push(sign);
    lastSignTime = now;

    // Check for matches
    matchingJutsus = findMatchingJutsus();

    // Notify UI
    if (onSequenceUpdate) {
      onSequenceUpdate(currentSequence, matchingJutsus);
    }

    // Check for complete jutsu
    const completedJutsu = findCompletedJutsu();
    if (completedJutsu) {
      if (onJutsuComplete) {
        onJutsuComplete(completedJutsu);
      }
      resetSequence('completed');
      return;
    }

    // If no jutsus can possibly match anymore, reset
    if (matchingJutsus.length === 0 && currentSequence.length > 0) {
      // Give a brief window — maybe they'll start a new sequence
      setTimeout(() => {
        if (matchingJutsus.length === 0) {
          resetSequence('no-match');
        }
      }, 1000);
    }
  }

  function findMatchingJutsus() {
    return jutsus.filter(jutsu => {
      if (currentSequence.length > jutsu.signs.length) return false;
      for (let i = 0; i < currentSequence.length; i++) {
        if (currentSequence[i] !== jutsu.signs[i]) return false;
      }
      return true;
    }).map(jutsu => ({
      ...jutsu,
      progress: currentSequence.length,
      total: jutsu.signs.length,
      percentage: (currentSequence.length / jutsu.signs.length) * 100
    }));
  }

  function findCompletedJutsu() {
    return jutsus.find(jutsu => {
      if (currentSequence.length !== jutsu.signs.length) return false;
      return jutsu.signs.every((sign, i) => sign === currentSequence[i]);
    });
  }

  function resetSequence(reason) {
    const hadSigns = currentSequence.length > 0;
    currentSequence = [];
    matchingJutsus = [];
    lastDetectedSign = null;
    signHoldCount = 0;
    if (hadSigns && onSequenceReset) {
      onSequenceReset(reason);
    }
  }

  // ─── Public API ─────────────────────────────────────────────────

  return {
    jutsus,
    processSign,
    resetSequence,

    getState() {
      return {
        sequence: [...currentSequence],
        matching: matchingJutsus,
        lastSign: lastDetectedSign,
        holdCount: signHoldCount,
        requiredHold: SIGN_HOLD_FRAMES
      };
    },

    setCallbacks({ onComplete, onUpdate, onReset }) {
      if (onComplete) onJutsuComplete = onComplete;
      if (onUpdate) onSequenceUpdate = onUpdate;
      if (onReset) onSequenceReset = onReset;
    },

    getJutsus() {
      return jutsus;
    },

    getProgress() {
      return {
        sequence: [...currentSequence],
        matching: matchingJutsus
      };
    }
  };
})();
