/**
 * effects.js — Visual Effects / Particle Systems
 * 
 * Particle-based canvas animations for jutsu effects:
 * - Fireball: fire particles with gravity, glow, and heat shimmer
 * - Chidori: lightning bolts crackling with electric blue glow  
 * - Shadow Clone: afterimage split with transparency fade
 * - Water Dragon: spiraling water particles forming a dragon shape
 */

const Effects = (() => {

  let canvas, ctx;
  let particles = [];
  let activeEffect = null;
  let effectStartTime = 0;
  let animFrameId = null;
  let screenFlash = null;

  // ─── Initialization ─────────────────────────────────────────────

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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
      this.type = opts.type || 'circle'; // circle, spark, lightning, ring, image
      this.glow = opts.glow || 0;
      this.glowColor = opts.glowColor || this.color;
      this.turbulence = opts.turbulence || 0;
      this.trail = opts.trail || false;
      this.trailPositions = [];
      this.custom = opts.custom || {};
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
      this.size = Math.max(0, this.size - this.sizeDecay * dt);

      return this.life > 0 && this.size > 0;
    }

    draw(ctx) {
      const progress = 1 - (this.life / this.maxLife);
      const alpha = this.life / this.maxLife * this.alpha;
      
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
          this.drawLightning(ctx);
          break;

        case 'ring':
          ctx.beginPath();
          ctx.arc(0, 0, this.size, 0, Math.PI * 2);
          ctx.strokeStyle = this.color;
          ctx.lineWidth = Math.max(1, this.size * 0.15);
          ctx.stroke();
          break;

        case 'water':
          // Teardrop shape
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

        case 'clone':
          // Ghost silhouette
          ctx.fillStyle = this.color;
          ctx.fillRect(-this.size, -this.size * 2, this.size * 2, this.size * 4);
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
      }

      // Draw trail
      if (this.trail && this.trailPositions.length > 1) {
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = alpha * 0.3;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size * 0.5;
        ctx.beginPath();
        ctx.moveTo(this.trailPositions[0].x, this.trailPositions[0].y);
        for (let i = 1; i < this.trailPositions.length; i++) {
          ctx.lineTo(this.trailPositions[i].x, this.trailPositions[i].y);
        }
        ctx.stroke();
      }

      ctx.restore();
    }

    drawLightning(ctx) {
      const segments = 5 + Math.floor(Math.random() * 5);
      const len = this.size * 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const x = (Math.random() - 0.5) * len * 0.5;
        const y = t * len;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, 2 + Math.random() * 3);
      ctx.stroke();

      // Inner white core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // ─── Effect Generators ──────────────────────────────────────────

  function triggerFireball() {
    activeEffect = 'fireball';
    effectStartTime = Date.now();
    screenFlash = { color: '#ff4400', alpha: 0.6, decay: 0.02 };

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Generate burst of fire particles
    const burstCount = 200;
    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 50 + Math.random() * 300;
      const delay = Math.random() * 30;

      setTimeout(() => {
        particles.push(new Particle({
          x: cx + (Math.random() - 0.5) * 100,
          y: cy + (Math.random() - 0.5) * 100,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 100, // Bias upward
          ax: 0,
          ay: 50 + Math.random() * 50, // Gravity
          size: 8 + Math.random() * 25,
          sizeDecay: 3,
          life: 1,
          decay: 0.3 + Math.random() * 0.4,
          color: randomFireColor(),
          glow: 20 + Math.random() * 30,
          glowColor: '#ff6600',
          turbulence: 3,
          type: Math.random() > 0.3 ? 'circle' : 'spark',
          alpha: 0.8 + Math.random() * 0.2
        }));
      }, delay * 50);
    }

    // Smoke ring
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      setTimeout(() => {
        particles.push(new Particle({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * 150,
          vy: Math.sin(angle) * 150 - 50,
          size: 30 + Math.random() * 40,
          sizeDecay: 1,
          life: 1,
          decay: 0.2,
          color: '#553322',
          type: 'smoke',
          alpha: 0.4,
          turbulence: 2
        }));
      }, 500 + i * 20);
    }

    // Central fireball
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 30;
        particles.push(new Particle({
          x: cx + Math.cos(a) * r,
          y: cy + Math.sin(a) * r,
          vx: (Math.random() - 0.5) * 40,
          vy: -20 - Math.random() * 60,
          size: 15 + Math.random() * 30,
          life: 1,
          decay: 0.5,
          color: '#ffcc00',
          glow: 40,
          glowColor: '#ff8800',
          type: 'circle',
          alpha: 0.9
        }));
      }, i * 10);
    }

    scheduleEffectEnd(4000);
  }

  function triggerChidori() {
    activeEffect = 'chidori';
    effectStartTime = Date.now();
    screenFlash = { color: '#4488ff', alpha: 0.4, decay: 0.015 };

    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;

    // Continuous lightning generation
    let frame = 0;
    const lightningInterval = setInterval(() => {
      if (frame > 100) {
        clearInterval(lightningInterval);
        return;
      }

      // Lightning bolts from center
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.push(new Particle({
          x: cx + (Math.random() - 0.5) * 100,
          y: cy + (Math.random() - 0.5) * 100,
          vx: Math.cos(angle) * (50 + Math.random() * 200),
          vy: Math.sin(angle) * (50 + Math.random() * 200),
          size: 10 + Math.random() * 20,
          life: 1,
          decay: 1.5 + Math.random(),
          color: Math.random() > 0.3 ? '#44aaff' : '#ffffff',
          glow: 25 + Math.random() * 35,
          glowColor: '#4488ff',
          type: 'lightning',
          alpha: 0.9
        }));
      }

      // Electric sparks
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 80;
        particles.push(new Particle({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 300,
          vy: (Math.random() - 0.5) * 300,
          size: 2 + Math.random() * 5,
          life: 1,
          decay: 2 + Math.random() * 2,
          color: '#aaddff',
          glow: 15,
          glowColor: '#88bbff',
          type: 'spark',
          trail: true,
          alpha: 0.8
        }));
      }

      // Expanding rings
      if (frame % 10 === 0) {
        particles.push(new Particle({
          x: cx,
          y: cy,
          size: 10,
          sizeDecay: -80, // Growing
          life: 1,
          decay: 1.2,
          color: '#4488ff',
          glow: 20,
          type: 'ring',
          alpha: 0.6
        }));
      }

      frame++;
    }, 30);

    scheduleEffectEnd(3500);
  }

  function triggerShadowClone() {
    activeEffect = 'shadowclone';
    effectStartTime = Date.now();
    screenFlash = { color: '#ffffff', alpha: 0.8, decay: 0.04 };

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Smoke poof
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 150;
      setTimeout(() => {
        particles.push(new Particle({
          x: cx + (Math.random() - 0.5) * 50,
          y: cy + (Math.random() - 0.5) * 50,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 20 + Math.random() * 50,
          sizeDecay: 2,
          life: 1,
          decay: 0.3 + Math.random() * 0.3,
          color: '#9977cc',
          type: 'smoke',
          alpha: 0.6,
          turbulence: 2
        }));
      }, Math.random() * 300);
    }

    // Clone silhouettes splitting left and right
    const cloneOffsets = [-200, -100, 100, 200];
    cloneOffsets.forEach((offset, idx) => {
      setTimeout(() => {
        // Ghost figure moving outward
        for (let j = 0; j < 15; j++) {
          particles.push(new Particle({
            x: cx,
            y: cy - 50 + j * 10,
            vx: offset * 0.8,
            vy: (Math.random() - 0.5) * 20,
            size: 8 + Math.random() * 4,
            life: 1,
            decay: 0.25,
            color: '#bb99ff',
            glow: 15,
            glowColor: '#8855cc',
            type: 'clone',
            alpha: 0.5
          }));
        }

        // Afterimage sparkle trail
        for (let j = 0; j < 20; j++) {
          setTimeout(() => {
            particles.push(new Particle({
              x: cx + (offset * 0.5 * (j / 20)),
              y: cy + (Math.random() - 0.5) * 100,
              vx: (Math.random() - 0.5) * 30,
              vy: -20 - Math.random() * 30,
              size: 3 + Math.random() * 5,
              life: 1,
              decay: 0.8,
              color: '#ddbbff',
              glow: 10,
              type: 'spark',
              alpha: 0.7
            }));
          }, j * 30);
        }
      }, 300 + idx * 150);
    });

    scheduleEffectEnd(3000);
  }

  function triggerWaterDragon() {
    activeEffect = 'waterdragon';
    effectStartTime = Date.now();
    screenFlash = { color: '#0066cc', alpha: 0.5, decay: 0.02 };

    const cx = canvas.width / 2;
    const cy = canvas.height;

    // Rising water column
    for (let i = 0; i < 150; i++) {
      setTimeout(() => {
        particles.push(new Particle({
          x: cx + (Math.random() - 0.5) * 60,
          y: cy,
          vx: (Math.random() - 0.5) * 40,
          vy: -200 - Math.random() * 300,
          ay: 30, // Slight gravity
          size: 5 + Math.random() * 12,
          sizeDecay: 1,
          life: 1,
          decay: 0.2 + Math.random() * 0.2,
          color: randomWaterColor(),
          glow: 10 + Math.random() * 15,
          glowColor: '#0088ff',
          type: 'water',
          turbulence: 2,
          alpha: 0.7
        }));
      }, i * 15);
    }

    // Dragon spiral path
    let dragonFrame = 0;
    const dragonInterval = setInterval(() => {
      if (dragonFrame > 80) {
        clearInterval(dragonInterval);
        return;
      }

      const t = dragonFrame / 80;
      // Spiral upward path
      const spiralX = cx + Math.sin(t * Math.PI * 4) * (150 + t * 50);
      const spiralY = cy - t * canvas.height * 0.8;

      // Dragon body particles
      for (let i = 0; i < 5; i++) {
        particles.push(new Particle({
          x: spiralX + (Math.random() - 0.5) * 30,
          y: spiralY + (Math.random() - 0.5) * 30,
          vx: Math.sin(t * Math.PI * 4) * 50,
          vy: -50 - Math.random() * 50,
          size: 8 + Math.random() * 15,
          life: 1,
          decay: 0.4,
          color: randomWaterColor(),
          glow: 20,
          glowColor: '#0066cc',
          type: 'water',
          turbulence: 3,
          alpha: 0.8
        }));
      }

      // Splash particles
      if (dragonFrame % 3 === 0) {
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * Math.PI * 2;
          particles.push(new Particle({
            x: spiralX,
            y: spiralY,
            vx: Math.cos(angle) * (50 + Math.random() * 100),
            vy: Math.sin(angle) * (50 + Math.random() * 100),
            size: 3 + Math.random() * 6,
            life: 1,
            decay: 1,
            color: '#88ccff',
            glow: 8,
            type: 'circle',
            trail: true,
            alpha: 0.6
          }));
        }
      }

      dragonFrame++;
    }, 30);

    // Water splash rings at the base
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        particles.push(new Particle({
          x: cx,
          y: cy - 50,
          size: 20,
          sizeDecay: -60,
          life: 1,
          decay: 0.5,
          color: '#4499cc',
          glow: 15,
          type: 'ring',
          alpha: 0.5
        }));
      }, i * 200);
    }

    scheduleEffectEnd(4500);
  }

  // ─── Helpers ────────────────────────────────────────────────────

  function randomFireColor() {
    const colors = ['#ff2200', '#ff4400', '#ff6600', '#ff8800', '#ffaa00', '#ffcc00', '#ffee88', '#ffffff'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function randomWaterColor() {
    const colors = ['#0044aa', '#0066cc', '#0088ff', '#44aaff', '#66ccff', '#88ddff', '#aaeeff'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function scheduleEffectEnd(duration) {
    setTimeout(() => {
      activeEffect = null;
    }, duration);
  }

  // ─── Animation Loop ─────────────────────────────────────────────

  function startLoop() {
    let lastTime = performance.now();

    function animate(time) {
      const dt = Math.min(0.1, (time - lastTime) / 1000); // Cap delta
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Screen flash
      if (screenFlash && screenFlash.alpha > 0) {
        ctx.save();
        ctx.fillStyle = screenFlash.color;
        ctx.globalAlpha = screenFlash.alpha;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        screenFlash.alpha -= screenFlash.decay;
        if (screenFlash.alpha <= 0) screenFlash = null;
      }

      // Update and draw particles
      particles = particles.filter(p => {
        const alive = p.update(dt * 60); // Scale to ~60fps reference
        if (alive) p.draw(ctx);
        return alive;
      });

      // Jutsu name display
      if (activeEffect) {
        drawJutsuName();
      }

      animFrameId = requestAnimationFrame(animate);
    }

    animFrameId = requestAnimationFrame(animate);
  }

  function drawJutsuName() {
    const elapsed = Date.now() - effectStartTime;
    const jutsuNames = {
      fireball: 'Katon: Gōkakyū no Jutsu!',
      chidori: 'Chidori!',
      shadowclone: 'Kage Bunshin no Jutsu!',
      waterdragon: 'Suiton: Suiryūdan no Jutsu!'
    };

    const jutsuColors = {
      fireball: '#ff4400',
      chidori: '#44aaff',
      shadowclone: '#bb88ff',
      waterdragon: '#0088ff'
    };

    const name = jutsuNames[activeEffect] || '';
    const color = jutsuColors[activeEffect] || '#ffffff';

    // Animate in
    let alpha = Math.min(1, elapsed / 500);
    if (elapsed > 2000) alpha = Math.max(0, 1 - (elapsed - 2000) / 1000);

    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Glow text
    ctx.shadowBlur = 30;
    ctx.shadowColor = color;
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, canvas.width / 2, canvas.height * 0.2);

    // Second layer for extra glow
    ctx.shadowBlur = 60;
    ctx.fillText(name, canvas.width / 2, canvas.height * 0.2);

    ctx.restore();
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

    trigger(effectName) {
      particles = []; // Clear existing
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
