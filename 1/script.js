const cursor = document.querySelector(".cursor");

document.addEventListener("mousemove", (e) => {
    const cursorWidth = cursor.offsetWidth;
    const cursorHeight = cursor.offsetHeight;
    
    cursor.style.transform = `translate(${e.clientX - cursorWidth / 2 - 5 }px, ${e.clientY - cursorHeight / 2 - 5}px)`;
});


function openNavbar() {
    document.getElementById("sideNavigationBar")
        .style.width = "50%";
}
function closeNavbar() {
    document.getElementById("sideNavigationBar")
        .style.width = "0%";
}





// ========================================
// CONFIGURATION CONSTANTS
// ========================================

// Appearance constants
const STAR_COLOR = '#000000';
const STAR_SIZE = 3;
const STAR_MIN_SCALE = 0.2;
const OVERFLOW_THRESHOLD = 0.5;

// Spacing / placement
const MIN_STAR_GAP = 85;
const ALLOWED_CLOSE_NEIGHBORS = 0;  // no star may be within MIN_STAR_GAP of another

// Star count (desired – will be adjusted on init)
let desiredStarCount = 500;  // initial value; will be re‑computed on init

// ----- NEW OPACITY CONSTANTS -----
// Base opacity (control factor)
const CONTROL_OPACITY = 0.5;
// Depth–based opacity: stars with z==STAR_MIN_SCALE get DEPTH_OPACITY_MIN,
// and stars with z==1 get DEPTH_OPACITY_MAX.
const DEPTH_OPACITY_MIN = 0.5;
const DEPTH_OPACITY_MAX = 1.0;
// Distance–based opacity: if a star is right under the mouse it gets factor 1,
// if it is DISTANCE_OPC_DIST or more away, it gets DISTANCE_OPC.
const DISTANCE_OPC = 0.2;
const DISTANCE_OPC_DIST = 200; // in canvas pixels

// ========================================
// SETUP CANVAS AND VARIABLES
// ========================================

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');

let scale = 1, width, height;
let stars = [];

let pointerX = null, pointerY = null;
let velocity = { x: 0, y: 0, tx: 0, ty: 0, z: 0.0005 };
let touchInput = false;

// ========================================
// INITIALIZATION & RESIZING
// ========================================

init();
step();

window.onresize = resize;

// canvas.onmousemove = onMouseMove;
// canvas.ontouchmove = onTouchMove;
// canvas.ontouchend = onMouseLeave;
// document.onmouseleave = onMouseLeave;

document.addEventListener("mousemove", onMouseMove);
document.addEventListener("touchmove", onTouchMove, { passive: false });
document.addEventListener("touchend", onMouseLeave);
document.addEventListener("mouseleave", onMouseLeave);

function init() {
  // Set up canvas dimensions (using device pixel ratio)
  scale = window.devicePixelRatio || 1;
  width = window.innerWidth * scale;
  height = window.innerHeight * scale;
  canvas.width = width;
  canvas.height = height;
  
  // Recompute desired star count from window dimensions (in CSS pixels)
  desiredStarCount = Math.floor((window.innerWidth + window.innerHeight) / 10);
  
  // Compute maximum possible stars if arranged in a grid of cells of side MIN_STAR_GAP.
  const maxPossible = Math.floor((window.innerWidth * window.innerHeight) / (MIN_STAR_GAP * MIN_STAR_GAP));
  while (desiredStarCount > maxPossible) {
    desiredStarCount = Math.floor(desiredStarCount / 2);
  }
  
  // Create stars with a random "z" value.
  stars = [];
  for (let i = 0; i < desiredStarCount; i++) {
    stars.push({
      x: 0,
      y: 0,
      z: STAR_MIN_SCALE + Math.random() * (1 - STAR_MIN_SCALE)
    });
  }
  
  // Generate positions for the stars that satisfy the minimum gap condition.
  generatePositions();
}

// ========================================
// POSITION GENERATION (with min gap)
// ========================================

function isValidPosition(candidate, existingPositions, minGap) {
  let count = 0;
  for (let pos of existingPositions) {
    let dx = candidate.x - pos.x;
    let dy = candidate.y - pos.y;
    if (dx * dx + dy * dy < minGap * minGap) {
      count++;
      if (count > ALLOWED_CLOSE_NEIGHBORS) return false;
    }
  }
  return true;
}

function generatePositions() {
  let positions = [];
  const minGap = MIN_STAR_GAP; // in base pixels (canvas coordinates)
  const maxAttempts = desiredStarCount * 100;
  let attempts = 0;
  while (positions.length < desiredStarCount && attempts < maxAttempts) {
    let candidate = { x: Math.random() * width, y: Math.random() * height };
    if (isValidPosition(candidate, positions, minGap)) {
      positions.push(candidate);
    }
    attempts++;
  }
  // Apply the generated positions to our stars.
  for (let i = 0; i < positions.length; i++) {
    stars[i].x = positions[i].x;
    stars[i].y = positions[i].y;
  }
  // If we couldn’t generate enough, trim the stars array.
  if (positions.length < stars.length) {
    stars.length = positions.length;
  }
}

function recycleStar(star) {
  let candidate;
  let attempts = 0;
  const minGap = MIN_STAR_GAP;
  // Get positions of all other stars.
  let otherPositions = stars.filter(s => s !== star).map(s => ({ x: s.x, y: s.y }));
  while (attempts < 100) {
    candidate = { x: Math.random() * width, y: Math.random() * height };
    if (isValidPosition(candidate, otherPositions, minGap)) break;
    attempts++;
  }
  star.x = candidate.x;
  star.y = candidate.y;
  star.z = STAR_MIN_SCALE + Math.random() * (1 - STAR_MIN_SCALE);
}

// ========================================
// OPACITY CALCULATION FUNCTIONS
// ========================================

// Returns the depth factor based on star.z: linear mapping from [STAR_MIN_SCALE, 1]
// to [DEPTH_OPACITY_MIN, DEPTH_OPACITY_MAX].
function getDepthFactor(star) {
  return DEPTH_OPACITY_MIN + ((star.z - STAR_MIN_SCALE) / (1 - STAR_MIN_SCALE)) * (DEPTH_OPACITY_MAX - DEPTH_OPACITY_MIN);
}

// Returns the distance factor based on how close the star is to the pointer.
// If pointer is not set, we use the default DISTANCE_OPC.
function getDistanceFactor(star) {
  if (pointerX === null || pointerY === null) return DISTANCE_OPC;
  let d = Math.hypot(star.x - pointerX, star.y - pointerY);
  if (d >= DISTANCE_OPC_DIST) return DISTANCE_OPC;
  // Linear interpolation: when d==0 -> 1, when d==DISTANCE_OPC_DIST -> DISTANCE_OPC.
  return 1 - ((1 - DISTANCE_OPC) * (d / DISTANCE_OPC_DIST));
}

// Returns the final opacity of a star by multiplying the three factors.
function getFinalOpacity(star) {
  const depth = getDepthFactor(star);
  const dist = getDistanceFactor(star);
  return CONTROL_OPACITY * depth * dist;
}

// ========================================
// ANIMATION / UPDATE / RENDER
// ========================================

function resize() {
  init();
}

function step() {
  context.clearRect(0, 0, width, height);
  update();
  render();
  requestAnimationFrame(step);
}

function update() {
  velocity.tx *= 0.76;
  velocity.ty *= 0.76;
  velocity.x += (velocity.tx - velocity.x) * 0.8;
  velocity.y += (velocity.ty - velocity.y) * 0.8;
  
  stars.forEach((star) => {
    star.x += velocity.x * star.z;
    star.y += velocity.y * star.z;
    star.x += (star.x - width / 2) * velocity.z * star.z;
    star.y += (star.y - height / 2) * velocity.z * star.z;
    star.z += velocity.z;
    
    // Recycle star if it moves off–screen.
    if (star.x < -OVERFLOW_THRESHOLD || star.x > width + OVERFLOW_THRESHOLD ||
        star.y < -OVERFLOW_THRESHOLD || star.y > height + OVERFLOW_THRESHOLD) {
      recycleStar(star);
    }
  });
}

function render() {
  // ------------------------------------------------------
  // 1. Draw connection lines between nearby stars with gradient opacity.
  // ------------------------------------------------------
  const connectionDistance = 150 * scale;
  const connectionDistanceSq = connectionDistance * connectionDistance;
  
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const dx = stars[i].x - stars[j].x;
      const dy = stars[i].y - stars[j].y;
      if (dx * dx + dy * dy < connectionDistanceSq) {
        // Compute each star's final opacity.
        const finalOpacity1 = getFinalOpacity(stars[i]);
        const finalOpacity2 = getFinalOpacity(stars[j]);
        
        const dist = Math.hypot(dx, dy);
        if (dist === 0) continue;
        // Normalized direction vector from star i to star j.
        const ndx = (stars[j].x - stars[i].x) / dist;
        const ndy = (stars[j].y - stars[i].y) / dist;
        
        // Compute each star's dot radius.
        const radius1 = (STAR_SIZE * stars[i].z * scale) / 2;
        const radius2 = (STAR_SIZE * stars[j].z * scale) / 2;
        // Offset endpoints so the star dots aren’t covered.
        const startX = stars[i].x + ndx * radius1;
        const startY = stars[i].y + ndy * radius1;
        const endX = stars[j].x - ndx * radius2;
        const endY = stars[j].y - ndy * radius2;
        
        // Instead of using globalAlpha, create a linear gradient for the fill.
        const grad = context.createLinearGradient(startX, startY, endX, endY);
        grad.addColorStop(0, `rgba(${hexToRgb(STAR_COLOR)},${finalOpacity1})`);
        grad.addColorStop(1, `rgba(${hexToRgb(STAR_COLOR)},${finalOpacity2})`);

        // grad.addColorStop(0, `rgba(255,255,255,${finalOpacity1})`);
        // grad.addColorStop(1, `rgba(255,255,255,${finalOpacity2})`);
        
        // Compute tapered line widths at each end.
        const lw1 = radius1 * 0.5;
        const lw2 = radius2 * 0.5;
        // Perpendicular vector.
        const pdx = -ndy;
        const pdy = ndx;
        // Four vertices for the tapered polygon.
        const p1x = startX + pdx * (lw1 / 2);
        const p1y = startY + pdy * (lw1 / 2);
        const p2x = startX - pdx * (lw1 / 2);
        const p2y = startY - pdy * (lw1 / 2);
        const p3x = endX - pdx * (lw2 / 2);
        const p3y = endY - pdy * (lw2 / 2);
        const p4x = endX + pdx * (lw2 / 2);
        const p4y = endY + pdy * (lw2 / 2);
        
        context.fillStyle = grad;
        context.beginPath();
        context.moveTo(p1x, p1y);
        context.lineTo(p2x, p2y);
        context.lineTo(p3x, p3y);
        context.lineTo(p4x, p4y);
        context.closePath();
        context.fill();
      }
    }
  }
  
  // ------------------------------------------------------
  // 2. Draw stars as filled circles.
  // ------------------------------------------------------
  stars.forEach((star) => {
    const finalOpacity = getFinalOpacity(star);
    context.fillStyle = `rgba(255,255,255,${finalOpacity})`;
    context.beginPath();
    const radius = (STAR_SIZE * star.z * scale) / 2;
    context.arc(star.x, star.y, radius, 0, Math.PI * 2);
    context.fill();
  });
}

// ========================================
// MOUSE / TOUCH HANDLERS
// ========================================

// We convert pointer coordinates into canvas (device-pixel) coordinates.
function movePointer(x, y) {
  if (typeof pointerX === 'number' && typeof pointerY === 'number') {
    const ox = x - pointerX;
    const oy = y - pointerY;
    velocity.tx += (ox / 8 * scale) * (touchInput ? 1 : -1);
    velocity.ty += (oy / 8 * scale) * (touchInput ? 1 : -1);
  }
  pointerX = x;
  pointerY = y;
}

function onMouseMove(event) {
  touchInput = false;
  // Convert clientX/clientY to canvas coordinates by multiplying by scale.
  movePointer(event.clientX * scale, event.clientY * scale);
}

function onTouchMove(event) {
  touchInput = true;
  movePointer(event.touches[0].clientX * scale, event.touches[0].clientY * scale);
//   event.preventDefault();
}

function onMouseLeave() {
  pointerX = null;
  pointerY = null;
}


function hexToRgb(hex) {
  hex = hex.replace('#', '');
  let bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;
  return `${r},${g},${b}`;
}