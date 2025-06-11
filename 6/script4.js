
document.addEventListener("DOMContentLoaded", function() {
  // ==================== CONFIGURATION CONSTANTS ====================
  const GRID_ROWS        = 10;          // Number of rows in the grid
  const GRID_COLS        = 20;          // Number of columns in the grid
  const GRID_SPACING     = 40;          // Spacing (in pixels) between grid points
  const BALL_RADIUS      = 2;           // Radius of each ball (in pixels)
  
  const SPRING_CONSTANT  = 0.3;         // How strongly each ball is pulled toward its target
  const FRICTION         = 0.7;         // Damping factor for ball velocity
  
  const MOUSE_INFLUENCE  = 100;         // Radius within which balls are affected by the mouse
  
  // Color constants
  const BACKGROUND_COLOR = "#222222";   // Canvas background color
  const BALL_COLOR       = "#ff6699";     // Color of the balls
  const MOUSE_POWER      = 0.3;         // Multiplier that increases/decreases the magnet effect of the mouse

  // Opacity controllers
  const MASTER_OPACITY     = 1.0;        // Overall opacity multiplier
  const MOUSE_OPACITY_DISTANCE = 150;    // Distance within which opacity is boosted
  const MOUSE_OPACITY_UNDER = 1.5;        // Multiplier for opacity when directly under the mouse
  
  // Corner colors (hex strings) for gradient:
  const TOP_LEFT_COLOR     = "#ffffff";  // red
  const TOP_RIGHT_COLOR    = "#ffffff";  // green
  const BOTTOM_LEFT_COLOR  = "#ffffff";  // blue
  const BOTTOM_RIGHT_COLOR = "#ffffff";  // yellow
  
  // Corner opacities (values between 0 and 1)
  const TOP_LEFT_OPACITY     = 1.0;
  const TOP_RIGHT_OPACITY    = 1.0;
  const BOTTOM_LEFT_OPACITY  = 0.1;
  const BOTTOM_RIGHT_OPACITY = 0.1;
  
  // ==================== GLOBAL VARIABLES ====================
  const canvas = document.getElementById("gridCanvas");
  const ctx = canvas.getContext("2d");
  let balls = [];  // Array to hold ball objects
  
  // Grid variables (calculated in createGrid)
  let cols, rows, gridWidth, gridHeight, gridOffsetX, gridOffsetY;
  
  // Mouse state (initialized to center)
  let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  window.addEventListener("mousemove", onMouseMove);
  
  // ==================== HELPER FUNCTIONS ====================
  
  // Convert hex color string to {r, g, b} object.
  function hexToRgb(hex) {
    // Remove the hash if present
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) {
      hex = hex.split("").map(x => x + x).join("");
    }
    let intVal = parseInt(hex, 16);
    return {
      r: (intVal >> 16) & 255,
      g: (intVal >> 8) & 255,
      b: intVal & 255
    };
  }
  
  // Linear interpolation
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  
  // Interpolate between two colors (each an {r,g,b} object) by t (0 to 1)
  function lerpColor(c1, c2, t) {
    return {
      r: Math.round(lerp(c1.r, c2.r, t)),
      g: Math.round(lerp(c1.g, c2.g, t)),
      b: Math.round(lerp(c1.b, c2.b, t))
    };
  }
  
  // Bilinear interpolation for a value given top-left, top-right, bottom-left, bottom-right values.
  function bilerp(tl, tr, bl, br, u, v) {
    return lerp(lerp(tl, tr, u), lerp(bl, br, u), v);
  }
  
  // ==================== GRID SETUP ====================
  
  // Create grid based solely on GRID_SPACING and canvas dimensions.
  function createGrid() {
    cols = Math.floor(canvas.width / GRID_SPACING) + 1;
    rows = Math.floor(canvas.height / GRID_SPACING) + 1;
    gridWidth = (cols - 1) * GRID_SPACING;
    gridHeight = (rows - 1) * GRID_SPACING;
    gridOffsetX = (canvas.width - gridWidth) / 2;
    gridOffsetY = (canvas.height - gridHeight) / 2;
    
    balls = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let baseX = gridOffsetX + col * GRID_SPACING;
        let baseY = gridOffsetY + row * GRID_SPACING;
        balls.push({
          baseX: baseX,  // fixed grid position
          baseY: baseY,
          x: baseX,      // current position starts at base
          y: baseY,
          vx: 0,
          vy: 0
        });
      }
    }
  }
  
  // ==================== EVENT HANDLERS ====================
  
  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createGrid();
  }
  
  window.addEventListener("resize", resizeCanvas);
  
  // ==================== MAIN ANIMATION FUNCTIONS ====================
  
  function updateBalls() {
    for (let ball of balls) {
      // Calculate distance from ball's base to mouse
      let dx = ball.baseX - mouse.x;
      let dy = ball.baseY - mouse.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      
      // Determine influence factor (0 when far away, up to 1 when very close)
      let factor = 0;
      if (dist < MOUSE_INFLUENCE) {
        factor = 1 - (dist / MOUSE_INFLUENCE);
      }
      // Multiply by MOUSE_POWER to adjust overall strength.
      factor *= MOUSE_POWER;
      
      // Compute target position: interpolate between base and mouse position.
      let targetX = ball.baseX + (mouse.x - ball.baseX) * factor;
      let targetY = ball.baseY + (mouse.y - ball.baseY) * factor;
      
      // Apply spring physics to move ball toward target.
      let ax = (targetX - ball.x) * SPRING_CONSTANT;
      let ay = (targetY - ball.y) * SPRING_CONSTANT;
      ball.vx = (ball.vx + ax) * FRICTION;
      ball.vy = (ball.vy + ay) * FRICTION;
      ball.x += ball.vx;
      ball.y += ball.vy;
    }
  }
  
  function drawBalls() {
    ctx.fillStyle = "#111";  // background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Pre-calculate corner colors as RGB objects.
    const topLeftRGB     = hexToRgb(TOP_LEFT_COLOR);
    const topRightRGB    = hexToRgb(TOP_RIGHT_COLOR);
    const bottomLeftRGB  = hexToRgb(BOTTOM_LEFT_COLOR);
    const bottomRightRGB = hexToRgb(BOTTOM_RIGHT_COLOR);
    
    // Draw each ball.
    for (let ball of balls) {
      // Compute normalized coordinates based on the ball's base position relative to the grid.
      let u = (ball.baseX - gridOffsetX) / gridWidth;
      let v = (ball.baseY - gridOffsetY) / gridHeight;
      
      // Interpolate opacity from the four corners.
      let baseOpacity = bilerp(TOP_LEFT_OPACITY, TOP_RIGHT_OPACITY, BOTTOM_LEFT_OPACITY, BOTTOM_RIGHT_OPACITY, u, v);
      
      // Compute color via bilinear interpolation.
      let topColor = lerpColor(topLeftRGB, topRightRGB, u);
      let bottomColor = lerpColor(bottomLeftRGB, bottomRightRGB, u);
      let baseColor = lerpColor(topColor, bottomColor, v);
      
      // Calculate mouse opacity boost based on distance from the ball's base.
      let dx = ball.baseX - mouse.x;
      let dy = ball.baseY - mouse.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      let mouseOpacityFactor = 1.0;
      if (dist < MOUSE_OPACITY_DISTANCE) {
        let w = (MOUSE_OPACITY_DISTANCE - dist) / MOUSE_OPACITY_DISTANCE;
        mouseOpacityFactor = lerp(1, MOUSE_OPACITY_UNDER, w);
      }
      
      // Final opacity is the product of master, base, and mouse boost.
      let finalOpacity = MASTER_OPACITY * baseOpacity * mouseOpacityFactor;
      
      // Construct the fill style.
      let fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${finalOpacity.toFixed(2)})`;
      
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
  }
  
  function animate() {
    requestAnimationFrame(animate);
    updateBalls();
    drawBalls();
  }
  
  // ==================== INITIALIZATION ====================
  resizeCanvas();
  animate();
});
