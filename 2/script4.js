let isDarkMode = false;


// Colors
let LINE_COLOR          = "#000000";      // Color for the dots/line
let BG_COLOR_TOP        = "#f0f8ff";      // Top color of background gradient
let BG_COLOR_BOTTOM     = "#ffffff";      // Bottom color of background gradient

function toggleTheme() {
  if (isDarkMode) {
    LINE_COLOR              = "#000000";
    BG_COLOR_TOP        = "#f0f8ff";      
    BG_COLOR_BOTTOM     = "#ffffff"; 
    document.body.classList.remove("light-mode");
  } else {
    
    LINE_COLOR              = "#eeeeee";
    BG_COLOR_TOP        = "#333333";      
    BG_COLOR_BOTTOM     = "#111111"; 
    document.body.classList.add("light-mode");
  }
  isDarkMode = !isDarkMode;
  updateThemeColors();
}

function updateThemeColors() {
  // Update the background shader uniforms.
  if (bgMesh && bgMesh.material && bgMesh.material.uniforms) {
    bgMesh.material.uniforms.color1.value.set(BG_COLOR_TOP);
    bgMesh.material.uniforms.color2.value.set(BG_COLOR_BOTTOM);
    bgMesh.material.needsUpdate = true;
  }
  
  // Update the color for each dotted line's PointsMaterial.
  linesData.forEach(line => {
    if (line.pointsObj && line.pointsObj.material) {
      line.pointsObj.material.color.set(LINE_COLOR);
      line.pointsObj.material.needsUpdate = true;
    }
  });
}



// ==================== CONFIGURATION CONSTANTS ====================
const TOTAL_LINES         = 3000;    // Number of dotted lines
const MIN_GAP             = 30;    // Minimum vertical gap between lines (pixels)

// Wave parameters – note: we now interpret “wavelength” as the period length
const MIN_WAVELENGTH      = 350;
const MAX_WAVELENGTH      = 650;
const MIN_AMPLITUDE       = 30;
const MAX_AMPLITUDE       = 60;

// Opacity parameters for lines
const MIN_OPACITY         = 0.1;
const MAX_OPACITY         = 0.3;

// Speed parameters for lines
const MIN_SPEED           = 0.2;
const MAX_SPEED           = 1.0;

// Physics constants
const SPRING_CONSTANT     = 0.02;  // How fast points are pulled toward target
const FRICTION            = 0.70;  // Damping factor for point velocity
const MOUSE_EFFECT_RADIUS = 500;   // Mouse repulsion radius (pixels)
const REPULSION_STRENGTH  = 1.5;   // Strength of repulsion force

const DOT_SPACING         = 7;    // Spacing between dots along a line (pixels)

// Dot size (line width) parameters
const MIN_WIDTH           = 1;
const MAX_WIDTH           = 2;


// ==================== GLOBAL VARIABLES ====================
let mouse = { x: -9999, y: -9999 };     // Mouse position (adjusted below)
let scene, camera, renderer;
let bgMesh;
let linesData = [];                    // Array to hold our line objects

// ==================== INITIALIZE THREE.JS ====================
initThree();
initBackground();
initLines();
animate();

// --------------------
// THREE.JS SETUP
// --------------------
function initThree() {
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(
    0, window.innerWidth,
    window.innerHeight, 0,
    -1000, 1000
  );
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  window.addEventListener('resize', onWindowResize, false);
}

// --------------------
// BACKGROUND SETUP (gradient plane)
// --------------------
function initBackground() {
  const geometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      color1: { value: new THREE.Color(BG_COLOR_TOP) },
      color2: { value: new THREE.Color(BG_COLOR_BOTTOM) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec2 vUv;
      void main(){
        gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
      }
    `,
    depthWrite: false
  });
  bgMesh = new THREE.Mesh(geometry, material);
  bgMesh.position.set(window.innerWidth / 2, window.innerHeight / 2, -10);
  scene.add(bgMesh);
}

// --------------------
// DOTTED LINES SETUP
// Here we “build” each line from a repeating wave. 
// We start the dots array from a point well off‐screen to the left (baseX = –wavelength)
// and continue adding dots (spaced by DOT_SPACING) until we exceed the screen width.
// --------------------
function initLines() {
  linesData = [];
  let maxLinesPossible = Math.floor(window.innerHeight / MIN_GAP);
  let numLines = Math.min(TOTAL_LINES, maxLinesPossible);

  // Generate random y-positions (ensuring at least MIN_GAP separation)
  let yPositions = [];
  let attempts = 0;
  while (yPositions.length < numLines && attempts < 1000) {
    let candidate = Math.random() * window.innerHeight;
    let valid = true;
    for (let y of yPositions) {
      if (Math.abs(candidate - y) < MIN_GAP) {
        valid = false;
        break;
      }
    }
    if (valid) yPositions.push(candidate);
    attempts++;
  }
  yPositions.sort((a, b) => a - b);

  yPositions.forEach(lineY => {
    let phase = Math.random() * Math.PI * 2;
    let wavelength = MIN_WAVELENGTH + Math.random() * (MAX_WAVELENGTH - MIN_WAVELENGTH);
    let amplitude = MIN_AMPLITUDE + Math.random() * (MAX_AMPLITUDE - MIN_AMPLITUDE);
    let opacity = MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY);
    let speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
    let dotSize = MIN_WIDTH + Math.random() * (MAX_WIDTH - MIN_WIDTH);
    
    // Build initial dots array.
    // Each dot has a "baseX" (its position in the repeating wave pattern).
    // We start at baseX = -wavelength so that there is an extra (hidden) period on the left.
    let dots = [];
    let baseX = -wavelength;
    // Continue adding dots until we cover the screen width plus a little extra.
    while (baseX < window.innerWidth + DOT_SPACING) {
      let targetY = lineY + Math.sin((baseX + phase) * (2 * Math.PI / wavelength)) * amplitude;
      dots.push({ baseX: baseX, x: baseX, y: targetY, vx: 0, vy: 0 });
      baseX += DOT_SPACING;
    }
    
    // Prepare a BufferGeometry.
    // We allocate a little extra capacity (we might add new dots later).
    let dotCapacity = dots.length + 20;
    let positions = new Float32Array(dotCapacity * 3);
    for (let i = 0; i < dots.length; i++) {
       positions[i * 3]     = dots[i].x;
       positions[i * 3 + 1] = dots[i].y;
       positions[i * 3 + 2] = 0;
    }
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, dots.length);
    
    let material = new THREE.PointsMaterial({
      color: new THREE.Color(LINE_COLOR),
      size: dotSize,
      transparent: true,
      opacity: opacity
    });
    let pointsObj = new THREE.Points(geometry, material);
    scene.add(pointsObj);
    
    linesData.push({
      y: lineY,
      phase: phase,
      wavelength: wavelength,
      amplitude: amplitude,
      opacity: opacity,
      speed: speed,
      dotSize: dotSize,
      offset: 0,         // Horizontal offset that increases over time.
      dots: dots,        // Array of dot objects.
      geometry: geometry,
      positions: positions,
      dotCapacity: dotCapacity,
      pointsObj: pointsObj
    });
  });
}

// --------------------
// ANIMATION LOOP
// We update each dot’s target position based on its baseX plus the current offset.
// Then we use spring physics (and mouse repulsion) to move its current position.
// Finally, we remove dots that exit on the right and add new dots on the left.
// --------------------
function animate() {
  requestAnimationFrame(animate);
  
  linesData.forEach(line => {
    // Increase horizontal offset.
    line.offset += line.speed;
    
    // Update each dot’s target position and simulate spring motion.
    line.dots.forEach(dot => {
      let targetX = dot.baseX + line.offset;
      let targetY = line.y + Math.sin((dot.baseX + line.offset + line.phase) * (2 * Math.PI / line.wavelength)) * line.amplitude;
      
      // Spring physics to pull dot toward target.
      let ax = (targetX - dot.x) * SPRING_CONSTANT;
      let ay = (targetY - dot.y) * SPRING_CONSTANT;
      
      // Mouse repulsion.
      let dx = dot.x - mouse.x;
      let dy = dot.y - mouse.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_EFFECT_RADIUS && dist > 0) {
        let repulsion = ((MOUSE_EFFECT_RADIUS - dist) / MOUSE_EFFECT_RADIUS) * REPULSION_STRENGTH;
        ax += (dx / dist) * repulsion;
        ay += (dy / dist) * repulsion;
      }
      
      dot.vx = (dot.vx + ax) * FRICTION;
      dot.vy = (dot.vy + ay) * FRICTION;
      dot.x += dot.vx;
      dot.y += dot.vy;
    });
    
    // Remove dots that have moved off the right side.
    // (We check the dot’s “target” x value so that we remove it once its wave value exceeds window.innerWidth+DOT_SPACING.)
    while (line.dots.length > 0) {
      let lastDot = line.dots[line.dots.length - 1];
      let lastTargetX = lastDot.baseX + line.offset;
      if (lastTargetX > window.innerWidth + DOT_SPACING) {
        line.dots.pop();
      } else {
        break;
      }
    }
    
    // Add new dots on the left if needed.
    // If the leftmost dot’s target x is ≥ –DOT_SPACING (i.e. it’s no longer “hidden”), prepend a new dot.
    while (line.dots.length > 0) {
      let firstDot = line.dots[0];
      let firstTargetX = firstDot.baseX + line.offset;
      if (firstTargetX >= -DOT_SPACING) {
        let newBaseX = firstDot.baseX - DOT_SPACING;
        let newTargetY = line.y + Math.sin((newBaseX + line.offset + line.phase) * (2 * Math.PI / line.wavelength)) * line.amplitude;
        // Initialize the new dot at its target position.
        let newDot = { baseX: newBaseX, x: newBaseX + line.offset, y: newTargetY, vx: 0, vy: 0 };
        line.dots.unshift(newDot);
      } else {
        break;
      }
    }
    
    // Update BufferGeometry positions from the dots array.
    // Reallocate the buffer if needed.
    if (line.dots.length > line.dotCapacity) {
      line.dotCapacity = line.dots.length + 20;
      line.positions = new Float32Array(line.dotCapacity * 3);
      line.geometry.setAttribute('position', new THREE.BufferAttribute(line.positions, 3));
    }
    for (let i = 0; i < line.dots.length; i++) {
      line.positions[i * 3]     = line.dots[i].x;
      line.positions[i * 3 + 1] = line.dots[i].y;
      line.positions[i * 3 + 2] = 0;
    }
    line.geometry.attributes.position.needsUpdate = true;
    line.geometry.setDrawRange(0, line.dots.length);
  });
  
  renderer.render(scene, camera);
}

// --------------------
// RESIZE HANDLER
// --------------------
function onWindowResize() {
  camera.right = window.innerWidth;
  camera.top = window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Reinitialize background and lines.
  scene.remove(bgMesh);
  initBackground();
  linesData.forEach(line => scene.remove(line.pointsObj));
  initLines();
}

// --------------------
// MOUSE HANDLING
// Invert the mouse Y coordinate so that Y=0 is at the bottom.
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = window.innerHeight - e.clientY;
});
