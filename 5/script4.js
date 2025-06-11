
const canvas = document.getElementById('blobCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', function(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Mouse position (default to center)
let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
window.addEventListener('mousemove', function(e){
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

// Blob configuration constants
const NUM_POINTS = 20;            // Number of control points
const BLOB_RADIUS = 300;          // Base radius of the blob
const BLOB_CENTER = {             // Center of the blob (can be static or animated)
  x: canvas.width / 2,
  y: canvas.height / 2
};
const SPRING = 0.1;               // Spring constant (how fast points return)
const FRICTION = 0.8;             // Damping factor for point velocity
const MOUSE_INFLUENCE = 300;      // Distance within which the mouse affects the blob
const MOUSE_FORCE = 0.7;          // Strength of the mouse repulsion

// Create control points along the circle
let points = [];
for (let i = 0; i < NUM_POINTS; i++) {
  let angle = (i / NUM_POINTS) * Math.PI * 2;
  let baseX = BLOB_CENTER.x + Math.cos(angle) * BLOB_RADIUS;
  let baseY = BLOB_CENTER.y + Math.sin(angle) * BLOB_RADIUS;
  points.push({
    angle: angle,
    baseX: baseX,
    baseY: baseY,
    x: baseX,
    y: baseY,
    vx: 0,
    vy: 0
  });
}

function updateBlob() {
  // Update each point using spring physics and mouse influence.
  for (let i = 0; i < points.length; i++) {
    let p = points[i];
    // Desired (rest) position on the circle.
    let targetX = BLOB_CENTER.x + Math.cos(p.angle) * BLOB_RADIUS;
    let targetY = BLOB_CENTER.y + Math.sin(p.angle) * BLOB_RADIUS;
    
    // If the point is close to the mouse, push it away.
    let dx = p.x - mouse.x;
    let dy = p.y - mouse.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MOUSE_INFLUENCE) {
      let force = ((MOUSE_INFLUENCE - dist) / MOUSE_INFLUENCE) * MOUSE_FORCE;
      targetX += (p.x - mouse.x) * force;
      targetY += (p.y - mouse.y) * force;
    }
    
    // Apply spring force.
    let ax = (targetX - p.x) * SPRING;
    let ay = (targetY - p.y) * SPRING;
    
    p.vx = (p.vx + ax) * FRICTION;
    p.vy = (p.vy + ay) * FRICTION;
    
    p.x += p.vx;
    p.y += p.vy;
  }
}

function drawBlob() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff6699';
  ctx.beginPath();
  
  // Use quadratic curves between midpoints for a smooth shape.
  let prevPoint = points[points.length - 1];
  for (let i = 0; i < points.length; i++) {
    let currPoint = points[i];
    let midX = (prevPoint.x + currPoint.x) / 2;
    let midY = (prevPoint.y + currPoint.y) / 2;
    if (i === 0) {
      ctx.moveTo(midX, midY);
    } else {
      ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, midX, midY);
    }
    prevPoint = currPoint;
  }
  // Connect the last segment to the beginning.
  let firstMidX = (points[0].x + prevPoint.x) / 2;
  let firstMidY = (points[0].y + prevPoint.y) / 2;
  ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, firstMidX, firstMidY);
  
  ctx.closePath();
  ctx.fill();
}

function animateBlob() {
  requestAnimationFrame(animateBlob);
  updateBlob();
  drawBlob();
}

animateBlob();
