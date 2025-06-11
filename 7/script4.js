
// document.addEventListener("DOMContentLoaded", function() {
//   const canvas = document.getElementById("bubbleCanvas");
//   const ctx = canvas.getContext("2d");
  
//   // Resize canvas to fill the window.
//   function resizeCanvas() {
//     canvas.width = window.innerWidth;
//     canvas.height = window.innerHeight;
//   }
//   resizeCanvas();
//   window.addEventListener("resize", resizeCanvas);
  
//   // ==================== CONFIGURATION CONSTANTS ====================
//   const BUBBLE_EMIT_RATE = 3;          // Number of bubbles to create per frame (if under MAX_BUBBLES)
//   const MAX_BUBBLES = 3000;             // Maximum number of bubbles on screen
//   const BUBBLE_MIN_RADIUS = 5;         // Minimum starting radius
//   const BUBBLE_MAX_RADIUS = 20;        // Maximum starting radius (used for randomization)
//   const BUBBLE_SPEED_MIN = 1;          // Minimum upward speed (pixels per frame)
//   const BUBBLE_SPEED_MAX = 3;          // Maximum upward speed
//   const BUBBLE_FADE_RATE = 0.005;      // Rate at which bubble opacity decreases per frame
//   const BUBBLE_GROW_RATE = 0.02;       // Rate at which bubble radius increases per frame
//   const MOUSE_REPEL_DISTANCE = 300;    // Distance from mouse where bubbles get repelled
//   const MOUSE_REPEL_FORCE = 0.7;       // Strength of the repulsion
  
//   // Color settings
//   const BACKGROUND_COLOR = "#0a0a0a";  // Background color of the canvas
  



document.addEventListener("DOMContentLoaded", function() {
  const canvas = document.getElementById("bubbleCanvas");
  const ctx = canvas.getContext("2d");
  
  // Resize canvas to fill the window.
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  
  // ==================== CONFIGURATION CONSTANTS ====================
  const BUBBLE_EMIT_RATE = 3;          // Number of bubbles to create per frame (if under MAX_BUBBLES)
  const MAX_BUBBLES = 3000;             // Maximum number of bubbles on screen
  const BUBBLE_MIN_RADIUS = 5;         // Minimum starting radius
  const BUBBLE_MAX_RADIUS = 20;        // Maximum starting radius (for randomization)
  const BUBBLE_SPEED_MIN = 1;          // Minimum upward speed (pixels per frame)
  const BUBBLE_SPEED_MAX = 3;          // Maximum upward speed
  const BUBBLE_GROW_RATE = 0.02;       // Rate at which bubble radius increases per frame
  const BUBBLE_LIFETIME = 400;         // Lifetime in frames for a bubble
  
  const MOUSE_REPEL_DISTANCE = 100;    // Distance from mouse where bubbles get repelled
  const MOUSE_REPEL_FORCE = 0.2;       // Strength of the repulsion

  
  // Color settings
  const BACKGROUND_COLOR = "#FFB3C1";  
  const BUBBLE_COLOR = "rgba(11, 27, 45, 0.2)";  // We'll use computed opacity separately
  
  // Array to hold bubble objects.
  let bubbles = [];
  
  // Mouse state (initialized to center)
  let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
  window.addEventListener("mousemove", function(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  
  // Function to create a new bubble near the bottom.
  function createBubble() {
    const x = Math.random() * canvas.width;
    const y = canvas.height + 20; // start just below visible area
    const radius = BUBBLE_MIN_RADIUS + Math.random() * (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS);
    const speed = BUBBLE_SPEED_MIN + Math.random() * (BUBBLE_SPEED_MAX - BUBBLE_SPEED_MIN);
    const vx = (Math.random() - 0.5) * 1;  // small random horizontal speed
    return { 
      x: x, 
      y: y, 
      radius: radius, 
      vx: vx, 
      vy: -speed, 
      life: 0, 
      lifetime: BUBBLE_LIFETIME
    };
  }
  
  // Animation loop.
  function animate() {
    requestAnimationFrame(animate);
    
    // Clear the canvas.
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Emit new bubbles if we're below the maximum count.
    if (bubbles.length < MAX_BUBBLES) {
      for (let i = 0; i < BUBBLE_EMIT_RATE; i++) {
        bubbles.push(createBubble());
      }
    }
    
    // Update and draw each bubble.
    for (let i = bubbles.length - 1; i >= 0; i--) {
      let b = bubbles[i];
      
      // Increase the bubble's life.
      b.life++;
      // Compute opacity based on life (linearly from 1 to 0).
      let opacity = Math.max(1 - (b.life / b.lifetime), 0);
      
      // Mouse repulsion: if a bubble is within MOUSE_REPEL_DISTANCE, push it away.
      let dx = b.x - mouse.x;
      let dy = b.y - mouse.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_REPEL_DISTANCE) {
        let force = ((MOUSE_REPEL_DISTANCE - dist) / MOUSE_REPEL_DISTANCE) * MOUSE_REPEL_FORCE;
        let angle = Math.atan2(dy, dx);
        b.vx += Math.cos(angle) * force;
        b.vy += Math.sin(angle) * force;
      }
      
      // Update bubble's position.
      b.x += b.vx;
      b.y += b.vy;
      // Bubble grows as it rises.
      b.radius += BUBBLE_GROW_RATE;
      
      // Draw the bubble using the computed opacity.
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.strokeStyle = BUBBLE_COLOR;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      
      // Remove the bubble if its life exceeds its lifetime or if it has left the top.
      if (b.life >= b.lifetime || b.y + b.radius < 0) {
        bubbles.splice(i, 1);
      }
    }
  }
  
  animate();
});