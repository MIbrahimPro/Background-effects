
// ==================== CONFIGURATION CONSTANTS ====================
const EMISSION_RATE       = 1;        // Number of particles emitted per frame
const MAX_PARTICLES       = 300;      // Maximum number of particles in the system
const PARTICLE_LIFETIME   = 50;       // Lifetime of a particle (in frames)
const GRAVITY             = -0.1;    // Upward acceleration (negative because canvas y=0 is top)
const WIND_MAX            = 0.2;      // Maximum horizontal wind effect
const PARTICLE_INITIAL_SIZE = 20;      // Starting size of each particle
const PARTICLE_FINAL_SIZE   = 2;     // Size of the particle at the end of its life

// Emitter position (bottom center of the canvas)
let emitterX = window.innerWidth / 2;
let emitterY = window.innerHeight - 50;
// let emitterY = 50;

// ==================== GLOBAL VARIABLES ====================
const canvas = document.getElementById("fireCanvas");
const ctx    = canvas.getContext("2d");
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

let particles = []; // Array to hold particle objects

// Mouse state (for wind effect)
let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

// ==================== EVENT HANDLERS ====================
window.addEventListener('resize', onResize);
window.addEventListener('mousemove', onMouseMove);

function onResize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  emitterX = canvas.width / 2;
  emitterY = canvas.height - 50;
}

function onMouseMove(event) {
  // Use the raw clientX; the wind will be computed relative to the canvas center.
  mouse.x = event.clientX;
  mouse.y = event.clientY;
}

// ==================== ANIMATION LOOP ====================
function animate() {
  requestAnimationFrame(animate);
  
  // Clear the canvas with a semi-transparent black to create a trailing effect.
  ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Compute wind strength based on mouse horizontal position.
  // When the mouse is at the center, wind is zero. Moving left/right adds a wind force.
  let normalizedMouse = (mouse.x - canvas.width/2) / (canvas.width/2);
  let wind = normalizedMouse * WIND_MAX;
  
  // Emit new particles if we're below the maximum count.
  for (let i = 0; i < EMISSION_RATE; i++) {
    if (particles.length < MAX_PARTICLES) {
      particles.push({
        x: emitterX,
        y: emitterY,
        vx: (Math.random() - 0.5) * 1,      // Slight random horizontal velocity
        vy: -Math.random() * 2 - 1,           // Upward velocity (negative)
        life: 0,
        lifetime: PARTICLE_LIFETIME,
        size: PARTICLE_INITIAL_SIZE
      });
    }
  }
  
  // Update and draw each particle.
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    
    // Apply wind and slight randomness to the velocity.
    p.vx += wind + (Math.random() - 0.5) * 0.05;
    p.vy += GRAVITY + (Math.random() - 0.5) * 0.05;
    
    // Update position.
    p.x += p.vx;
    p.y += p.vy;
    p.life++;
    
    // Calculate normalized lifetime (0 at birth, 1 at death).
    let norm = p.life / p.lifetime;
    
    // Update size (growing over time) and compute opacity.
    p.size = PARTICLE_INITIAL_SIZE + norm * (PARTICLE_FINAL_SIZE - PARTICLE_INITIAL_SIZE);
    let opacity = Math.max(1 - norm, 0);
    
    // Interpolate color from bright yellow to a deeper red.
    // Green channel fades from 150 to 0.
    let green = Math.floor(150 * (1 - norm));
    let color = "rgba(255, " + green + ", 0, " + opacity + ")";
    
    // Draw the particle as a circle.
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Remove particle if it has exceeded its lifetime or moved off-screen.
    if (p.life >= p.lifetime || p.y < -p.size || p.x < -p.size || p.x > canvas.width + p.size) {
      particles.splice(i, 1);
    }
  }
}

animate();
