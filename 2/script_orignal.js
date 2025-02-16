// ==================== CONFIGURATION CONSTANTS ====================
const TOTAL_LINES         = 10;    // Number of dotted lines
const MIN_GAP             = 50;    // Minimum vertical gap between lines (pixels)
const WAVES_SIZE          = 20;    // Amplitude of the sine wave (pixels)
const WAVES_LENGTH        = 200;   // Wavelength for the wave effect (pixels)
const MIN_OPACITY         = 0.5;   // Minimum opacity for a line’s points
const MAX_OPACITY         = 0.9;   // Maximum opacity for a line’s points
const LINE_SPEED          = 0.5;   // Horizontal speed (pixels per frame)
const MOUSE_EFFECT_RADIUS = 100;   // Mouse repulsion radius (pixels)
const REPULSION_STRENGTH  = 1.5;   // Strength of the repulsion force
const SPRING_CONSTANT     = 0.05;  // How fast points are pulled toward their target
const FRICTION            = 0.92;  // Damping factor for point velocity
const DOT_SPACING         = 20;    // Horizontal spacing between points (pixels)
const DOT_RADIUS          = 2;     // Radius of each dot (used for size in PointsMaterial)

// ==================== GLOBAL VARIABLES ====================
let globalOffset = 0;                  // For moving the waves
let mouse = { x: -9999, y: -9999 };     // Mouse position (off-screen initially)
let scene, camera, renderer;
let bgMesh;
let linesData = [];                    // Array to hold our line objects

// ==================== INITIALIZE THREE.JS ====================
initThree();
initBackground();
initLines();
animate();

// Create the Three.js scene, camera, and renderer.
function initThree() {
  scene = new THREE.Scene();

  // Orthographic camera matching window dimensions:
  camera = new THREE.OrthographicCamera(
    0, window.innerWidth,      // left, right
    window.innerHeight, 0,      // top, bottom (y increases downward)
    -1000, 1000                // near, far
  );

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize, false);
}

// ==================== BACKGROUND SETUP ====================
// Creates a full-screen quad with a gradient shader.
// (For debugging, try setting both stops to '#000000' to see a solid background.)
function initBackground() {
  const geometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      color1: { value: new THREE.Color('#000000') }, // top color
      color2: { value: new THREE.Color('#000000') }  // bottom color (change these for a gradient)
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
  // Center the plane:
  bgMesh.position.set(window.innerWidth / 2, window.innerHeight / 2, -10);
  scene.add(bgMesh);
}

// ==================== DOTTED LINES SETUP ====================
// For each line, we generate a series of points that are later animated.
function initLines() {
  linesData = [];
  let maxLinesPossible = Math.floor(window.innerHeight / MIN_GAP);
  let numLines = Math.min(TOTAL_LINES, maxLinesPossible);

  // Generate random y-positions for lines (ensuring at least MIN_GAP apart)
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

  // For each line, create a Points object.
  yPositions.forEach(lineY => {
    let phase = Math.random() * Math.PI * 2;
    let opacity = MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY);
    let pointsArray = [];     // Will hold x, y, z for each point.
    let velocities = [];      // Velocity for each point (x and y)
    let initialXs = [];       // Store each point’s initial x

    // Create points from x = -DOT_SPACING to window.innerWidth + DOT_SPACING for smooth wrapping.
    for (let x = -DOT_SPACING; x <= window.innerWidth + DOT_SPACING; x += DOT_SPACING) {
      initialXs.push(x);
      let baseY = lineY + Math.sin((x + phase) / WAVES_LENGTH) * WAVES_SIZE;
      pointsArray.push(x, baseY, 0); // z = 0
      velocities.push(0, 0);
    }

    let positions = new Float32Array(pointsArray);
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    let material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: DOT_RADIUS * 2,
      transparent: true,
      opacity: opacity
    });

    let pointsObj = new THREE.Points(geometry, material);
    scene.add(pointsObj);

    linesData.push({
      y: lineY,
      phase: phase,
      opacity: opacity,
      initialXs: initialXs,
      points: positions,
      velocities: velocities,
      geometry: geometry,
      pointsObj: pointsObj
    });
  });
}

// ==================== ANIMATION LOOP ====================
function animate() {
  requestAnimationFrame(animate);
  globalOffset += LINE_SPEED;
  let totalWidth = window.innerWidth + DOT_SPACING * 2;

  // Update each line’s points
  linesData.forEach(line => {
    let posArray = line.points;
    for (let i = 0; i < line.initialXs.length; i++) {
      let initX = line.initialXs[i];
      let index = i * 3;
      // Compute the target position with wrapping:
      let targetX = ((initX + globalOffset + DOT_SPACING) % totalWidth) - DOT_SPACING;
      let targetY = line.y + Math.sin((initX + globalOffset + line.phase) / WAVES_LENGTH) * WAVES_SIZE;
      let curX = posArray[index];
      let curY = posArray[index + 1];

      // Spring physics toward the target position:
      let ax = (targetX - curX) * SPRING_CONSTANT;
      let ay = (targetY - curY) * SPRING_CONSTANT;

      // Mouse repulsion:
      let dx = curX - mouse.x;
      let dy = curY - mouse.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_EFFECT_RADIUS && dist > 0) {
        let repulsion = ((MOUSE_EFFECT_RADIUS - dist) / MOUSE_EFFECT_RADIUS) * REPULSION_STRENGTH;
        ax += (dx / dist) * repulsion;
        ay += (dy / dist) * repulsion;
      }

      // Update velocity with friction and then update position:
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

  // Recreate background and lines on resize:
  scene.remove(bgMesh);
  initBackground();
  linesData.forEach(line => scene.remove(line.pointsObj));
  initLines();
}

// ==================== MOUSE HANDLING ====================
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
