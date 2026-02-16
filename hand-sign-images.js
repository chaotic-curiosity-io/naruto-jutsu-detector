/**
 * hand-sign-images.js — SVG Illustrations & Descriptions for 12 Naruto Hand Signs
 *
 * Each SVG shows a SINGLE hand from the palm-facing-camera perspective,
 * matching what the webcam actually sees for MediaPipe recognition.
 *
 * Style: line art, white/light strokes on transparent, 120×120 viewBox
 * Active (extended) fingers glow cyan; curled fingers are dim gray.
 */

const HandSignImages = (() => {

  // ── Reusable SVG fragments ──────────────────────────────────────

  const ACTIVE = '#00eeff';   // Bright cyan for extended/active fingers
  const DIM    = '#556677';   // Muted gray for curled fingers
  const PALM   = '#8899aa';   // Palm outline
  const WRIST  = '#445566';   // Wrist color
  const SW     = 2.5;         // Stroke width
  const SWt    = 2;           // Thinner stroke

  // Helper: wrap content in an SVG tag
  function svg(inner) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  }

  // Helper: wrist at bottom center
  const wrist = `<path d="M42 108 Q60 115 78 108" stroke="${WRIST}" stroke-width="${SWt}" opacity="0.5"/>`;

  // ── SVG Definitions ─────────────────────────────────────────────

  const signs = {

    Tiger: {
      name: 'Tiger',
      japanese: 'Tora',
      emoji: '🐅',
      description: 'Index + middle fingers extended up together, ring & pinky curled, thumb wrapped',
      svg: svg(`
        <!-- Palm -->
        <path d="M42 105 Q38 85 40 70 Q42 60 45 55 L50 52 Q55 50 60 50 Q65 50 70 52 L75 55 Q78 60 80 70 Q82 85 78 105 Z"
              stroke="${PALM}" stroke-width="${SWt}" opacity="0.3" fill="rgba(30,40,50,0.2)"/>
        ${wrist}
        <!-- Thumb (curled/wrapped) -->
        <path d="M42 70 Q36 65 34 58 Q33 52 36 50" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="36" cy="50" r="2.5" fill="${DIM}" opacity="0.5"/>
        <!-- Index finger (extended UP) -->
        <path d="M52 52 L50 38 L49 24 L48 12" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="48" cy="12" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="48" cy="12" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Middle finger (extended UP, close to index) -->
        <path d="M60 50 L59 35 L58 20 L57 8" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="57" cy="8" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="57" cy="8" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Ring finger (curled) -->
        <path d="M68 52 Q70 46 69 42 Q67 38 64 40" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="64" cy="40" r="2" fill="${DIM}" opacity="0.4"/>
        <!-- Pinky (curled) -->
        <path d="M75 55 Q78 50 77 45 Q75 40 72 43" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="72" cy="43" r="2" fill="${DIM}" opacity="0.4"/>
      `)
    },

    Snake: {
      name: 'Snake',
      japanese: 'Mi',
      emoji: '🐍',
      description: 'Tight fist with thumb wrapped over curled fingers',
      svg: svg(`
        <!-- Palm / Fist body -->
        <path d="M40 100 Q36 85 38 70 Q40 58 48 52 Q55 48 62 48 Q70 48 76 52 Q82 58 84 70 Q86 85 82 100 Z"
              stroke="${PALM}" stroke-width="${SWt}" opacity="0.4" fill="rgba(30,40,50,0.25)"/>
        ${wrist}
        <!-- All fingers curled into fist -->
        <!-- Index curled -->
        <path d="M50 52 Q48 44 50 38 Q54 34 58 38 Q60 42 57 48" stroke="${DIM}" stroke-width="${SW}"/>
        <circle cx="57" cy="48" r="2.5" fill="${DIM}" opacity="0.5"/>
        <!-- Middle curled -->
        <path d="M60 48 Q58 40 60 34 Q64 30 68 34 Q70 38 67 44" stroke="${DIM}" stroke-width="${SW}"/>
        <circle cx="67" cy="44" r="2.5" fill="${DIM}" opacity="0.5"/>
        <!-- Ring curled -->
        <path d="M70 50 Q68 42 70 37 Q73 34 76 37 Q78 41 75 47" stroke="${DIM}" stroke-width="${SW}"/>
        <circle cx="75" cy="47" r="2.5" fill="${DIM}" opacity="0.4"/>
        <!-- Pinky curled -->
        <path d="M78 54 Q77 47 78 42 Q80 39 83 42 Q84 46 82 51" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="82" cy="51" r="2" fill="${DIM}" opacity="0.4"/>
        <!-- Thumb wrapping OVER fingers (active color to show it) -->
        <path d="M48 52 Q42 48 38 44 Q36 40 40 36 Q44 34 48 38 Q52 42 56 44" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="56" cy="44" r="3" fill="${ACTIVE}" opacity="0.7"/>
        <circle cx="56" cy="44" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.25"/>
      `)
    },

    Ram: {
      name: 'Ram',
      japanese: 'Hitsuji',
      emoji: '🐏',
      description: 'Peace/V sign — index + middle spread apart, ring & pinky curled',
      svg: svg(`
        <!-- Palm -->
        <path d="M42 105 Q38 85 40 70 Q42 60 46 55 L52 52 Q58 50 62 50 Q68 50 72 52 L76 55 Q80 60 82 70 Q84 85 78 105 Z"
              stroke="${PALM}" stroke-width="${SWt}" opacity="0.3" fill="rgba(30,40,50,0.2)"/>
        ${wrist}
        <!-- Thumb (relaxed/slightly out) -->
        <path d="M42 68 Q36 62 33 55 Q32 48 35 44" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="35" cy="44" r="2.5" fill="${DIM}" opacity="0.5"/>
        <!-- Index finger (extended, angled LEFT) -->
        <path d="M50 52 L44 36 L38 22 L33 10" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="33" cy="10" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="33" cy="10" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Middle finger (extended, angled RIGHT) -->
        <path d="M62 50 L66 34 L70 20 L74 8" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="74" cy="8" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="74" cy="8" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Ring finger (curled) -->
        <path d="M70 52 Q73 46 72 41 Q70 37 67 40" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="67" cy="40" r="2" fill="${DIM}" opacity="0.4"/>
        <!-- Pinky (curled) -->
        <path d="M76 55 Q80 50 79 44 Q77 40 74 43" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="74" cy="43" r="2" fill="${DIM}" opacity="0.4"/>
      `)
    },

    Monkey: {
      name: 'Monkey',
      japanese: 'Saru',
      emoji: '🐒',
      description: 'Flat open hand with all fingers extended, thumb tucked in',
      svg: svg(`
        <!-- Palm -->
        <path d="M38 105 Q34 88 36 72 Q38 62 42 56 L50 50 Q58 48 62 48 Q68 48 74 50 L80 56 Q84 62 86 72 Q88 88 84 105 Z"
              stroke="${PALM}" stroke-width="${SWt}" opacity="0.3" fill="rgba(30,40,50,0.2)"/>
        ${wrist}
        <!-- Thumb (tucked into palm) -->
        <path d="M42 65 Q38 60 37 55 Q38 52 42 54" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="42" cy="54" r="2.5" fill="${DIM}" opacity="0.5"/>
        <!-- Index finger (extended) -->
        <path d="M48 50 L46 36 L44 22 L43 10" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="43" cy="10" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="43" cy="10" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Middle finger (extended) -->
        <path d="M58 48 L57 33 L56 18 L55 5" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="55" cy="5" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="55" cy="5" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Ring finger (extended) -->
        <path d="M68 48 L69 33 L70 18 L71 7" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="71" cy="7" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="71" cy="7" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Pinky (extended) -->
        <path d="M78 52 L80 38 L82 26 L83 15" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="83" cy="15" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="83" cy="15" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
      `)
    },

    Boar: {
      name: 'Boar',
      japanese: 'I',
      emoji: '🐗',
      description: 'Open palm with all fingers and thumb spread wide',
      svg: svg(`
        <!-- Palm -->
        <path d="M38 105 Q34 88 36 72 Q38 62 42 56 L50 50 Q58 48 62 48 Q68 48 74 50 L80 56 Q84 62 86 72 Q88 88 84 105 Z"
              stroke="${PALM}" stroke-width="${SWt}" opacity="0.3" fill="rgba(30,40,50,0.2)"/>
        ${wrist}
        <!-- Thumb (extended, spread out to side) -->
        <path d="M42 65 Q34 58 28 50 Q24 42 22 34" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="22" cy="34" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="22" cy="34" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Index finger (extended, angled out) -->
        <path d="M48 50 L42 34 L38 20 L35 8" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="35" cy="8" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="35" cy="8" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Middle finger (extended straight up) -->
        <path d="M58 48 L57 32 L56 18 L55 4" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="55" cy="4" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="55" cy="4" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Ring finger (extended, angled out) -->
        <path d="M70 48 L74 32 L78 18 L81 6" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="81" cy="6" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="81" cy="6" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Pinky (extended, spread out) -->
        <path d="M80 52 L86 38 L92 26 L96 16" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="96" cy="16" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="96" cy="16" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
      `)
    },

    Horse: {
      name: 'Horse',
      japanese: 'Uma',
      emoji: '🐴',
      description: 'Index finger pointing up, rest curled, thumb out to the side',
      svg: svg(`
        <!-- Palm -->
        <path d="M42 105 Q38 88 40 72 Q42 62 46 56 L52 52 Q58 50 62 50 Q68 50 72 52 L76 56 Q80 62 82 72 Q84 88 78 105 Z"
              stroke="${PALM}" stroke-width="${SWt}" opacity="0.3" fill="rgba(30,40,50,0.2)"/>
        ${wrist}
        <!-- Thumb (extended to side) -->
        <path d="M42 68 Q34 60 28 54 Q24 48 25 42" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="25" cy="42" r="3" fill="${ACTIVE}" opacity="0.7"/>
        <circle cx="25" cy="42" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.25"/>
        <!-- Index finger (extended UP — the main gesture) -->
        <path d="M52 52 L50 36 L49 22 L48 8" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="48" cy="8" r="3.5" fill="${ACTIVE}" opacity="0.9"/>
        <circle cx="48" cy="8" r="7" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.35"/>
        <!-- Middle finger (curled) -->
        <path d="M62 50 Q63 42 62 37 Q60 33 57 36" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="57" cy="36" r="2.5" fill="${DIM}" opacity="0.4"/>
        <!-- Ring finger (curled) -->
        <path d="M70 52 Q72 45 71 40 Q69 36 66 39" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="66" cy="39" r="2" fill="${DIM}" opacity="0.4"/>
        <!-- Pinky (curled) -->
        <path d="M76 56 Q79 50 78 44 Q76 40 73 43" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="73" cy="43" r="2" fill="${DIM}" opacity="0.4"/>
      `)
    },

    Bird: {
      name: 'Bird',
      japanese: 'Tori',
      emoji: '🐦',
      description: 'Ring + pinky extended, index + middle curled down',
      svg: svg(`
        <!-- Palm -->
        <path d="M42 105 Q38 88 40 72 Q42 62 46 56 L52 52 Q58 50 62 50 Q68 50 72 52 L76 56 Q80 62 82 72 Q84 88 78 105 Z"
              stroke="${PALM}" stroke-width="${SWt}" opacity="0.3" fill="rgba(30,40,50,0.2)"/>
        ${wrist}
        <!-- Thumb (relaxed) -->
        <path d="M42 68 Q36 62 34 56 Q33 50 36 46" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="36" cy="46" r="2.5" fill="${DIM}" opacity="0.5"/>
        <!-- Index finger (curled) -->
        <path d="M50 52 Q48 44 50 38 Q53 35 56 38" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="56" cy="38" r="2.5" fill="${DIM}" opacity="0.4"/>
        <!-- Middle finger (curled) -->
        <path d="M60 50 Q59 42 61 36 Q64 33 66 37" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="66" cy="37" r="2.5" fill="${DIM}" opacity="0.4"/>
        <!-- Ring finger (extended UP) -->
        <path d="M70 52 L71 36 L72 22 L73 10" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="73" cy="10" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="73" cy="10" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Pinky (extended UP) -->
        <path d="M78 56 L80 40 L83 28 L85 16" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="85" cy="16" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="85" cy="16" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
      `)
    },

    Dog: {
      name: 'Dog',
      japanese: 'Inu',
      emoji: '🐕',
      description: 'Flat karate-chop hand, all fingers together and straight',
      svg: svg(`
        <!-- Palm -->
        <path d="M40 105 Q36 88 38 72 Q40 62 44 56 L50 50 Q56 48 60 48 Q66 48 72 50 L78 56 Q82 62 84 72 Q86 88 82 105 Z"
              stroke="${PALM}" stroke-width="${SWt}" opacity="0.3" fill="rgba(30,40,50,0.2)"/>
        ${wrist}
        <!-- Thumb (alongside palm, extended but close) -->
        <path d="M40 65 Q36 58 34 50 Q34 44 36 38" stroke="${ACTIVE}" stroke-width="${SWt}" opacity="0.6"/>
        <circle cx="36" cy="38" r="2.5" fill="${ACTIVE}" opacity="0.5"/>
        <!-- Index finger (extended, together) -->
        <path d="M50 50 L49 36 L48 22 L47 10" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="47" cy="10" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <!-- Middle finger (extended, tight next to index) -->
        <path d="M58 48 L57 34 L56 20 L55 7" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="55" cy="7" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <!-- Ring finger (extended, tight) -->
        <path d="M66 48 L66 34 L66 20 L66 8" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="66" cy="8" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <!-- Pinky (extended, tight) -->
        <path d="M74 50 L74 37 L74 25 L74 14" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="74" cy="14" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <!-- Subtle glow bar across tips to show "together" -->
        <line x1="44" y1="10" x2="77" y2="12" stroke="${ACTIVE}" stroke-width="1" opacity="0.2"/>
      `)
    },

    Dragon: {
      name: 'Dragon',
      japanese: 'Tatsu',
      emoji: '🐉',
      description: 'Index extended, middle + ring partially bent, pinky curled, thumb out',
      svg: svg(`
        <!-- Palm -->
        <path d="M42 105 Q38 88 40 72 Q42 62 46 56 L52 52 Q58 50 62 50 Q68 50 72 52 L76 56 Q80 62 82 72 Q84 88 78 105 Z"
              stroke="${PALM}" stroke-width="${SWt}" opacity="0.3" fill="rgba(30,40,50,0.2)"/>
        ${wrist}
        <!-- Thumb (extended out) -->
        <path d="M42 66 Q34 58 28 50 Q25 44 26 38" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="26" cy="38" r="3" fill="${ACTIVE}" opacity="0.7"/>
        <circle cx="26" cy="38" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.25"/>
        <!-- Index finger (fully extended UP) -->
        <path d="M50 52 L48 36 L46 22 L45 8" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="45" cy="8" r="3.5" fill="${ACTIVE}" opacity="0.9"/>
        <circle cx="45" cy="8" r="7" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.35"/>
        <!-- Middle finger (partially bent — half extended) -->
        <path d="M60 50 L59 38 L60 28 Q62 24 64 28" stroke="#88bbcc" stroke-width="${SW}" opacity="0.7"/>
        <circle cx="64" cy="28" r="2.5" fill="#88bbcc" opacity="0.6"/>
        <!-- Ring finger (partially bent) -->
        <path d="M70 52 L71 42 L72 34 Q73 30 75 34" stroke="#88bbcc" stroke-width="${SW}" opacity="0.7"/>
        <circle cx="75" cy="34" r="2.5" fill="#88bbcc" opacity="0.6"/>
        <!-- Pinky (curled) -->
        <path d="M76 56 Q79 50 78 44 Q76 40 73 43" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="73" cy="43" r="2" fill="${DIM}" opacity="0.4"/>
      `)
    },

    Ox: {
      name: 'Ox',
      japanese: 'Ushi',
      emoji: '🐂',
      description: 'Rock/horns — index + pinky up, middle + ring curled',
      svg: svg(`
        <!-- Palm -->
        <path d="M42 105 Q38 88 40 72 Q42 62 46 56 L52 52 Q58 50 62 50 Q68 50 72 52 L76 56 Q80 62 82 72 Q84 88 78 105 Z"
              stroke="${PALM}" stroke-width="${SWt}" opacity="0.3" fill="rgba(30,40,50,0.2)"/>
        ${wrist}
        <!-- Thumb (curled/relaxed) -->
        <path d="M42 68 Q38 62 36 56 Q35 50 38 47" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="38" cy="47" r="2.5" fill="${DIM}" opacity="0.5"/>
        <!-- Index finger (extended UP) -->
        <path d="M50 52 L46 36 L42 22 L39 9" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="39" cy="9" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="39" cy="9" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
        <!-- Middle finger (curled) -->
        <path d="M60 50 Q60 42 62 37 Q64 34 66 38" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="66" cy="38" r="2.5" fill="${DIM}" opacity="0.4"/>
        <!-- Ring finger (curled) -->
        <path d="M70 52 Q71 44 72 39 Q73 36 70 39" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="70" cy="39" r="2.5" fill="${DIM}" opacity="0.4"/>
        <!-- Pinky (extended UP) -->
        <path d="M76 56 L80 40 L84 26 L87 14" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="87" cy="14" r="3" fill="${ACTIVE}" opacity="0.8"/>
        <circle cx="87" cy="14" r="6" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.3"/>
      `)
    },

    Hare: {
      name: 'Hare',
      japanese: 'U',
      emoji: '🐇',
      description: 'Pinky up only, all other fingers curled',
      svg: svg(`
        <!-- Palm -->
        <path d="M42 105 Q38 88 40 72 Q42 62 46 56 L52 52 Q58 50 62 50 Q68 50 72 52 L76 56 Q80 62 82 72 Q84 88 78 105 Z"
              stroke="${PALM}" stroke-width="${SWt}" opacity="0.3" fill="rgba(30,40,50,0.2)"/>
        ${wrist}
        <!-- Thumb (curled) -->
        <path d="M42 68 Q38 63 36 58 Q36 53 39 50" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="39" cy="50" r="2.5" fill="${DIM}" opacity="0.4"/>
        <!-- Index finger (curled) -->
        <path d="M50 52 Q48 44 50 39 Q53 36 55 40" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="55" cy="40" r="2.5" fill="${DIM}" opacity="0.4"/>
        <!-- Middle finger (curled) -->
        <path d="M60 50 Q59 42 61 37 Q64 34 66 38" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="66" cy="38" r="2.5" fill="${DIM}" opacity="0.4"/>
        <!-- Ring finger (curled) -->
        <path d="M70 52 Q71 44 72 39 Q73 36 70 39" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="70" cy="39" r="2" fill="${DIM}" opacity="0.4"/>
        <!-- Pinky (extended UP — the star) -->
        <path d="M76 56 L80 40 L84 26 L87 12" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="87" cy="12" r="3.5" fill="${ACTIVE}" opacity="0.9"/>
        <circle cx="87" cy="12" r="7" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.35"/>
      `)
    },

    Rat: {
      name: 'Rat',
      japanese: 'Ne',
      emoji: '🐀',
      description: 'Thumbs up — thumb extended, all other fingers curled',
      svg: svg(`
        <!-- Palm / Fist -->
        <path d="M42 105 Q38 88 40 72 Q42 62 48 55 Q55 50 62 50 Q70 50 76 55 Q82 62 84 72 Q86 88 82 105 Z"
              stroke="${PALM}" stroke-width="${SWt}" opacity="0.3" fill="rgba(30,40,50,0.2)"/>
        ${wrist}
        <!-- Index finger (curled) -->
        <path d="M50 55 Q48 46 50 40 Q53 36 56 40 Q58 44 55 50" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="55" cy="50" r="2.5" fill="${DIM}" opacity="0.4"/>
        <!-- Middle finger (curled) -->
        <path d="M60 52 Q59 44 61 38 Q64 35 67 39 Q68 43 65 48" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="65" cy="48" r="2.5" fill="${DIM}" opacity="0.4"/>
        <!-- Ring finger (curled) -->
        <path d="M70 54 Q70 46 71 41 Q73 38 75 41 Q76 45 73 50" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="73" cy="50" r="2" fill="${DIM}" opacity="0.4"/>
        <!-- Pinky (curled) -->
        <path d="M78 56 Q78 50 79 45 Q80 42 82 45 Q83 49 80 54" stroke="${DIM}" stroke-width="${SWt}"/>
        <circle cx="80" cy="54" r="2" fill="${DIM}" opacity="0.4"/>
        <!-- Thumb (extended UP — the star) -->
        <path d="M48 55 Q42 46 38 36 L35 24 L33 12" stroke="${ACTIVE}" stroke-width="${SW}"/>
        <circle cx="33" cy="12" r="3.5" fill="${ACTIVE}" opacity="0.9"/>
        <circle cx="33" cy="12" r="7" fill="none" stroke="${ACTIVE}" stroke-width="1" opacity="0.35"/>
      `)
    }
  };

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Get full sign data (svg string, name, japanese, emoji, description)
   */
  function getSign(signName) {
    return signs[signName] || null;
  }

  /**
   * Get all signs as an ordered array
   */
  function getAllSigns() {
    return [
      signs.Tiger, signs.Snake, signs.Ram, signs.Monkey,
      signs.Boar, signs.Horse, signs.Bird, signs.Dog,
      signs.Dragon, signs.Ox, signs.Hare, signs.Rat
    ];
  }

  /**
   * Get just the SVG string for a sign (for inline use)
   */
  function getSVG(signName) {
    const sign = signs[signName];
    return sign ? sign.svg : '';
  }

  /**
   * Get a small inline version (returns SVG string, caller sets size via CSS)
   */
  function getInlineSVG(signName) {
    return getSVG(signName);
  }

  return {
    getSign,
    getAllSigns,
    getSVG,
    getInlineSVG,
    signs
  };

})();
