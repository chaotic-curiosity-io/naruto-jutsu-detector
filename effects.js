/**
 * effects.js — Anime-Accurate Visual Effects / Particle Systems (v2)
 * 
 * Body-anchored VFX using MediaPipe tracking data:
 * - Fireball: streams FROM the actual mouth (FaceMesh landmark 13)
 * - Chidori: lightning crackles ON the detected hand, following it every frame
 * - Shadow Clone: uses SelfieSegmentation to isolate person from background
 * - Water Dragon: serpentine water dragon + subtle hand glow
 * 
 * Receives tracking data each frame via setTrackingData().
 * Coordinates: effects canvas is NOT mirrored; landmarks are pre-mirrored by caller.
 */

const Effects = (() => {

  let canvas, ctx;
  let particles = [];
  let activeEffect = null;
  let effectStartTime = 0;
  let animFrameId = null;
  let screenFlash = null;

  // ─── Tracking Data (updated each frame from app.js) ────────────
  let trackingData = {
    landmarks: null,           // array of hand landmark arrays (each 21 landmarks, 0-1 normalized, ALREADY mirrored)
    videoElement: null,        // the <video> element for snapshot capture
    canvasWidth: 1280,
    canvasHeight: 720,
    faceLandmarks: null,       // 468 face mesh landmarks (mirrored), or null
    segmentationMask: null     // canvas/image from SelfieSegmentation (UN-mirrored raw video orientation)
  };

  // Derived positions (canvas coords, computed each frame)
  let handCenter = null;      // { x, y } — center of the primary hand
  let lastHandCenter = null;  // fallback if hand tracking lost
  let mouthPos = null;        // { x, y } — actual mouth from FaceMesh
  let lastMouthPos = null;    // fallback

  // Camera shake state
  let cameraShake = { x: 0, y: 0, intensity: 0, decay: 0.9 };

  // Shadow clone captured frame (isolated person, transparent bg)
  let cloneSnapshot = null;

  // Particle cap
  const MAX_PARTICLES = 600;

  // ─── Initialization ─────────────────────────────────────────────

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // ─── Tracking Data Pipeline ─────────────────────────────────────

  function setTrackingData(data) {
    trackingData.landmarks = data.landmarks || null;
    trackingData.videoElement = data.videoElement || null;
    trackingData.canvasWidth = data.canvasWidth || 1280;
    trackingData.canvasHeight = data.canvasHeight || 720;
    trackingData.faceLandmarks = data.faceLandmarks || null;
    trackingData.segmentationMask = data.segmentationMask || null;
    _updateDerivedPositions();
  }

  function _updateDerivedPositions() {
    // ── Hand center ──
    if (trackingData.landmarks && trackingData.landmarks.length > 0) {
      const lm = trackingData.landmarks[0]; // primary hand
      if (lm && lm.length >= 21) {
        const kp = [lm[0], lm[5], lm[9], lm[13], lm[17]];
        let cx = 0, cy = 0;
        for (const p of kp) { cx += p.x; cy += p.y; }
        cx /= kp.length;
        cy /= kp.length;

        handCenter = {
          x: cx * canvas.width,
          y: cy * canvas.height
        };
        lastHandCenter = { ...handCenter };
      }
    }
    // If no hand detected, keep lastHandCenter as fallback

    // ── Mouth position from FaceMesh ──
    if (trackingData.faceLandmarks && trackingData.faceLandmarks.length > 13) {
      // Landmark 13 = upper lip center, 14 = lower lip center
      // Use average for mouth center
      const upper = trackingData.faceLandmarks[13];
      const lower = trackingData.faceLandmarks[14];
      mouthPos = {
        x: ((upper.x + lower.x) / 2) * canvas.width,
        y: ((upper.y + lower.y) / 2) * canvas.height
      };
      lastMouthPos = { ...mouthPos };
    }
    // If no face detected, keep lastMouthPos as fallback
  }

  function _getHandPos() {
    return handCenter || lastHandCenter || { x: canvas.width * 0.55, y: canvas.height * 0.5 };
  }

  function _getMouthPos() {
    return mouthPos || lastMouthPos || { x: canvas.width * 0.5, y: canvas.height * 0.3 };
  }

  // ─── Isolated Person Capture (Segmentation Mask) ────────────────

  function captureIsolatedPerson() {
    const video = trackingData.videoElement;
    const mask = trackingData.segmentationMask;
    if (!video || video.videoWidth === 0) return captureSnapshotFallback();
    if (!mask) return captureSnapshotFallback();

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // 1. Draw the video frame to a temp canvas (un-mirrored)
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = vw;
    tmpCanvas.height = vh;
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.drawImage(video, 0, 0, vw, vh);

    // 2. Draw the segmentation mask to another temp canvas to read its pixels
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = vw;
    maskCanvas.height = vh;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.drawImage(mask, 0, 0, vw, vh);

    // 3. Get pixel data from both
    const frameData = tmpCtx.getImageData(0, 0, vw, vh);
    const maskData = maskCtx.getImageData(0, 0, vw, vh);

    // 4. Apply mask to alpha channel: if mask pixel is dark (bg), set alpha to 0
    const fd = frameData.data;
    const md = maskData.data;
    for (let i = 0; i < fd.length; i += 4) {
      // Mask is grayscale — use R channel; person ≈ 255, bg ≈ 0
      const maskVal = md[i]; // R channel of mask
      if (maskVal < 128) {
        fd[i + 3] = 0; // transparent
      } else {
        // Smooth edge: use mask value as alpha for anti-aliasing
        fd[i + 3] = maskVal;
      }
    }
    tmpCtx.putImageData(frameData, 0, 0);

    // 5. Create the final mirrored canvas (to match CSS-mirrored video)
    const outCanvas = document.createElement('canvas');
    outCanvas.width = vw;
    outCanvas.height = vh;
    const outCtx = outCanvas.getContext('2d');
    outCtx.translate(vw, 0);
    outCtx.scale(-1, 1);
    outCtx.drawImage(tmpCanvas, 0, 0);

    return outCanvas;
  }

  // Fallback: capture full frame mirrored (no segmentation)
  function captureSnapshotFallback() {
    const video = trackingData.videoElement;
    if (!video || video.videoWidth === 0) return null;

    const tmpCanvas = document.createElement('canvas');
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    tmpCanvas.width = vw;
    tmpCanvas.height = vh;
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.translate(vw, 0);
    tmpCtx.scale(-1, 1);
    tmpCtx.drawImage(video, 0, 0, vw, vh);
    return tmpCanvas;
  }

  // ─── Particle Class ─────────────────────────────────────────────

  class Particle {
    constructor(opts) {
      this.x = opts.x || 0;
      this.y = opts.y || 0;
      this.vx = opts.vx || 0;
      this.vy = opts.vy || 0;
      this.ax = opts.ax || 0;
      this.ay = opts.ay || 0;
      this.size = opts.size || 5;
      this.sizeDecay = opts.sizeDecay || 0;
      this.life = opts.life || 1;
      this.maxLife = opts.life || 1;
      this.decay = opts.decay || 0.02;
      this.color = opts.color || '#ff4400';
      this.alpha = opts.alpha || 1;
      this.rotation = opts.rotation || 0;
      this.rotationSpeed = opts.rotationSpeed || 0;
      this.type = opts.type || 'circle'; // circle, spark, lightning, ring, water, smoke, image
      this.glow = opts.glow || 0;
      this.glowColor = opts.glowColor || this.color;
      this.turbulence = opts.turbulence || 0;
      this.trail = opts.trail || false;
      this.trailPositions = [];
      this.custom = opts.custom || {};
      this.imageSource = opts.imageSource || null;
      this.imageWidth = opts.imageWidth || 0;
      this.imageHeight = opts.imageHeight || 0;
      this.tint = opts.tint || null;
      this.scaleX = opts.scaleX || 1;
      this.scaleY = opts.scaleY || 1;
    }

    update(dt) {
      if (this.trail) {
        this.trailPositions.push({ x: this.x, y: this.y });
        if (this.trailPositions.length > 10) this.trailPositions.shift();
      }

      this.vx += this.ax * dt;
      this.vy += this.ay * dt;

      if (this.turbulence > 0) {
        this.vx += (Math.random() - 0.5) * this.turbulence;
        this.vy += (Math.random() - 0.5) * this.turbulence;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rotation += this.rotationSpeed * dt;
      this.life -= this.decay * dt;
      if (this.sizeDecay > 0) {
        this.size = Math.max(0, this.size - this.sizeDecay * dt);
      } else if (this.sizeDecay < 0) {
        this.size -= this.sizeDecay * dt; // grows
      }

      return this.life > 0 && (this.size > 0 || this.type === 'image');
    }

    draw(ctx) {
      const alpha = Math.max(0, this.life / this.maxLife * this.alpha);
      if (alpha <= 0.001) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      if (this.glow > 0) {
        ctx.shadowBlur = this.glow;
        ctx.shadowColor = this.glowColor;
      }

      switch (this.type) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, this.size, 0, Math.PI * 2);
          ctx.fillStyle = this.color;
          ctx.fill();
          break;

        case 'spark':
          ctx.beginPath();
          ctx.moveTo(-this.size, 0);
          ctx.lineTo(0, -this.size * 0.3);
          ctx.lineTo(this.size, 0);
          ctx.lineTo(0, this.size * 0.3);
          ctx.closePath();
          ctx.fillStyle = this.color;
          ctx.fill();
          break;

        case 'lightning':
          this._drawLightning(ctx);
          break;

        case 'ring':
          ctx.beginPath();
          ctx.arc(0, 0, this.size, 0, Math.PI * 2);
          ctx.strokeStyle = this.color;
          ctx.lineWidth = Math.max(1, this.size * 0.12);
          ctx.stroke();
          break;

        case 'water':
          ctx.beginPath();
          ctx.arc(0, 0, this.size, 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(
            -this.size * 0.3, -this.size * 0.3, 0,
            0, 0, this.size
          );
          grad.addColorStop(0, '#88ddff');
          grad.addColorStop(0.5, this.color);
          grad.addColorStop(1, '#003366');
          ctx.fillStyle = grad;
          ctx.fill();
          break;

        case 'smoke':
          ctx.beginPath();
          ctx.arc(0, 0, this.size, 0, Math.PI * 2);
          const smokeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
          smokeGrad.addColorStop(0, this.color);
          smokeGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = smokeGrad;
          ctx.fill();
          break;

        case 'image':
          this._drawImage(ctx);
          break;
      }

      // Draw trail
      if (this.trail && this.trailPositions.length > 1) {
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = alpha * 0.3;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(1, this.size * 0.5);
        ctx.beginPath();
        ctx.moveTo(this.trailPositions[0].x, this.trailPositions[0].y);
        for (let i = 1; i < this.trailPositions.length; i++) {
          ctx.lineTo(this.trailPositions[i].x, this.trailPositions[i].y);
        }
        ctx.stroke();
      }

      ctx.restore();
    }

    _drawLightning(ctx) {
      const segments = 5 + Math.floor(Math.random() * 5);
      const len = this.size * 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const x = (Math.random() - 0.5) * len * 0.6;
        const y = t * len;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, 2 + Math.random() * 3);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    _drawImage(ctx) {
      if (!this.imageSource) return;
      const w = this.imageWidth * Math.abs(this.scaleX);
      const h = this.imageHeight * Math.abs(this.scaleY);
      ctx.drawImage(this.imageSource, -w / 2, -h / 2, w, h);
      // Apply tint overlay
      if (this.tint) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = this.tint;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }

  // ─── Utility: Jagged Lightning Bolt (recursive subdivision) ─────

  function generateLightningBolt(x1, y1, x2, y2, displacement, branchChance, depth) {
    if (depth <= 0 || displacement < 2) {
      return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    }
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * displacement;
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * displacement;
    const left = generateLightningBolt(x1, y1, midX, midY, displacement * 0.55, branchChance * 0.7, depth - 1);
    const right = generateLightningBolt(midX, midY, x2, y2, displacement * 0.55, branchChance * 0.7, depth - 1);
    left.pop();
    const result = left.concat(right);

    if (Math.random() < branchChance && depth > 1) {
      const angle = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - 0.5) * 1.2;
      const branchLen = displacement * 1.2;
      const bx = midX + Math.cos(angle) * branchLen;
      const by = midY + Math.sin(angle) * branchLen;
      const branch = generateLightningBolt(midX, midY, bx, by, displacement * 0.4, 0, depth - 2);
      result._branches = result._branches || [];
      result._branches.push(branch);
    }
    return result;
  }

  function drawLightningPath(ctx, points, lineWidth, color, glowColor) {
    if (points.length < 2) return;
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = glowColor || color;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, lineWidth * 0.4);
    ctx.shadowBlur = 5;
    ctx.stroke();
    ctx.restore();

    if (points._branches) {
      for (const branch of points._branches) {
        drawLightningPath(ctx, branch, lineWidth * 0.5, color, glowColor);
      }
    }
  }

  // ─── Screen-Edge Electricity (Chidori) ──────────────────────────

  function drawScreenEdgeLightning(ctx, intensity) {
    const w = canvas.width;
    const h = canvas.height;
    const count = Math.floor(2 + intensity * 4);

    for (let i = 0; i < count; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x1, y1, x2, y2;
      const pos1 = Math.random();
      const pos2 = Math.min(1, pos1 + 0.1 + Math.random() * 0.3);

      switch (edge) {
        case 0: x1 = pos1 * w; y1 = 0; x2 = pos2 * w; y2 = 0; break;
        case 1: x1 = w; y1 = pos1 * h; x2 = w; y2 = pos2 * h; break;
        case 2: x1 = pos1 * w; y1 = h; x2 = pos2 * w; y2 = h; break;
        case 3: x1 = 0; y1 = pos1 * h; x2 = 0; y2 = pos2 * h; break;
      }

      const disp = 15 + Math.random() * 30;
      const pts = generateLightningBolt(x1, y1, x2, y2, disp, 0.3, 4);
      for (let j = 1; j < pts.length - 1; j++) {
        if (edge === 0) pts[j].y += Math.random() * 20;
        if (edge === 1) pts[j].x -= Math.random() * 20;
        if (edge === 2) pts[j].y -= Math.random() * 20;
        if (edge === 3) pts[j].x += Math.random() * 20;
      }

      ctx.save();
      ctx.globalAlpha = 0.3 + Math.random() * 0.4;
      drawLightningPath(ctx, pts, 1 + Math.random() * 1.5, '#4488ff', '#2266cc');
      ctx.restore();
    }
  }

  // ─── Heat Shimmer Post-Processing (Fireball) ───────────────────

  function applyHeatShimmer(ctx, cx, cy, radius, intensity) {
    if (intensity < 0.05) return;
    const sliceCount = 8;
    const time = performance.now() * 0.003;
    ctx.save();
    ctx.globalAlpha = 0.06 * intensity;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < sliceCount; i++) {
      const angle = (i / sliceCount) * Math.PI * 2 + time;
      const dx = Math.sin(angle + time * 2) * 3 * intensity;
      const dy = Math.cos(angle * 1.3 + time) * 3 * intensity;
      const r = radius * (0.5 + 0.5 * Math.sin(angle));
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
      const shGrad = ctx.createRadialGradient(cx + dx, cy + dy, 0, cx + dx, cy + dy, r);
      shGrad.addColorStop(0, 'rgba(255,150,50,0.15)');
      shGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shGrad;
      ctx.fill();
    }
    ctx.restore();
  }

  // ─── Camera Shake ───────────────────────────────────────────────

  function triggerShake(intensity) {
    cameraShake.intensity = intensity;
  }

  function updateShake() {
    if (cameraShake.intensity < 0.5) {
      cameraShake.x = 0;
      cameraShake.y = 0;
      cameraShake.intensity = 0;
      return;
    }
    cameraShake.x = (Math.random() - 0.5) * cameraShake.intensity;
    cameraShake.y = (Math.random() - 0.5) * cameraShake.intensity;
    cameraShake.intensity *= cameraShake.decay;
  }

  // ─── Spawn Helper (respects particle cap) ──────────────────────

  function spawn(opts) {
    if (particles.length >= MAX_PARTICLES) return null;
    const p = new Particle(opts);
    particles.push(p);
    return p;
  }

  function spawnDelayed(opts, delayMs) {
    setTimeout(() => spawn(opts), delayMs);
  }

  // ─── Color Helpers ──────────────────────────────────────────────

  function randomFireColor() {
    const colors = ['#ff2200', '#ff4400', '#ff6600', '#ff8800', '#ffaa00', '#ffcc00', '#ffee88', '#ffffff'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function fireColorByLayer(layer) {
    if (layer < 0.15) return '#ffffff';
    if (layer < 0.3) return '#ffee88';
    if (layer < 0.5) return '#ffaa00';
    if (layer < 0.7) return '#ff6600';
    if (layer < 0.85) return '#ff3300';
    return '#882200';
  }

  function randomWaterColor() {
    const colors = ['#0044aa', '#0066cc', '#0088ff', '#44aaff', '#66ccff', '#88ddff', '#aaeeff'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── EFFECT: FIREBALL — Fire streams FROM the mouth ────────────
  // ═══════════════════════════════════════════════════════════════

  function triggerFireball() {
    activeEffect = 'fireball';
    effectStartTime = performance.now();
    triggerShake(8);

    // We'll use a continuous spawner that reads mouth position each frame
    // so fire always originates from the actual mouth even if user moves
    let frame = 0;
    const totalFrames = 140; // ~4.5s at 30fps

    const fireInterval = setInterval(() => {
      if (frame > totalFrames || activeEffect !== 'fireball') {
        clearInterval(fireInterval);
        return;
      }

      const t = frame / totalFrames;
      const mouth = _getMouthPos();

      // ── Phase 1: Chakra gathering at mouth (0 - 0.12) ──
      if (t < 0.12) {
        const phaseT = t / 0.12;
        // Small bright particles swirling TOWARD the mouth (converging)
        const count = 3 + Math.floor(phaseT * 5);
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 40 + Math.random() * 80;
          const startX = mouth.x + Math.cos(angle) * dist;
          const startY = mouth.y + Math.sin(angle) * dist;
          spawn({
            x: startX,
            y: startY,
            vx: (mouth.x - startX) * (2 + phaseT * 3),
            vy: (mouth.y - startY) * (2 + phaseT * 3),
            size: 3 + Math.random() * 6,
            life: 1,
            decay: 2.5 + Math.random(),
            color: Math.random() > 0.3 ? '#ffcc00' : '#ffffff',
            glow: 20 + Math.random() * 15,
            glowColor: '#ff8800',
            type: 'circle',
            alpha: 0.8
          });
        }
        // Core glow at mouth
        spawn({
          x: mouth.x + (Math.random() - 0.5) * 8,
          y: mouth.y + (Math.random() - 0.5) * 8,
          vx: 0, vy: 0,
          size: 8 + phaseT * 15,
          life: 1,
          decay: 3,
          color: '#ffffff',
          glow: 40,
          glowColor: '#ffaa00',
          type: 'circle',
          alpha: 0.7 * phaseT
        });
      }

      // ── Phase 2: BLAST — fire streams outward in cone from mouth (0.12 - 0.65) ──
      if (t >= 0.1 && t < 0.65) {
        const blastT = (t - 0.1) / 0.55;

        // Flash at start of blast
        if (frame === Math.floor(totalFrames * 0.12)) {
          screenFlash = { color: '#ff4400', alpha: 0.6, decay: 0.02 };
          triggerShake(15);
        }

        // Fire cone: particles shoot outward from mouth
        // Direction: radially outward from mouth, expanding as a cone "toward camera"
        const particlesPerFrame = Math.floor(5 + blastT * 12);
        for (let i = 0; i < particlesPerFrame; i++) {
          // Cone expanding outward from mouth
          const angle = Math.random() * Math.PI * 2;
          const speed = 80 + blastT * 350 + Math.random() * 150;
          const layer = Math.random();
          const coneSpread = 0.3 + blastT * 0.7; // tighter at start, wider over time

          // Particles radiate outward from mouth position
          const dirX = Math.cos(angle) * coneSpread;
          const dirY = Math.sin(angle) * coneSpread + 0.15; // slight downward bias (gravity/realism)

          spawn({
            x: mouth.x + (Math.random() - 0.5) * (10 + blastT * 30),
            y: mouth.y + (Math.random() - 0.5) * (10 + blastT * 30),
            vx: dirX * speed,
            vy: dirY * speed,
            ax: 0,
            ay: 20 + Math.random() * 30,
            size: (1 - layer) * 18 + 4 + Math.random() * 12,
            sizeDecay: 1.5 + Math.random() * 2,
            life: 1,
            decay: 0.3 + Math.random() * 0.3,
            color: fireColorByLayer(layer),
            glow: (1 - layer) * 30 + 8,
            glowColor: '#ff6600',
            turbulence: 1.5 + layer * 3,
            type: Math.random() > 0.15 ? 'circle' : 'spark',
            alpha: 0.75 + (1 - layer) * 0.25
          });
        }

        // Bright core stream right at mouth
        if (frame % 2 === 0) {
          spawn({
            x: mouth.x + (Math.random() - 0.5) * 6,
            y: mouth.y + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            size: 15 + Math.random() * 20,
            life: 1,
            decay: 2,
            color: '#ffffff',
            glow: 50,
            glowColor: '#ffcc00',
            type: 'circle',
            alpha: 0.9
          });
        }
      }

      // ── Phase 3: Aftermath — embers, smoke, dissipation (0.55 - 1.0) ──
      if (t >= 0.55) {
        const afterT = (t - 0.55) / 0.45;

        // Floating embers rising from mouth area
        if (frame % 3 === 0) {
          const emberSpread = 100 + afterT * 250;
          for (let i = 0; i < 3; i++) {
            spawn({
              x: mouth.x + (Math.random() - 0.5) * emberSpread,
              y: mouth.y + (Math.random() - 0.5) * emberSpread * 0.5,
              vx: (Math.random() - 0.5) * 25,
              vy: -30 - Math.random() * 70,
              size: 2 + Math.random() * 4,
              sizeDecay: 0.2,
              life: 1,
              decay: 0.25 + Math.random() * 0.2,
              color: Math.random() > 0.5 ? '#ffaa00' : '#ff6600',
              glow: 8 + Math.random() * 10,
              glowColor: '#ff4400',
              type: 'spark',
              turbulence: 1.5,
              alpha: 0.6 * (1 - afterT)
            });
          }
        }

        // Smoke wisps from mouth
        if (frame % 5 === 0 && afterT < 0.7) {
          const smokeAngle = Math.random() * Math.PI * 2;
          spawn({
            x: mouth.x + Math.cos(smokeAngle) * (30 + Math.random() * 60),
            y: mouth.y + Math.sin(smokeAngle) * (30 + Math.random() * 60),
            vx: Math.cos(smokeAngle) * 15 + (Math.random() - 0.5) * 10,
            vy: -20 - Math.random() * 30,
            size: 20 + Math.random() * 35,
            sizeDecay: 0.8,
            life: 1,
            decay: 0.18 + Math.random() * 0.1,
            color: '#443322',
            type: 'smoke',
            alpha: 0.3 * (1 - afterT),
            turbulence: 1.5
          });
        }
      }

      frame++;
    }, 32);

    scheduleEffectEnd(4500);
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── EFFECT: CHIDORI — Lightning ON the hand ───────────────────
  // ═══════════════════════════════════════════════════════════════

  let chidoriInterval = null;

  function triggerChidori() {
    activeEffect = 'chidori';
    effectStartTime = performance.now();
    screenFlash = { color: '#4488ff', alpha: 0.35, decay: 0.012 };
    triggerShake(6);

    if (chidoriInterval) clearInterval(chidoriInterval);

    let frame = 0;
    const totalFrames = 115; // ~3.5s at 30fps

    chidoriInterval = setInterval(() => {
      if (frame > totalFrames || activeEffect !== 'chidori') {
        clearInterval(chidoriInterval);
        chidoriInterval = null;
        return;
      }

      const t = frame / totalFrames;
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.2);
      const intensity = Math.min(1, t * 2) * (0.6 + 0.4 * pulse);

      // Read hand position EVERY FRAME — this is the key to body-anchoring
      const hand = _getHandPos();

      // ── Core energy ball: tight bright cluster right at hand ──
      const coreCount = Math.floor(3 + intensity * 6);
      for (let i = 0; i < coreCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * (12 + intensity * 15); // tight cluster
        spawn({
          x: hand.x + Math.cos(a) * r,
          y: hand.y + Math.sin(a) * r,
          vx: (Math.random() - 0.5) * 20, // slow movement — stays near hand
          vy: (Math.random() - 0.5) * 20,
          size: 3 + Math.random() * 7,
          life: 1,
          decay: 1.8 + Math.random(),
          color: Math.random() > 0.3 ? '#aaddff' : '#ffffff',
          glow: 25 + Math.random() * 20,
          glowColor: '#4488ff',
          type: 'circle',
          alpha: 0.9
        });
      }

      // ── Bright aura glow at hand position (drawn as large fading circle) ──
      if (frame % 2 === 0) {
        spawn({
          x: hand.x,
          y: hand.y,
          vx: 0, vy: 0,
          size: 30 + intensity * 40,
          life: 1,
          decay: 4, // fades fast
          color: '#4488ff',
          glow: 60 + intensity * 40,
          glowColor: '#2266dd',
          type: 'circle',
          alpha: 0.15 + intensity * 0.1
        });
      }

      // ── Short lightning bolts FROM hand outward (50-120px) ──
      if (frame % 2 === 0) {
        const boltCount = 3 + Math.floor(Math.random() * 4 * intensity);
        for (let i = 0; i < boltCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const len = 50 + Math.random() * 70 * intensity; // SHORT — stays near hand
          const ex = hand.x + Math.cos(angle) * len;
          const ey = hand.y + Math.sin(angle) * len;
          const bolt = generateLightningBolt(hand.x, hand.y, ex, ey, len * 0.35, 0.4, 5);
          spawn({
            x: 0, y: 0,
            size: 0,
            life: 1,
            decay: 5 + Math.random() * 3, // very short-lived
            color: '#44aaff',
            type: 'circle',
            alpha: 0.85 + Math.random() * 0.15,
            custom: { bolt, lineWidth: 1.5 + Math.random() * 2 }
          });
        }
      }

      // ── Spark particles emitting from hand ──
      if (frame % 2 === 0) {
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          spawn({
            x: hand.x + (Math.random() - 0.5) * 20,
            y: hand.y + (Math.random() - 0.5) * 20,
            vx: Math.cos(a) * (80 + Math.random() * 180),
            vy: Math.sin(a) * (80 + Math.random() * 180),
            size: 2 + Math.random() * 4,
            life: 1,
            decay: 2 + Math.random() * 2,
            color: '#aaddff',
            glow: 10,
            glowColor: '#88bbff',
            type: 'spark',
            trail: true,
            alpha: 0.7
          });
        }
      }

      // ── Intensify over time: more frequent/bigger bolts ──
      if (t > 0.5 && frame % 4 === 0) {
        // Extra medium-length bolts as effect intensifies
        const angle = Math.random() * Math.PI * 2;
        const len = 80 + Math.random() * 120;
        const ex = hand.x + Math.cos(angle) * len;
        const ey = hand.y + Math.sin(angle) * len;
        const bolt = generateLightningBolt(hand.x, hand.y, ex, ey, len * 0.4, 0.5, 6);
        spawn({
          x: 0, y: 0, size: 0,
          life: 1, decay: 4,
          color: '#66bbff', type: 'circle',
          alpha: 0.9,
          custom: { bolt, lineWidth: 2 + Math.random() * 2 }
        });
      }

      // ── Random bright flash/strobe at hand position ──
      if (Math.random() < 0.12 * intensity) {
        screenFlash = { color: '#88ccff', alpha: 0.12 + Math.random() * 0.12, decay: 0.08 };
        triggerShake(3);
      }

      // ── Big arc to screen edge (occasionally) ──
      if (frame % 15 === 0 && Math.random() < 0.5) {
        const edge = Math.floor(Math.random() * 4);
        let ex, ey;
        switch (edge) {
          case 0: ex = Math.random() * canvas.width; ey = 0; break;
          case 1: ex = canvas.width; ey = Math.random() * canvas.height; break;
          case 2: ex = Math.random() * canvas.width; ey = canvas.height; break;
          case 3: ex = 0; ey = Math.random() * canvas.height; break;
        }
        const bolt = generateLightningBolt(hand.x, hand.y, ex, ey,
          Math.hypot(ex - hand.x, ey - hand.y) * 0.2, 0.3, 6);
        spawn({
          x: 0, y: 0, size: 0,
          life: 1, decay: 5,
          color: '#4488ff', type: 'circle',
          alpha: 0.4,
          custom: { bolt, lineWidth: 1 + Math.random() }
        });
      }

      // ── Expanding ring from hand ──
      if (frame % 10 === 0) {
        spawn({
          x: hand.x,
          y: hand.y,
          size: 8,
          sizeDecay: -100,
          life: 1,
          decay: 1.8,
          color: '#4488ff',
          glow: 15,
          type: 'ring',
          alpha: 0.35
        });
      }

      frame++;
    }, 30);

    scheduleEffectEnd(3500);
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── EFFECT: SHADOW CLONE — Isolated person with removed bg ────
  // ═══════════════════════════════════════════════════════════════

  function triggerShadowClone() {
    activeEffect = 'shadowclone';
    effectStartTime = performance.now();
    screenFlash = { color: '#ffffff', alpha: 0.7, decay: 0.035 };
    triggerShake(10);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Capture isolated person (background removed via segmentation)
    cloneSnapshot = captureIsolatedPerson();

    // Phase 1: BIG smoke poof (0 - 1200ms)
    const smokeCount = 80;
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 200;
      const delay = Math.random() * 400;
      spawnDelayed({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: 25 + Math.random() * 55,
        sizeDecay: 3 + Math.random() * 2,
        life: 1,
        decay: 0.25 + Math.random() * 0.2,
        color: Math.random() > 0.3 ? 'rgba(220,220,230,0.9)' : 'rgba(180,180,200,0.8)',
        type: 'smoke',
        alpha: 0.65 + Math.random() * 0.2,
        turbulence: 3
      }, delay);
    }

    // Second ring of denser smoke
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      spawnDelayed({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * 120,
        vy: Math.sin(angle) * 120,
        size: 40 + Math.random() * 30,
        sizeDecay: 2,
        life: 1,
        decay: 0.2,
        color: 'rgba(200,200,210,0.9)',
        type: 'smoke',
        alpha: 0.5,
        turbulence: 2
      }, 100 + i * 15);
    }

    // Phase 2: Clones sliding outward (800ms - end)
    if (cloneSnapshot) {
      // 3 clones: left, left-center, right, right-center offsets
      const cloneOffsets = [-0.32, -0.12, 0.12, 0.32];
      const cloneW = canvas.width * 0.3;
      const cloneH = (cloneW / cloneSnapshot.width) * cloneSnapshot.height;

      cloneOffsets.forEach((offsetFrac, idx) => {
        const targetX = cx + offsetFrac * canvas.width;
        const delay = 800 + idx * 100;

        setTimeout(() => {
          const p = spawn({
            x: cx,
            y: cy,
            vx: (targetX - cx) * 0.7,
            vy: 0,
            ax: -(targetX - cx) * 0.2, // decelerate to target
            size: 1,
            life: 1,
            decay: 0.14, // longer lifespan
            color: '#ffffff',
            type: 'image',
            imageSource: cloneSnapshot,
            imageWidth: cloneW,
            imageHeight: cloneH,
            tint: idx % 2 === 0 ? 'rgba(100,120,220,0.3)' : 'rgba(140,100,220,0.3)',
            alpha: 0.55,
            scaleX: 1,
            scaleY: 1
          });

          // Sparkle trail behind each clone
          for (let j = 0; j < 12; j++) {
            spawnDelayed({
              x: cx + (targetX - cx) * (j / 12) * 0.5,
              y: cy + (Math.random() - 0.5) * 80,
              vx: (Math.random() - 0.5) * 20,
              vy: -15 - Math.random() * 25,
              size: 2 + Math.random() * 4,
              life: 1,
              decay: 0.7,
              color: '#ccbbff',
              glow: 8,
              type: 'spark',
              alpha: 0.6
            }, j * 40);
          }
        }, delay);
      });
    }

    scheduleEffectEnd(4000);
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── EFFECT: WATER DRAGON ──────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  let dragonInterval = null;

  function triggerWaterDragon() {
    activeEffect = 'waterdragon';
    effectStartTime = performance.now();
    screenFlash = { color: '#0055aa', alpha: 0.35, decay: 0.01 };
    triggerShake(5);

    if (dragonInterval) clearInterval(dragonInterval);

    const cx = canvas.width / 2;
    const baseY = canvas.height;

    // Water splash at the base
    for (let i = 0; i < 40; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      spawnDelayed({
        x: cx + (Math.random() - 0.5) * 80,
        y: baseY,
        vx: Math.cos(angle) * (40 + Math.random() * 100),
        vy: Math.sin(angle) * (60 + Math.random() * 120),
        ay: 60,
        size: 4 + Math.random() * 8,
        sizeDecay: 0.8,
        life: 1,
        decay: 0.3 + Math.random() * 0.2,
        color: randomWaterColor(),
        glow: 8,
        glowColor: '#0088ff',
        type: 'water',
        alpha: 0.7
      }, Math.random() * 500);
    }

    // Splash rings at base
    for (let i = 0; i < 6; i++) {
      spawnDelayed({
        x: cx,
        y: baseY - 30,
        size: 15,
        sizeDecay: -70,
        life: 1,
        decay: 0.6,
        color: '#4499cc',
        glow: 12,
        type: 'ring',
        alpha: 0.4
      }, i * 250);
    }

    // Dragon path
    let dFrame = 0;
    const totalDFrames = 135;

    dragonInterval = setInterval(() => {
      if (dFrame > totalDFrames || activeEffect !== 'waterdragon') {
        clearInterval(dragonInterval);
        dragonInterval = null;

        // Finale: rain droplets
        for (let i = 0; i < 40; i++) {
          spawnDelayed({
            x: Math.random() * canvas.width,
            y: -10,
            vx: (Math.random() - 0.5) * 20,
            vy: 100 + Math.random() * 200,
            size: 2 + Math.random() * 4,
            sizeDecay: 0.2,
            life: 1,
            decay: 0.3,
            color: '#88ccff',
            glow: 5,
            type: 'water',
            alpha: 0.5
          }, Math.random() * 1000);
        }
        return;
      }

      const t = dFrame / totalDFrames;

      // Serpentine path
      let pathX, pathY, headSize;
      if (t < 0.7) {
        const riseT = t / 0.7;
        pathX = cx + Math.sin(riseT * Math.PI * 3) * (120 + riseT * 60);
        pathY = baseY - riseT * canvas.height * 0.85;
        headSize = 15 + riseT * 10;
      } else if (t < 0.85) {
        const loopT = (t - 0.7) / 0.15;
        const loopAngle = loopT * Math.PI * 1.5;
        pathX = cx + Math.cos(loopAngle) * 100;
        pathY = canvas.height * 0.15 + Math.sin(loopAngle) * 80;
        headSize = 25;
      } else {
        const diveT = (t - 0.85) / 0.15;
        pathX = cx + (1 - diveT) * 50;
        pathY = canvas.height * 0.15 + diveT * canvas.height * 0.5;
        headSize = 25 + diveT * 40;
      }

      // Dragon body particles
      const bodyCount = 4 + Math.floor(t * 3);
      for (let i = 0; i < bodyCount; i++) {
        spawn({
          x: pathX + (Math.random() - 0.5) * 25,
          y: pathY + (Math.random() - 0.5) * 25,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          size: 6 + Math.random() * headSize * 0.6,
          sizeDecay: 1.5,
          life: 1,
          decay: 0.35 + Math.random() * 0.2,
          color: randomWaterColor(),
          glow: 15,
          glowColor: '#0066cc',
          type: 'water',
          turbulence: 2,
          alpha: 0.75
        });
      }

      // Dragon head
      if (dFrame % 2 === 0) {
        const headAngle = t < 0.7 ? -Math.PI / 2 : (t < 0.85 ? Math.PI : Math.PI / 2);
        for (let i = 0; i < 5; i++) {
          const spread = (i - 2) * 8;
          spawn({
            x: pathX + Math.cos(headAngle + Math.PI / 2) * spread,
            y: pathY + Math.sin(headAngle + Math.PI / 2) * spread,
            vx: Math.cos(headAngle) * 30,
            vy: Math.sin(headAngle) * 30,
            size: 5 + Math.random() * 6,
            life: 1,
            decay: 0.8,
            color: '#88ddff',
            glow: 20,
            glowColor: '#44aaff',
            type: 'circle',
            alpha: 0.9
          });
        }
      }

      // Spray particles
      if (dFrame % 3 === 0) {
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          spawn({
            x: pathX,
            y: pathY,
            vx: Math.cos(a) * (50 + Math.random() * 80),
            vy: Math.sin(a) * (50 + Math.random() * 80),
            size: 2 + Math.random() * 5,
            life: 1,
            decay: 0.9,
            color: '#aaeeff',
            glow: 6,
            type: 'circle',
            trail: true,
            alpha: 0.5
          });
        }
      }

      // Mist
      if (dFrame % 5 === 0) {
        spawn({
          x: pathX + (Math.random() - 0.5) * 80,
          y: pathY + (Math.random() - 0.5) * 80,
          vx: (Math.random() - 0.5) * 10,
          vy: -5 - Math.random() * 10,
          size: 20 + Math.random() * 30,
          sizeDecay: 0.5,
          life: 1,
          decay: 0.2,
          color: 'rgba(150,200,240,0.5)',
          type: 'smoke',
          alpha: 0.25,
          turbulence: 1
        });
      }

      // ── Subtle blue glow on the user's hands during the jutsu ──
      if (dFrame % 3 === 0) {
        const hand = _getHandPos();
        spawn({
          x: hand.x + (Math.random() - 0.5) * 10,
          y: hand.y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          size: 20 + Math.random() * 15,
          life: 1,
          decay: 2,
          color: '#4499ff',
          glow: 30,
          glowColor: '#2266cc',
          type: 'circle',
          alpha: 0.15
        });
      }

      dFrame++;
    }, 33);

    scheduleEffectEnd(4500);
  }

  // ─── Schedule Effect End ────────────────────────────────────────

  function scheduleEffectEnd(duration) {
    setTimeout(() => {
      activeEffect = null;
      if (chidoriInterval) { clearInterval(chidoriInterval); chidoriInterval = null; }
      if (dragonInterval) { clearInterval(dragonInterval); dragonInterval = null; }
    }, duration);
  }

  // ─── Jutsu Name Display (Dramatic Brush Stroke Reveal) ─────────

  function drawJutsuName() {
    const elapsed = performance.now() - effectStartTime;
    const jutsuNames = {
      fireball: { text: 'Katon: Gōkakyū no Jutsu!', kanji: '火遁・豪火球の術' },
      chidori: { text: 'Chidori!', kanji: '千鳥' },
      shadowclone: { text: 'Kage Bunshin no Jutsu!', kanji: '影分身の術' },
      waterdragon: { text: 'Suiton: Suiryūdan no Jutsu!', kanji: '水遁・水龍弾の術' }
    };

    const jutsuColors = {
      fireball: '#ff4400',
      chidori: '#44aaff',
      shadowclone: '#bb88ff',
      waterdragon: '#0088ff'
    };

    const info = jutsuNames[activeEffect];
    if (!info) return;
    const color = jutsuColors[activeEffect] || '#ffffff';

    const revealDuration = 800;
    const holdDuration = 2000;
    const fadeDuration = 800;

    let alpha = 1;
    let revealFrac = Math.min(1, elapsed / revealDuration);

    if (elapsed > revealDuration + holdDuration) {
      alpha = Math.max(0, 1 - (elapsed - revealDuration - holdDuration) / fadeDuration);
    }
    if (alpha <= 0) return;

    const textY = canvas.height * 0.18;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const kanjiSize = Math.min(72, canvas.width * 0.06);
    ctx.font = `bold ${kanjiSize}px "Hiragino Kaku Gothic Pro", "Yu Gothic", "Noto Sans JP", sans-serif`;
    const kanjiWidth = ctx.measureText(info.kanji).width;

    const clipX = canvas.width / 2 - kanjiWidth / 2 - 20;
    const clipW = (kanjiWidth + 40) * revealFrac;

    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, textY - kanjiSize, clipW, kanjiSize * 3.5);
    ctx.clip();

    ctx.shadowBlur = 30;
    ctx.shadowColor = color;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(info.kanji, canvas.width / 2, textY);
    ctx.shadowBlur = 60;
    ctx.fillText(info.kanji, canvas.width / 2, textY);

    const romajiSize = Math.min(28, canvas.width * 0.025);
    ctx.font = `bold ${romajiSize}px "Segoe UI", sans-serif`;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    ctx.fillText(info.text, canvas.width / 2, textY + kanjiSize * 0.8);

    ctx.restore(); // clip

    if (revealFrac < 1) {
      const lineY = textY + kanjiSize * 0.4;
      const lineX = clipX + clipW;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.globalAlpha = alpha * (1 - revealFrac) * 2;
      ctx.beginPath();
      ctx.moveTo(lineX - 30, lineY - 10);
      ctx.lineTo(lineX, lineY);
      ctx.lineTo(lineX - 20, lineY + 10);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ─── Per-Effect Continuous Updates ──────────────────────────────

  function updateActiveEffectOverlays(elapsed) {
    if (!activeEffect) return;

    // Fireball: orange screen tint + heat shimmer anchored to mouth
    if (activeEffect === 'fireball') {
      const fireT = elapsed / 4500;
      if (fireT > 0.08 && fireT < 0.7) {
        const blastIntensity = fireT < 0.15 ? (fireT - 0.08) / 0.07 : Math.max(0, 1 - (fireT - 0.15) / 0.55);
        const tintAlpha = blastIntensity * 0.2;
        ctx.save();
        ctx.globalAlpha = tintAlpha;
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Heat shimmer centered on mouth
        const mouth = _getMouthPos();
        const shimmerRadius = 60 + blastIntensity * 350;
        applyHeatShimmer(ctx, mouth.x, mouth.y, shimmerRadius, blastIntensity * 1.2);
      }
    }

    // Chidori: screen-edge lightning + blue vignette + hand glow
    if (activeEffect === 'chidori') {
      const chiT = elapsed / 3500;
      if (chiT < 0.95) {
        const intensity = Math.min(1, chiT * 2) * (0.5 + 0.5 * Math.sin(elapsed * 0.005));

        // Blue vignette
        ctx.save();
        ctx.globalAlpha = 0.08 + intensity * 0.06;
        const vGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2,
          canvas.width * 0.2, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
        vGrad.addColorStop(0, 'transparent');
        vGrad.addColorStop(1, '#112244');
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Large radial glow centered on hand (the "aura")
        const hand = _getHandPos();
        ctx.save();
        ctx.globalAlpha = 0.1 + intensity * 0.15;
        const handGlow = ctx.createRadialGradient(hand.x, hand.y, 0, hand.x, hand.y, 80 + intensity * 60);
        handGlow.addColorStop(0, 'rgba(100,180,255,0.5)');
        handGlow.addColorStop(0.4, 'rgba(68,136,255,0.2)');
        handGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = handGlow;
        ctx.fillRect(hand.x - 200, hand.y - 200, 400, 400);
        ctx.restore();

        // Edge lightning
        if (Math.random() < 0.5 + intensity * 0.5) {
          drawScreenEdgeLightning(ctx, intensity);
        }
      }
    }

    // Water dragon: blue ripple tint
    if (activeEffect === 'waterdragon') {
      const waterT = elapsed / 4500;
      if (waterT < 0.9) {
        const rippleAlpha = Math.min(0.12, (1 - waterT) * 0.15);
        ctx.save();
        ctx.globalAlpha = rippleAlpha;
        const time = performance.now() * 0.002;
        for (let i = 0; i < 3; i++) {
          const ry = canvas.height * 0.5 + Math.sin(time + i) * canvas.height * 0.3;
          ctx.beginPath();
          ctx.moveTo(0, ry);
          for (let x = 0; x < canvas.width; x += 20) {
            ctx.lineTo(x, ry + Math.sin(x * 0.02 + time * 3 + i * 2) * 8);
          }
          ctx.strokeStyle = '#0088cc';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  // ─── Draw Custom Lightning Bolts from Particles ─────────────────

  function drawCustomBolts() {
    for (const p of particles) {
      if (p.custom && p.custom.bolt) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife * p.alpha);
        drawLightningPath(ctx, p.custom.bolt, p.custom.lineWidth || 2, '#44aaff', '#2266ff');
        ctx.restore();
      }
    }
  }

  // ─── Animation Loop ─────────────────────────────────────────────

  function startLoop() {
    let lastTime = performance.now();

    function animate(time) {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      updateShake();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(cameraShake.x, cameraShake.y);

      // Screen flash
      if (screenFlash && screenFlash.alpha > 0) {
        ctx.save();
        ctx.fillStyle = screenFlash.color;
        ctx.globalAlpha = screenFlash.alpha;
        ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
        ctx.restore();
        screenFlash.alpha -= screenFlash.decay;
        if (screenFlash.alpha <= 0) screenFlash = null;
      }

      // Active effect overlays
      if (activeEffect) {
        const elapsed = performance.now() - effectStartTime;
        updateActiveEffectOverlays(elapsed);
      }

      // Update and draw particles
      particles = particles.filter(p => {
        const alive = p.update(dt * 60);
        if (alive) {
          p.draw(ctx);
        }
        return alive;
      });

      // Draw custom lightning bolts
      drawCustomBolts();

      // Jutsu name display
      if (activeEffect) {
        drawJutsuName();
      }

      ctx.restore(); // camera shake

      animFrameId = requestAnimationFrame(animate);
    }

    animFrameId = requestAnimationFrame(animate);
  }

  function stopLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  // ─── Public API ─────────────────────────────────────────────────

  return {
    init,
    resize,
    startLoop,
    stopLoop,
    setTrackingData,

    trigger(effectName) {
      particles = [];
      if (chidoriInterval) { clearInterval(chidoriInterval); chidoriInterval = null; }
      if (dragonInterval) { clearInterval(dragonInterval); dragonInterval = null; }
      activeEffect = null;
      cloneSnapshot = null;

      switch (effectName) {
        case 'fireball': triggerFireball(); break;
        case 'chidori': triggerChidori(); break;
        case 'shadowclone': triggerShadowClone(); break;
        case 'waterdragon': triggerWaterDragon(); break;
      }
    },

    isActive() {
      return activeEffect !== null;
    },

    getParticleCount() {
      return particles.length;
    }
  };
})();
