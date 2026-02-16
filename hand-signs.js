/**
 * hand-signs.js — Naruto Hand Sign Classification
 * 
 * Uses MediaPipe 21-landmark hand model to classify the 12 Naruto hand signs.
 * Each sign is detected using finger curl ratios, angles between landmarks,
 * thumb position relative to palm, and cross-finger relationships.
 * 
 * MediaPipe Hand Landmarks:
 *  0: WRIST
 *  1-4: THUMB (CMC, MCP, IP, TIP)
 *  5-8: INDEX (MCP, PIP, DIP, TIP)
 *  9-12: MIDDLE (MCP, PIP, DIP, TIP)
 *  13-16: RING (MCP, PIP, DIP, TIP)
 *  17-20: PINKY (MCP, PIP, DIP, TIP)
 */

const HandSignClassifier = (() => {

  // ─── Geometry Helpers ───────────────────────────────────────────

  function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function vec(a, b) {
    return { x: b.x - a.x, y: b.y - a.y, z: (b.z || 0) - (a.z || 0) };
  }

  function dot(u, v) {
    return u.x * v.x + u.y * v.y + (u.z || 0) * (v.z || 0);
  }

  function mag(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0));
  }

  function angleBetween(a, b, c) {
    const v1 = vec(b, a);
    const v2 = vec(b, c);
    const cosA = dot(v1, v2) / (mag(v1) * mag(v2) + 1e-9);
    return Math.acos(Math.max(-1, Math.min(1, cosA))) * (180 / Math.PI);
  }

  function cross2D(u, v) {
    return u.x * v.y - u.y * v.x;
  }

  function midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: ((a.z || 0) + (b.z || 0)) / 2 };
  }

  // ─── Finger Feature Extraction ─────────────────────────────────

  function getFingerCurl(lm, base, pip, dip, tip) {
    // Curl = how bent the finger is. 0 = straight, 1 = fully curled
    const fullLen = dist(lm[base], lm[pip]) + dist(lm[pip], lm[dip]) + dist(lm[dip], lm[tip]);
    const directLen = dist(lm[base], lm[tip]);
    const ratio = directLen / (fullLen + 1e-9);
    // ratio near 1 = straight, near 0.5 or less = curled
    return 1 - Math.max(0, Math.min(1, (ratio - 0.5) / 0.5));
  }

  function getThumbCurl(lm) {
    const fullLen = dist(lm[1], lm[2]) + dist(lm[2], lm[3]) + dist(lm[3], lm[4]);
    const directLen = dist(lm[1], lm[4]);
    const ratio = directLen / (fullLen + 1e-9);
    return 1 - Math.max(0, Math.min(1, (ratio - 0.5) / 0.5));
  }

  function isFingerExtended(lm, base, pip, dip, tip) {
    return getFingerCurl(lm, base, pip, dip, tip) < 0.4;
  }

  function isFingerCurled(lm, base, pip, dip, tip) {
    return getFingerCurl(lm, base, pip, dip, tip) > 0.55;
  }

  function getFingerAngle(lm, mcp, pip, dip) {
    return angleBetween(lm[mcp], lm[pip], lm[dip]);
  }

  function getPalmSize(lm) {
    return dist(lm[0], lm[9]);
  }

  // ─── Two-Hand Features ─────────────────────────────────────────

  function getHandFeatures(lm) {
    const palmSize = getPalmSize(lm);

    const thumbCurl = getThumbCurl(lm);
    const indexCurl = getFingerCurl(lm, 5, 6, 7, 8);
    const middleCurl = getFingerCurl(lm, 9, 10, 11, 12);
    const ringCurl = getFingerCurl(lm, 13, 14, 15, 16);
    const pinkyCurl = getFingerCurl(lm, 17, 18, 19, 20);

    const thumbExtended = thumbCurl < 0.4;
    const indexExtended = indexCurl < 0.4;
    const middleExtended = middleCurl < 0.4;
    const ringExtended = ringCurl < 0.4;
    const pinkyExtended = pinkyCurl < 0.4;

    const indexCurled = indexCurl > 0.55;
    const middleCurled = middleCurl > 0.55;
    const ringCurled = ringCurl > 0.55;
    const pinkyCurled = pinkyCurl > 0.55;
    const thumbCurled = thumbCurl > 0.55;

    // Finger spread: distance between fingertips relative to palm
    const indexMiddleSpread = dist(lm[8], lm[12]) / palmSize;
    const middleRingSpread = dist(lm[12], lm[16]) / palmSize;
    const ringPinkySpread = dist(lm[16], lm[20]) / palmSize;
    const indexRingSpread = dist(lm[8], lm[16]) / palmSize;

    // Thumb position relative to palm
    const thumbToPalm = dist(lm[4], lm[9]) / palmSize;
    const thumbToIndex = dist(lm[4], lm[8]) / palmSize;
    const thumbToMiddle = dist(lm[4], lm[12]) / palmSize;
    const thumbToPinky = dist(lm[4], lm[20]) / palmSize;

    // Fingertip to wrist distances (normalized)
    const indexToWrist = dist(lm[8], lm[0]) / palmSize;
    const middleToWrist = dist(lm[12], lm[0]) / palmSize;
    const ringToWrist = dist(lm[16], lm[0]) / palmSize;
    const pinkyToWrist = dist(lm[20], lm[0]) / palmSize;

    // Index-middle touching
    const indexMiddleTouching = dist(lm[8], lm[12]) / palmSize < 0.25;

    // Index-middle tips close to each other and pointing up
    const indexMiddleUp = lm[8].y < lm[6].y && lm[12].y < lm[10].y;

    // Finger angles at PIP joints
    const indexAngle = getFingerAngle(lm, 5, 6, 7);
    const middleAngle = getFingerAngle(lm, 9, 10, 11);
    const ringAngle = getFingerAngle(lm, 13, 14, 15);
    const pinkyAngle = getFingerAngle(lm, 17, 18, 19);

    // Palm facing direction (using cross product of palm vectors)
    const palmVec1 = vec(lm[0], lm[5]);
    const palmVec2 = vec(lm[0], lm[17]);
    const palmNormal = cross2D(palmVec1, palmVec2);
    const palmFacingCamera = palmNormal > 0; // rough estimate

    // Thumb crossing over palm
    const thumbCrossingPalm = lm[4].x > lm[9].x === lm[0].x < lm[9].x;

    // Two-finger "gun" shapes
    const indexMiddleOnly = indexExtended && middleExtended && ringCurled && pinkyCurled;

    // All curled
    const allFingersCurled = indexCurled && middleCurled && ringCurled && pinkyCurled;

    // All extended
    const allFingersExtended = indexExtended && middleExtended && ringExtended && pinkyExtended;

    // Pinky-index extended, middle-ring curled
    const hornsShape = indexExtended && pinkyExtended && middleCurled && ringCurled;

    return {
      palmSize,
      thumbCurl, indexCurl, middleCurl, ringCurl, pinkyCurl,
      thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended,
      thumbCurled, indexCurled, middleCurled, ringCurled, pinkyCurled,
      indexMiddleSpread, middleRingSpread, ringPinkySpread, indexRingSpread,
      thumbToPalm, thumbToIndex, thumbToMiddle, thumbToPinky,
      indexToWrist, middleToWrist, ringToWrist, pinkyToWrist,
      indexMiddleTouching, indexMiddleUp,
      indexAngle, middleAngle, ringAngle, pinkyAngle,
      palmFacingCamera, thumbCrossingPalm,
      indexMiddleOnly, allFingersCurled, allFingersExtended, hornsShape,
      lm
    };
  }

  // ─── Sign Classification Rules ─────────────────────────────────
  // Each returns a score 0–1. We pick the highest scoring sign.
  // Since we only have one hand (MediaPipe per-hand), we focus on
  // the dominant hand shape. Real Naruto signs use two hands, but
  // we approximate with single-hand gestures.

  const signRules = {

    // TIGER (Tora): Index and middle fingers extended upward together, 
    // ring and pinky curled, thumb may wrap
    Tiger: (f) => {
      let score = 0;
      if (f.indexExtended) score += 0.25;
      if (f.middleExtended) score += 0.25;
      if (f.ringCurled) score += 0.15;
      if (f.pinkyCurled) score += 0.15;
      if (f.indexMiddleTouching) score += 0.1;
      if (f.indexMiddleUp) score += 0.1;
      // Penalty if ring/pinky are extended
      if (f.ringExtended) score -= 0.3;
      if (f.pinkyExtended) score -= 0.3;
      return { score: Math.max(0, score), rules: ['idx+mid ext, ring+pink curl, tips close'] };
    },

    // SNAKE (Mi): Hands clasped, but single-hand: all fingers curled into fist 
    // with thumb wrapping over, or index pointing forward with thumb alongside
    Snake: (f) => {
      let score = 0;
      // Fist-like with thumb wrapping
      if (f.allFingersCurled) score += 0.4;
      if (f.thumbCurled) score += 0.2;
      if (f.thumbToPalm < 0.8) score += 0.2;
      // Distinguish from Ox: pinky should be curled
      if (f.pinkyCurled) score += 0.1;
      if (f.indexCurl > 0.6) score += 0.1;
      // Penalty if fingers are extended
      if (f.indexExtended) score -= 0.3;
      if (f.middleExtended) score -= 0.2;
      if (f.pinkyExtended) score -= 0.3;
      return { score: Math.max(0, score), rules: ['tight fist, thumb wrap'] };
    },

    // RAM (Hitsuji): Index and middle fingers extended, spread apart (like peace sign)
    // but fingers are together and pointing up with a specific angle
    Ram: (f) => {
      let score = 0;
      if (f.indexExtended) score += 0.2;
      if (f.middleExtended) score += 0.2;
      if (f.ringCurled) score += 0.15;
      if (f.pinkyCurled) score += 0.15;
      // Key difference from Tiger: fingers SPREAD apart
      if (f.indexMiddleSpread > 0.35) score += 0.2;
      if (!f.indexMiddleTouching) score += 0.1;
      // Penalty if too close (that's Tiger)
      if (f.indexMiddleTouching) score -= 0.3;
      if (f.ringExtended) score -= 0.3;
      if (f.pinkyExtended) score -= 0.3;
      return { score: Math.max(0, score), rules: ['idx+mid ext spread, ring+pink curl'] };
    },

    // MONKEY (Saru): All fingers extended but thumb tucked, open hand flat
    Monkey: (f) => {
      let score = 0;
      if (f.allFingersExtended) score += 0.4;
      if (f.thumbCurled || f.thumbCurl > 0.3) score += 0.2;
      if (f.thumbToPalm < 0.7) score += 0.15;
      // All fingers relatively close together (flat hand)
      if (f.indexMiddleSpread < 0.4) score += 0.1;
      if (f.middleRingSpread < 0.4) score += 0.1;
      // Penalty
      if (f.thumbExtended) score -= 0.3;
      if (f.indexCurled) score -= 0.3;
      if (f.middleCurled) score -= 0.3;
      return { score: Math.max(0, score), rules: ['all ext, thumb tuck, flat palm'] };
    },

    // BOAR (I): Open palm, all fingers and thumb extended, fingers spread
    Boar: (f) => {
      let score = 0;
      if (f.allFingersExtended) score += 0.3;
      if (f.thumbExtended) score += 0.25;
      // Fingers spread
      if (f.indexMiddleSpread > 0.3) score += 0.1;
      if (f.middleRingSpread > 0.2) score += 0.1;
      if (f.ringPinkySpread > 0.2) score += 0.1;
      if (f.thumbToPalm > 0.9) score += 0.15;
      // Penalty
      if (f.indexCurled) score -= 0.3;
      if (f.middleCurled) score -= 0.3;
      if (f.thumbCurled) score -= 0.3;
      return { score: Math.max(0, score), rules: ['all ext + thumb ext, spread'] };
    },

    // HORSE (Uma): Index fingers pressed together pointing up,
    // Single hand: index extended pointing up, others curled, thumb out to side
    Horse: (f) => {
      let score = 0;
      if (f.indexExtended) score += 0.3;
      if (f.middleCurled) score += 0.2;
      if (f.ringCurled) score += 0.15;
      if (f.pinkyCurled) score += 0.15;
      // Thumb extended to side
      if (f.thumbExtended) score += 0.1;
      if (f.thumbToIndex > 0.6) score += 0.1;
      // Penalty for multiple fingers
      if (f.middleExtended) score -= 0.35;
      if (f.ringExtended) score -= 0.2;
      if (f.pinkyExtended) score -= 0.2;
      return { score: Math.max(0, score), rules: ['index only ext, thumb out, rest curl'] };
    },

    // BIRD (Tori): Pinky and ring extended, index and middle curled, 
    // or index curled over middle with ring+pinky out
    Bird: (f) => {
      let score = 0;
      if (f.pinkyExtended) score += 0.25;
      if (f.ringExtended) score += 0.2;
      if (f.indexCurled) score += 0.2;
      if (f.middleCurled) score += 0.2;
      if (f.ringPinkySpread < 0.35) score += 0.1;
      // Penalty
      if (f.indexExtended) score -= 0.35;
      if (f.middleExtended) score -= 0.35;
      if (f.pinkyCurled) score -= 0.3;
      return { score: Math.max(0, score), rules: ['ring+pinky ext, idx+mid curl'] };
    },

    // DOG (Inu): Flat hand palm down, all fingers and thumb extended,
    // fingers together (not spread). Like a karate chop hand.
    Dog: (f) => {
      let score = 0;
      if (f.allFingersExtended) score += 0.3;
      if (f.thumbExtended) score += 0.1;
      // Fingers close together (not spread)
      if (f.indexMiddleSpread < 0.25) score += 0.15;
      if (f.middleRingSpread < 0.2) score += 0.15;
      if (f.ringPinkySpread < 0.2) score += 0.15;
      // Thumb tucked alongside
      if (f.thumbToPalm < 0.9) score += 0.15;
      // Penalty for spread fingers (that's Boar)
      if (f.indexMiddleSpread > 0.4) score -= 0.3;
      if (f.indexCurled) score -= 0.3;
      return { score: Math.max(0, score), rules: ['all ext, fingers together, palm flat'] };
    },

    // DRAGON (Tatsu): Complex interlocking — single hand approx:
    // Index extended, middle and ring slightly bent, pinky curled, thumb out
    Dragon: (f) => {
      let score = 0;
      if (f.indexExtended) score += 0.2;
      // Middle partially curled
      if (f.middleCurl > 0.25 && f.middleCurl < 0.65) score += 0.2;
      // Ring partially curled
      if (f.ringCurl > 0.25 && f.ringCurl < 0.65) score += 0.2;
      if (f.pinkyCurled) score += 0.15;
      if (f.thumbExtended) score += 0.15;
      // Spread between index and middle
      if (f.indexMiddleSpread > 0.3) score += 0.1;
      // Penalties
      if (f.middleExtended && f.ringExtended) score -= 0.2;
      if (f.allFingersCurled) score -= 0.3;
      return { score: Math.max(0, score), rules: ['idx ext, mid+ring partial, pinky curl, thumb out'] };
    },

    // OX (Ushi): Horns shape — index and pinky extended, middle and ring curled
    Ox: (f) => {
      let score = 0;
      if (f.hornsShape) score += 0.5;
      if (f.indexExtended) score += 0.15;
      if (f.pinkyExtended) score += 0.15;
      if (f.middleCurled) score += 0.1;
      if (f.ringCurled) score += 0.1;
      // Penalty
      if (f.middleExtended) score -= 0.35;
      if (f.ringExtended) score -= 0.35;
      if (f.pinkyCurled) score -= 0.3;
      return { score: Math.max(0, score), rules: ['idx+pinky ext (horns), mid+ring curl'] };
    },

    // HARE (U): Index and pinky extended with middle and ring partially extended
    // or: pinky up, others curl (like pinky promise)
    Hare: (f) => {
      let score = 0;
      if (f.pinkyExtended) score += 0.3;
      if (f.indexCurled) score += 0.2;
      if (f.middleCurled) score += 0.2;
      if (f.ringCurled) score += 0.15;
      if (f.thumbCurl > 0.3) score += 0.1;
      // Penalty
      if (f.indexExtended) score -= 0.3;
      if (f.middleExtended) score -= 0.3;
      if (f.ringExtended) score -= 0.2;
      if (f.pinkyCurled) score -= 0.5;
      return { score: Math.max(0, score), rules: ['pinky only ext, rest curl'] };
    },

    // RAT (Ne): Index and middle interlocked — single hand:
    // Thumb up, all others curled (thumbs up gesture)
    Rat: (f) => {
      let score = 0;
      if (f.thumbExtended) score += 0.35;
      if (f.indexCurled) score += 0.15;
      if (f.middleCurled) score += 0.15;
      if (f.ringCurled) score += 0.15;
      if (f.pinkyCurled) score += 0.15;
      // Thumb clearly away from palm
      if (f.thumbToPalm > 0.8) score += 0.05;
      // Penalty
      if (f.indexExtended) score -= 0.3;
      if (f.middleExtended) score -= 0.3;
      if (f.pinkyExtended) score -= 0.3;
      if (f.thumbCurled) score -= 0.5;
      return { score: Math.max(0, score), rules: ['thumb up, all others curl'] };
    }
  };

  // ─── Main Classification ───────────────────────────────────────

  function classify(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;

    const features = getHandFeatures(landmarks);
    const results = {};
    let bestSign = null;
    let bestScore = 0;

    for (const [sign, ruleFn] of Object.entries(signRules)) {
      const { score, rules } = ruleFn(features);
      results[sign] = { score: Math.min(1, score), rules };
      if (score > bestScore) {
        bestScore = score;
        bestSign = sign;
      }
    }

    // Minimum confidence threshold
    const minConfidence = 0.45;
    if (bestScore < minConfidence) {
      return {
        sign: null,
        confidence: 0,
        allScores: results,
        features,
        threshold: minConfidence
      };
    }

    return {
      sign: bestSign,
      confidence: Math.min(1, bestScore),
      allScores: results,
      features,
      threshold: minConfidence
    };
  }

  // ─── Debug Info ─────────────────────────────────────────────────

  function getDebugInfo(classification) {
    if (!classification) return '';
    const lines = [];
    lines.push(`Detected: ${classification.sign || 'None'} (${(classification.confidence * 100).toFixed(0)}%)`);
    lines.push('');
    const sorted = Object.entries(classification.allScores)
      .sort((a, b) => b[1].score - a[1].score);
    for (const [sign, data] of sorted) {
      const bar = '█'.repeat(Math.round(data.score * 20));
      lines.push(`${sign.padEnd(8)} ${bar} ${(data.score * 100).toFixed(0)}%`);
    }
    if (classification.features) {
      const f = classification.features;
      lines.push('');
      lines.push(`Curls: T${(f.thumbCurl*100).toFixed(0)} I${(f.indexCurl*100).toFixed(0)} M${(f.middleCurl*100).toFixed(0)} R${(f.ringCurl*100).toFixed(0)} P${(f.pinkyCurl*100).toFixed(0)}`);
      lines.push(`Spread: IM${(f.indexMiddleSpread*100).toFixed(0)} MR${(f.middleRingSpread*100).toFixed(0)} RP${(f.ringPinkySpread*100).toFixed(0)}`);
    }
    return lines.join('\n');
  }

  // Sign emoji/symbol mapping for display
  const signSymbols = {
    Tiger: '🐅', Snake: '🐍', Ram: '🐏', Monkey: '🐒',
    Boar: '🐗', Horse: '🐴', Bird: '🐦', Dog: '🐕',
    Dragon: '🐉', Ox: '🐂', Hare: '🐇', Rat: '🐀'
  };

  const signNames = {
    Tiger: 'Tora', Snake: 'Mi', Ram: 'Hitsuji', Monkey: 'Saru',
    Boar: 'I', Horse: 'Uma', Bird: 'Tori', Dog: 'Inu',
    Dragon: 'Tatsu', Ox: 'Ushi', Hare: 'U', Rat: 'Ne'
  };

  return {
    classify,
    getDebugInfo,
    getHandFeatures,
    signSymbols,
    signNames,
    dist,
    vec,
    angleBetween
  };
})();
