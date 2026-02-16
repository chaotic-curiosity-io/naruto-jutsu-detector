/**
 * app.js — Main Application Logic
 * 
 * Initializes MediaPipe Hands, manages UI state, draws landmarks,
 * and coordinates between hand-signs.js, jutsu-detector.js, and effects.js.
 */

(function () {
  'use strict';

  // ─── DOM Refs ───────────────────────────────────────────────────

  const startScreen = document.getElementById('start-screen');
  const startBtn = document.getElementById('start-btn');
  const webcam = document.getElementById('webcam');
  const landmarkCanvas = document.getElementById('landmark-canvas');
  const effectsCanvas = document.getElementById('effects-canvas');
  const currentSignEl = document.getElementById('current-sign');
  const sequencePanel = document.getElementById('sequence-panel');
  const sequenceSigns = document.getElementById('sequence-signs');
  const seqMatching = document.getElementById('seq-matching');
  const jutsuPanel = document.getElementById('jutsu-panel');
  const jutsuList = document.getElementById('jutsu-list');
  const togglePanelBtn = document.getElementById('toggle-panel');
  const debugPanel = document.getElementById('debug-panel');
  const debugToggle = document.getElementById('debug-toggle');
  const statsBar = document.getElementById('stats-bar');
  const jutsuComplete = document.getElementById('jutsu-complete');

  const guideToggle = document.getElementById('guide-toggle');
  const guideModal = document.getElementById('guide-modal');
  const guideGrid = document.getElementById('guide-grid');
  const guideClose = guideModal.querySelector('.guide-close');
  const guideBackdrop = guideModal.querySelector('.guide-backdrop');

  const landmarkCtx = landmarkCanvas.getContext('2d');
  let showDebug = false;
  let showJutsuPanel = true;
  let isRunning = false;
  let fps = 0;
  let frameCount = 0;
  let lastFpsTime = performance.now();

  // ─── MediaPipe Setup ────────────────────────────────────────────

  let hands = null;
  let faceMesh = null;
  let selfieSegmentation = null;
  let camera = null;

  // Cached face/segmentation data (updated asynchronously)
  let cachedFaceLandmarks = null;   // mirrored face landmarks array
  let cachedSegmentationMask = null; // ImageData or canvas from SelfieSegmentation
  let faceFrameCounter = 0;         // throttle FaceMesh to every 3rd frame

  async function initMediaPipe() {
    // ── Hands ──
    hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);

    // ── FaceMesh ──
    faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const raw = results.multiFaceLandmarks[0];
        // Mirror x to match the CSS-mirrored video
        cachedFaceLandmarks = raw.map(lm => ({
          x: 1.0 - lm.x,
          y: lm.y,
          z: lm.z
        }));
      } else {
        cachedFaceLandmarks = null;
      }
    });

    // ── SelfieSegmentation ──
    selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
      }
    });

    selfieSegmentation.setOptions({
      modelSelection: 1 // 1 = landscape model (faster)
    });

    selfieSegmentation.onResults((results) => {
      // results.segmentationMask is a canvas/image where person pixels ~ 1, bg ~ 0
      cachedSegmentationMask = results.segmentationMask || null;
    });

    // Start camera — sends frames to Hands every frame, FaceMesh every 3rd, Segmentation every 2nd
    camera = new Camera(webcam, {
      onFrame: async () => {
        if (!isRunning) return;

        // Always run hands (core detection)
        await hands.send({ image: webcam });

        // FaceMesh: every 3rd frame for mouth position
        faceFrameCounter++;
        if (faceFrameCounter % 3 === 0) {
          faceMesh.send({ image: webcam }).catch(() => {});
        }

        // SelfieSegmentation: every 2nd frame
        if (faceFrameCounter % 2 === 0) {
          selfieSegmentation.send({ image: webcam }).catch(() => {});
        }
      },
      width: 1280,
      height: 720
    });

    await camera.start();
    isRunning = true;
  }

  // ─── Results Handler ────────────────────────────────────────────

  function onResults(results) {
    // Resize landmark canvas to match video
    landmarkCanvas.width = webcam.videoWidth || 1280;
    landmarkCanvas.height = webcam.videoHeight || 720;

    landmarkCtx.clearRect(0, 0, landmarkCanvas.width, landmarkCanvas.height);

    // Mirror the context to match the mirrored video
    landmarkCtx.save();
    landmarkCtx.translate(landmarkCanvas.width, 0);
    landmarkCtx.scale(-1, 1);

    let bestClassification = null;

    // Collect mirrored landmarks for the effects system
    const mirroredLandmarkSets = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];

        // Draw landmarks
        drawLandmarks(landmarks, handedness);

        // Build mirrored landmarks for effects system
        // MediaPipe raw: x=0 is left of raw (un-mirrored) video
        // Effects canvas is NOT mirrored, overlays the CSS-mirrored video
        // So we mirror x: screenX = 1.0 - landmark.x
        const mirrored = landmarks.map(lm => ({
          x: 1.0 - lm.x,
          y: lm.y,
          z: lm.z
        }));
        mirroredLandmarkSets.push(mirrored);

        // Classify hand sign
        const classification = HandSignClassifier.classify(landmarks);
        if (classification && (!bestClassification || classification.confidence > bestClassification.confidence)) {
          bestClassification = classification;
        }
      }
    }

    landmarkCtx.restore();

    // Pass tracking data to Effects each frame (including face + segmentation)
    Effects.setTrackingData({
      landmarks: mirroredLandmarkSets.length > 0 ? mirroredLandmarkSets : null,
      videoElement: webcam,
      canvasWidth: landmarkCanvas.width,
      canvasHeight: landmarkCanvas.height,
      faceLandmarks: cachedFaceLandmarks,
      segmentationMask: cachedSegmentationMask
    });

    // Update sign display
    updateSignDisplay(bestClassification);

    // Feed to jutsu detector
    JutsuDetector.processSign(bestClassification);

    // Update debug
    if (showDebug && bestClassification) {
      debugPanel.textContent = HandSignClassifier.getDebugInfo(bestClassification);
    } else if (showDebug) {
      debugPanel.textContent = 'No hand detected';
    }

    // FPS counter
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastFpsTime = now;
      updateStats();
    }
  }

  // ─── Landmark Drawing ──────────────────────────────────────────

  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],       // Index
    [0, 9], [9, 10], [10, 11], [11, 12],   // Middle  
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17]              // Palm
  ];

  function drawLandmarks(landmarks, handedness) {
    const w = landmarkCanvas.width;
    const h = landmarkCanvas.height;
    const isRight = handedness?.label === 'Right';
    const color = isRight ? '#00ffcc' : '#ff66aa';

    // Draw connections
    landmarkCtx.lineWidth = 2;
    landmarkCtx.strokeStyle = color;
    landmarkCtx.globalAlpha = 0.6;

    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = landmarks[a];
      const pb = landmarks[b];
      landmarkCtx.beginPath();
      landmarkCtx.moveTo(pa.x * w, pa.y * h);
      landmarkCtx.lineTo(pb.x * w, pb.y * h);
      landmarkCtx.stroke();
    }

    // Draw landmarks
    landmarkCtx.globalAlpha = 1;
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const x = lm.x * w;
      const y = lm.y * h;

      // Fingertips get bigger dots
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const radius = isTip ? 6 : 3;

      landmarkCtx.beginPath();
      landmarkCtx.arc(x, y, radius, 0, Math.PI * 2);
      landmarkCtx.fillStyle = isTip ? '#ffffff' : color;
      landmarkCtx.fill();

      if (isTip) {
        // Glow effect on tips
        landmarkCtx.beginPath();
        landmarkCtx.arc(x, y, radius + 4, 0, Math.PI * 2);
        landmarkCtx.strokeStyle = color;
        landmarkCtx.lineWidth = 1;
        landmarkCtx.globalAlpha = 0.4;
        landmarkCtx.stroke();
        landmarkCtx.globalAlpha = 1;
      }

      // Debug: show landmark numbers
      if (showDebug) {
        landmarkCtx.font = '9px monospace';
        landmarkCtx.fillStyle = '#ffff00';
        landmarkCtx.globalAlpha = 0.7;
        landmarkCtx.fillText(i.toString(), x + 6, y - 6);
        landmarkCtx.globalAlpha = 1;
      }
    }
  }

  // ─── UI Updates ─────────────────────────────────────────────────

  function updateSignDisplay(classification) {
    const signName = currentSignEl.querySelector('.sign-name');
    const signEmoji = currentSignEl.querySelector('.sign-emoji');
    const signJapanese = currentSignEl.querySelector('.sign-japanese');
    const confidenceFill = currentSignEl.querySelector('.confidence-fill');

    if (classification && classification.sign) {
      const sign = classification.sign;
      signEmoji.textContent = HandSignClassifier.signSymbols[sign] || '';
      signName.textContent = sign.toUpperCase();
      signJapanese.textContent = HandSignClassifier.signNames[sign] || '';
      confidenceFill.style.width = (classification.confidence * 100) + '%';
      currentSignEl.classList.add('sign-active');
    } else {
      signEmoji.textContent = '✋';
      signName.textContent = 'DETECTING...';
      signJapanese.textContent = '';
      confidenceFill.style.width = '0%';
      currentSignEl.classList.remove('sign-active');
    }
  }

  function updateSequenceUI(sequence, matching) {
    if (sequence.length === 0) {
      sequencePanel.classList.remove('visible');
      return;
    }

    sequencePanel.classList.add('visible');

    // Show the best matching jutsu's full sequence
    const bestMatch = matching[0];
    if (!bestMatch) {
      seqMatching.textContent = 'No matching jutsu...';
      sequenceSigns.innerHTML = sequence.map(s =>
        `<span class="seq-sign completed">
          <span class="sign-icon">${HandSignClassifier.signSymbols[s]}</span>
          <span class="sign-text">${s}</span>
        </span>`
      ).join('<span class="seq-arrow">→</span>');
      return;
    }

    // Update matching jutsu name
    seqMatching.textContent = `${bestMatch.name} (${bestMatch.progress}/${bestMatch.total})`;

    // Build sign sequence display
    let html = '';
    for (let i = 0; i < bestMatch.signs.length; i++) {
      if (i > 0) html += '<span class="seq-arrow">→</span>';
      
      const sign = bestMatch.signs[i];
      let cls = 'seq-sign';
      if (i < sequence.length) cls += ' completed';
      else if (i === sequence.length) cls += ' current';

      const seqSvg = typeof HandSignImages !== 'undefined' ? `<span class="seq-sign-svg">${HandSignImages.getInlineSVG(sign)}</span>` : '';

      html += `<span class="${cls}">
        ${seqSvg}
        <span class="sign-icon">${HandSignClassifier.signSymbols[sign]}</span>
        <span class="sign-text">${sign}</span>
      </span>`;
    }
    sequenceSigns.innerHTML = html;
  }

  function updateJutsuCards(sequence, matching) {
    const cards = jutsuList.querySelectorAll('.jutsu-card');
    const matchIds = matching.map(m => m.id);
    
    cards.forEach(card => {
      const id = card.dataset.jutsuId;
      const jutsu = matching.find(m => m.id === id);
      
      card.classList.toggle('matching', matchIds.includes(id));
      
      // Update sign tags
      const tags = card.querySelectorAll('.jutsu-sign-tag');
      tags.forEach((tag, i) => {
        tag.classList.toggle('hit', i < (jutsu ? jutsu.progress : 0));
      });

      // Update progress bar
      const fill = card.querySelector('.jutsu-progress-fill');
      if (fill) {
        fill.style.width = jutsu ? jutsu.percentage + '%' : '0%';
      }
    });
  }

  function showJutsuComplete(jutsu) {
    const nameEl = jutsuComplete.querySelector('.jutsu-complete-name');
    const japEl = jutsuComplete.querySelector('.jutsu-complete-japanese');
    
    nameEl.textContent = jutsu.name;
    nameEl.style.color = jutsu.color;
    japEl.textContent = jutsu.japanese;

    jutsuComplete.classList.add('visible');

    // Trigger effect
    Effects.trigger(jutsu.effect);

    // Hide after delay
    setTimeout(() => {
      jutsuComplete.classList.remove('visible');
    }, 3000);
  }

  function updateStats() {
    const fpsEl = document.getElementById('stat-fps');
    const particlesEl = document.getElementById('stat-particles');
    const stateEl = document.getElementById('stat-state');

    if (fpsEl) fpsEl.textContent = fps;
    if (particlesEl) particlesEl.textContent = Effects.getParticleCount();
    
    const state = JutsuDetector.getState();
    if (stateEl) {
      stateEl.textContent = state.sequence.length > 0 
        ? `${state.sequence.length} signs` 
        : 'Ready';
    }
  }

  // ─── Build Jutsu Panel ─────────────────────────────────────────

  function buildJutsuPanel() {
    const jutsus = JutsuDetector.getJutsus();
    jutsuList.innerHTML = '';

    for (const jutsu of jutsus) {
      const card = document.createElement('div');
      card.className = 'jutsu-card';
      card.dataset.jutsuId = jutsu.id;

      card.innerHTML = `
        <div class="jutsu-name" style="color: ${jutsu.color}">${jutsu.name}</div>
        <div class="jutsu-japanese">${jutsu.japanese}</div>
        <span class="jutsu-element ${jutsu.element.toLowerCase()}">${jutsu.element}</span>
        <div class="jutsu-signs">
          ${jutsu.signs.map(s => {
            const inlineSvg = typeof HandSignImages !== 'undefined' ? HandSignImages.getInlineSVG(s) : '';
            return `<span class="jutsu-sign-tag"><span class="jutsu-sign-inline-svg">${inlineSvg}</span>${HandSignClassifier.signSymbols[s]} ${s}</span>`;
          }).join('')}
        </div>
        <div class="jutsu-progress-bar"><div class="jutsu-progress-fill" style="width: 0%"></div></div>
      `;

      jutsuList.appendChild(card);
    }
  }

  // ─── Event Handlers ─────────────────────────────────────────────

  startBtn.addEventListener('click', async () => {
    startScreen.classList.add('hidden');
    try {
      await initMediaPipe();
      Effects.init(effectsCanvas);
      Effects.startLoop();
      buildJutsuPanel();
    } catch (err) {
      console.error('Failed to initialize:', err);
      alert('Failed to access camera or load MediaPipe. Please allow camera access and try again.\n\n' + err.message);
    }
  });

  togglePanelBtn.addEventListener('click', () => {
    showJutsuPanel = !showJutsuPanel;
    jutsuPanel.classList.toggle('collapsed', !showJutsuPanel);
    togglePanelBtn.classList.toggle('shifted', !showJutsuPanel);
    togglePanelBtn.textContent = showJutsuPanel ? '📜 Hide Jutsu List' : '📜 Show Jutsu List';
  });

  debugToggle.addEventListener('click', () => {
    showDebug = !showDebug;
    debugPanel.classList.toggle('hidden', !showDebug);
    debugToggle.textContent = showDebug ? '🔧 Hide Debug' : '🔧 Show Debug';
  });

  // ─── Hand Sign Guide Modal ─────────────────────────────────────

  function buildGuideGrid() {
    const allSigns = HandSignImages.getAllSigns();
    guideGrid.innerHTML = '';
    for (const sign of allSigns) {
      const card = document.createElement('div');
      card.className = 'guide-card';
      card.innerHTML = `
        <div class="guide-card-svg">${sign.svg}</div>
        <div class="guide-card-emoji">${sign.emoji}</div>
        <div class="guide-card-name">${sign.name}</div>
        <div class="guide-card-japanese">${sign.japanese}</div>
        <div class="guide-card-desc">${sign.description}</div>
      `;
      guideGrid.appendChild(card);
    }
  }

  function openGuide() {
    if (guideGrid.children.length === 0) buildGuideGrid();
    guideModal.classList.remove('hidden');
  }

  function closeGuide() {
    guideModal.classList.add('hidden');
  }

  guideToggle.addEventListener('click', openGuide);
  guideClose.addEventListener('click', closeGuide);
  guideBackdrop.addEventListener('click', closeGuide);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Close guide modal on Escape
    if (e.key === 'Escape') {
      closeGuide();
      return;
    }
    if (e.key === 'd' || e.key === 'D') {
      debugToggle.click();
    }
    if (e.key === 'j' || e.key === 'J') {
      togglePanelBtn.click();
    }
    if (e.key === 'g' || e.key === 'G') {
      if (guideModal.classList.contains('hidden')) openGuide();
      else closeGuide();
    }
    if (e.key === 'r' || e.key === 'R') {
      JutsuDetector.resetSequence('manual');
    }
    // Test effects with number keys
    if (e.key === '1') Effects.trigger('fireball');
    if (e.key === '2') Effects.trigger('chidori');
    if (e.key === '3') Effects.trigger('shadowclone');
    if (e.key === '4') Effects.trigger('waterdragon');
  });

  // ─── Jutsu Detector Callbacks ──────────────────────────────────

  JutsuDetector.setCallbacks({
    onComplete: (jutsu) => {
      console.log('JUTSU COMPLETE:', jutsu.name);
      showJutsuComplete(jutsu);
    },
    onUpdate: (sequence, matching) => {
      updateSequenceUI(sequence, matching);
      updateJutsuCards(sequence, matching);
    },
    onReset: (reason) => {
      console.log('Sequence reset:', reason);
      sequencePanel.classList.remove('visible');
      // Reset all cards
      const cards = jutsuList.querySelectorAll('.jutsu-card');
      cards.forEach(card => {
        card.classList.remove('matching', 'completed');
        const tags = card.querySelectorAll('.jutsu-sign-tag');
        tags.forEach(t => t.classList.remove('hit'));
        const fill = card.querySelector('.jutsu-progress-fill');
        if (fill) fill.style.width = '0%';
      });
    }
  });

  // ─── Window resize ─────────────────────────────────────────────
  
  window.addEventListener('resize', () => {
    Effects.resize();
  });

})();
