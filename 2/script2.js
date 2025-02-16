// ==================== CONFIGURATION CONSTANTS ====================
const TOTAL_LINES         = 20;    // Number of dotted lines
const MIN_GAP             = 10;    // Minimum vertical gap between lines (pixels)

// Wave parameters
const MIN_WAVELENGTH      = 50;
const MAX_WAVELENGTH      = 150;
const MIN_AMPLITUDE       = 30;
const MAX_AMPLITUDE       = 50;

// Opacity parameters for lines
const MIN_OPACITY         = 0.2;
const MAX_OPACITY         = 1.0;

// Speed parameters for lines
const MIN_SPEED           = -4.2;
const MAX_SPEED           = -5.0;

// Physics constants
const SPRING_CONSTANT     = 0.02;  // How fast points are pulled toward target
const FRICTION            = 0.70;  // Damping factor for point velocity
const MOUSE_EFFECT_RADIUS = 500;   // Mouse repulsion radius (pixels)
const REPULSION_STRENGTH  = 2.1;   // Strength of repulsion force

const DOT_SPACING         = 7;    // Spacing between dots along a line (pixels)

// Dot size (line width) parameters
const MIN_WIDTH           = 1;
const MAX_WIDTH           = 5;

// Colors
const LINE_COLOR          = "#000000";      // Color for the dots/line
const BG_COLOR_TOP        = "#f0f8ff";      // Top color of background gradient
const BG_COLOR_BOTTOM     = "#ffffff";      // Bottom color of background gradient






// ==================== GLOBAL VARIABLES ====================
let mouse = { x: -9999, y: -9999 };     // Mouse position (adjusted below)
let scene, camera, renderer;
let bgMesh;
let linesData = [];                    // Array to hold our line objects

// ==================== INITIALIZE THREE.JS ====================
initThree();
initBackground();

// ==================== CIRCLE TEXTURE CREATION ====================
// Creates a simple circular texture for our PointsMaterial.
function createCircleTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
const circleTexture = createCircleTexture(); // Make sure this is defined before initLines()

// ==================== DOTTED LINES SETUP ====================
// For each line, we generate a set of points with its own parameters.
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

  // For each line, create its points.
  yPositions.forEach(lineY => {
    let phase = Math.random() * Math.PI * 2;
    let wavelength = MIN_WAVELENGTH + Math.random() * (MAX_WAVELENGTH - MIN_WAVELENGTH);
    let amplitude = MIN_AMPLITUDE + Math.random() * (MAX_AMPLITUDE - MIN_AMPLITUDE);
    let opacity = MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY);
    let speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
    let dotSize = MIN_WIDTH + Math.random() * (MAX_WIDTH - MIN_WIDTH);
    let pointsArray = [];
    let velocities = [];
    let initialXs = [];
    // Create points along the x-axis from -DOT_SPACING to window.innerWidth+DOT_SPACING.
    for (let x = -DOT_SPACING; x <= window.innerWidth + DOT_SPACING; x += DOT_SPACING) {
      initialXs.push(x);
      let baseY = lineY + Math.sin((x + phase) / wavelength) * amplitude;
      pointsArray.push(x, baseY, 0);
      velocities.push(0, 0);
    }
    let positions = new Float32Array(pointsArray);
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    let material = new THREE.PointsMaterial({
      color: new THREE.Color(LINE_COLOR),
      size: dotSize,
      map: circleTexture,
      transparent: true,
      alphaTest: 0.5,
      opacity: opacity,
      depthWrite: false
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
      offset: 0, // initial horizontal offset
      initialXs: initialXs,
      points: positions,
      velocities: velocities,
      geometry: geometry,
      pointsObj: pointsObj
    });
  });
}

initLines(); // Call initLines() now that circleTexture is defined
animate();

// ==================== THREE.JS SETUP FUNCTIONS ====================
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

// ==================== ANIMATION LOOP ====================
function animate() {
  requestAnimationFrame(animate);
  let totalWidth = window.innerWidth + DOT_SPACING * 2;
  // Update each line's points.
  linesData.forEach(line => {
    // Update the line's horizontal offset by its own speed.
    line.offset += line.speed;
    // Use modulo wrapping so that dots reappear on the left seamlessly.
    line.offset = line.offset % totalWidth;
    let posArray = line.points;
    for (let i = 0; i < line.initialXs.length; i++) {
      let initX = line.initialXs[i];
      let index = i * 3;
      // Use modulo wrapping for the x position.
      let targetX = (((initX + line.offset + DOT_SPACING) % totalWidth) - DOT_SPACING);
      let targetY = line.y + Math.sin((initX + line.offset + line.phase) / line.wavelength) * line.amplitude;
      let curX = posArray[index];
      let curY = posArray[index + 1];
      // Spring physics to move the point toward its target.
      let ax = (targetX - curX) * SPRING_CONSTANT;
      let ay = (targetY - curY) * SPRING_CONSTANT;
      // Mouse repulsion.
      let dx = curX - mouse.x;
      let dy = curY - mouse.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_EFFECT_RADIUS && dist > 0) {
        let repulsion = ((MOUSE_EFFECT_RADIUS - dist) / MOUSE_EFFECT_RADIUS) * REPULSION_STRENGTH;
        ax += (dx / dist) * repulsion;
        ay += (dy / dist) * repulsion;
      }
      // Update velocity with friction.
      let velIndex = i * 2;
      line.velocities[velIndex] = (line.velocities[velIndex] + ax) * FRICTION;
      line.velocities[velIndex + 1] = (line.velocities[velIndex + 1] + ay) * FRICTION;
      posArray[index] += line.velocities[velIndex];
      posArray[index + 1] += line.velocities[velIndex + 1];
    }
    line.geometry.attributes.position.needsUpdate = true;
  });
  renderer.render(scene, camera);
}

// ==================== RESIZE HANDLER ====================
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

// ==================== MOUSE HANDLING ====================
// Invert the mouse Y coordinate so that Y=0 is at the bottom.
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = window.innerHeight - e.clientY;
});
