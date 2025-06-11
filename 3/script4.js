// ==================== CONFIGURATION CONSTANTS ====================
const TUNNEL_DEPTH         = 500;  // Total depth (distance along z) for the tunnel
const CIRCLE_SPACING       = 10;    // Distance between consecutive circles (in z)
const TUNNEL_NEAR          = -50;   // z-position of the front-most (nearest) circle
const NUM_CIRCLES          = Math.ceil((TUNNEL_DEPTH - Math.abs(TUNNEL_NEAR)) / CIRCLE_SPACING);

const CIRCLE_RADIUS        = 100;   // Radius of each circle (in local coordinates)
const STARS_PER_CIRCLE     = 150;    // Number of stars (dots) per circle
const STAR_SIZE            = 2;     // Size of each star (in PointsMaterial)
const TUNNEL_SPEED         = 0;     // Speed at which circles move forward (units per frame)

const MOUSE_OFFSET_AMOUNT  =500;   // Maximum offset induced by the mouse (in x and y)
const OPACITY_NEAR         = 0.3;   // Opacity for the circle at the front of the tunnel
const OPACITY_FAR          = 0.0;   // Opacity for the farthest circle

// New color constants.
const BACKGROUND_COLOR           = "#dddddd";  // Background color of the scene.
const TUNNEL_STAR_COLOR_NEAR     = "#222222";  // Color of stars in the nearest circle.
const TUNNEL_STAR_COLOR_FAR      = "#ffcc00";  // Color of stars in the farthest circle.

// ==================== GLOBAL VARIABLES ====================
let scene, camera, renderer;
let tunnelCircles = [];
// Initialize mouse with center of screen. (Note: y now is standard canvas coordinates.)
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

// ==================== INITIALIZE THREE.JS ====================
init();
animate();

function init() {
  // Create scene and set background color.
  scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND_COLOR);

  // Use a perspective camera for depth.
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.z = 0; // camera at z = 0, looking along negative z

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Build tunnel circles.
  for (let i = 0; i < NUM_CIRCLES; i++) {
    let z = TUNNEL_NEAR - i * CIRCLE_SPACING;
    let circle = createCircle();
    circle.position.z = z;
    tunnelCircles.push(circle);
    scene.add(circle);
  }

  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('mousemove', onMouseMove, false);
}

// Create a circle (ring of stars) as a THREE.Points object.
function createCircle() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STARS_PER_CIRCLE * 3);
  for (let i = 0; i < STARS_PER_CIRCLE; i++) {
    let angle = (i / STARS_PER_CIRCLE) * Math.PI * 2;
    let x = CIRCLE_RADIUS * Math.cos(angle);
    let y = CIRCLE_RADIUS * Math.sin(angle);
    positions[i * 3]     = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = 0;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: new THREE.Color(TUNNEL_STAR_COLOR_NEAR),
    size: STAR_SIZE,
    transparent: true,
    opacity: OPACITY_NEAR,
    sizeAttenuation: true
  });

  return new THREE.Points(geometry, material);
}

// ==================== EVENT HANDLERS ====================

// Invert the y coordinate so that moving the mouse up increases y.
function onMouseMove(event) {
  mouse.x = event.clientX;
  mouse.y = window.innerHeight - event.clientY;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==================== ANIMATION LOOP ====================
function animate() {
  requestAnimationFrame(animate);

  // Compute normalized mouse offsets (-1 to 1 relative to screen center)
  let normalizedMouseX = (mouse.x - window.innerWidth / 2) / (window.innerWidth / 2);
  let normalizedMouseY = (mouse.y - window.innerHeight / 2) / (window.innerHeight / 2);

  // Precompute THREE.Color instances for color interpolation.
  const nearColor = new THREE.Color(TUNNEL_STAR_COLOR_NEAR);
  const farColor = new THREE.Color(TUNNEL_STAR_COLOR_FAR);

  // Update each circle in the tunnel.
  tunnelCircles.forEach(circle => {
    // Move circle forward along z.
    circle.position.z += TUNNEL_SPEED;

    // If the circle has passed the near threshold (i.e. it's in front of the camera),
    // then move it to the back of the tunnel.
    if (circle.position.z > TUNNEL_NEAR) {
      circle.position.z -= TUNNEL_DEPTH;
    }

    // Compute a factor 'f' that goes from 0 (front) to 1 (back).
    let f = (TUNNEL_NEAR - circle.position.z) / (TUNNEL_DEPTH - Math.abs(TUNNEL_NEAR));
    f = Math.min(Math.max(f, 0), 1);

    // Apply mouse offset that increases with depth.
    circle.position.x = f * MOUSE_OFFSET_AMOUNT * normalizedMouseX;
    circle.position.y = f * MOUSE_OFFSET_AMOUNT * normalizedMouseY;

    // Update the opacity: front circles are fully opaque, far circles fade to 0.
    let opacity = OPACITY_NEAR * (1 - f) + OPACITY_FAR * f;
    circle.material.opacity = opacity;

    // Interpolate the star color based on depth.
    let lerpedColor = nearColor.clone().lerp(farColor, f);
    circle.material.color.copy(lerpedColor);
  });

  renderer.render(scene, camera);
}
