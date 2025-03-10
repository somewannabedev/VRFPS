// Import Three.js and GLTFLoader via CDN for simplicity (module setup)
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/GLTFLoader.js';

// Scene, camera, and renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.xr.enabled = true; // Enable WebXR for VR

// Start screen
const startScreen = document.createElement('div');
startScreen.style.position = 'absolute';
startScreen.style.top = '50%';
startScreen.style.left = '50%';
startScreen.style.transform = 'translate(-50%, -50%)';
startScreen.style.background = 'rgba(0, 0, 0, 0.8)';
startScreen.style.padding = '20px';
startScreen.style.color = 'white';
startScreen.innerHTML = '<h1>VR FPS Game</h1><button id="startButton">Start Game</button>';
document.body.appendChild(startScreen);
const startButton = document.getElementById('startButton');

// Loader for GLB models
const loader = new GLTFLoader();
let environment, gunModel, gunMixer;

// Load the factory level model
loader.load(
  'models/factory.glb', // Replace with your factory GLB path
  (gltf) => {
    environment = gltf.scene;
    environment.scale.set(1, 1, 1); // Adjust scale if needed
    scene.add(environment);
    console.log('Factory model loaded');
  },
  undefined,
  (error) => console.error('Error loading factory:', error)
);

// Load the animated gun model
loader.load(
  'models/gun.glb', // Replace with your gun GLB path
  (gltf) => {
    gunModel = gltf.scene;
    gunModel.scale.set(0.1, 0.1, 0.1); // Scale down to fit hand
    gunMixer = new THREE.AnimationMixer(gunModel);
    const action = gunMixer.clipAction(gltf.animations[0]); // Assumes first animation is firing
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    console.log('Gun model loaded');
  },
  undefined,
  (error) => console.error('Error loading gun:', error)
);

// VR Controller setup
let controller;
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

// Enemies and score
let enemies = [];
let score = 0;

// Score HUD
const scoreCanvas = document.createElement('canvas');
scoreCanvas.width = 256;
scoreCanvas.height = 64;
const scoreCtx = scoreCanvas.getContext('2d');
const scoreTexture = new THREE.CanvasTexture(scoreCanvas);
const scoreMaterial = new THREE.MeshBasicMaterial({ map: scoreTexture, transparent: true });
const scorePlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.25), scoreMaterial);
scorePlane.position.set(0, -0.5, -1); // Position in front of player
camera.add(scorePlane);
scene.add(camera);

function updateScoreDisplay() {
  scoreCtx.clearRect(0, 0, scoreCanvas.width, scoreCanvas.height);
  scoreCtx.fillStyle = 'white';
  scoreCtx.font = '30px Arial';
  scoreCtx.fillText(`Score: ${score}`, 10, 40);
  scoreTexture.needsUpdate = true;
}

// Tracer effect
function createTracer(start, end) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red tracer
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  setTimeout(() => scene.remove(line), 100); // Remove after 100ms
}

// Enemy class
class Enemy {
  constructor(position, path = []) {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1), // Rectangle enemy
      new THREE.MeshBasicMaterial({ color: 0x00ff00 }) // Green
    );
    this.mesh.position.copy(position);
    this.hits = 0;
    this.path = path;
    this.currentTargetIndex = 0;
    this.speed = 0.02;
    scene.add(this.mesh);
  }

  update(delta) {
    if (this.path.length > 0) {
      const target = this.path[this.currentTargetIndex];
      const direction = target.clone().sub(this.mesh.position);
      const distance = direction.length();
      if (distance > 0.1) {
        direction.normalize();
        this.mesh.position.add(direction.multiplyScalar(this.speed * delta));
      } else {
        this.currentTargetIndex = (this.currentTargetIndex + 1) % this.path.length;
      }
    }
  }
}

// Spawn enemies
function spawnEnemies() {
  // Static enemies
  enemies.push(new Enemy(new THREE.Vector3(5, 1, -10))); // y=1 to center on ground
  enemies.push(new Enemy(new THREE.Vector3(-5, 1, -10)));

  // Moving enemies with placeholder paths (update later)
  const path1 = [
    new THREE.Vector3(0, 1, -5),
    new THREE.Vector3(5, 1, 0),
    new THREE.Vector3(0, 1, 5),
    new THREE.Vector3(-5, 1, 0)
  ];
  enemies.push(new Enemy(new THREE.Vector3(0, 1, -5), path1));

  const path2 = [
    new THREE.Vector3(-10, 1, 0),
    new THREE.Vector3(-5, 1, 5),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(-5, 1, -5)
  ];
  enemies.push(new Enemy(new THREE.Vector3(-10, 1, 0), path2));
}

// Firing mechanic
function onSelectStart() {
  if (gunMixer) {
    const action = gunMixer.clipAction(gunModel.animations[0]);
    action.reset().play(); // Trigger firing animation
  }

  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const intersects = raycaster.intersectObjects(enemies.map(e => e.mesh), false);
  if (intersects.length > 0) {
    const hitEnemy = enemies.find(e => e.mesh === intersects[0].object);
    hitEnemy.hits++;
    score += 10;
    updateScoreDisplay();
    if (hitEnemy.hits >= 4) {
      scene.remove(hitEnemy.mesh);
    }
    createTracer(controller.position, intersects[0].point);
  } else {
    const farPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.multiplyScalar(50));
    createTracer(controller.position, farPoint);
  }
}

// Start game
startButton.addEventListener('click', () => {
  startScreen.style.display = 'none';
  navigator.xr.requestSession('immersive-vr').then((session) => {
    renderer.xr.setSession(session);
	// Force camera position to be correct inside VR
    const referenceSpaceType = 'local'; 
    session.requestReferenceSpace(referenceSpaceType).then((referenceSpace) => {
		renderer.xr.setReferenceSpace(referenceSpace);
        camera.position.set(0, -10.6, 0); // Ensure player starts at correct height
    });

    // Controller setup
    controller = renderer.xr.getController(0);
    scene.add(controller);
    controller.addEventListener('selectstart', onSelectStart);

    // Attach gun to controller
    if (gunModel) {
      controller.add(gunModel);
      gunModel.position.set(0, -0.1, -0.2); // Adjust for natural hand position
      gunModel.rotation.set(0, Math.PI, 0); // Adjust orientation
    }

    // Spawn enemies
    spawnEnemies();

    // Start animation loop
    renderer.setAnimationLoop(animate);
  }).catch((error) => console.error('VR session failed:', error));
});

// Animation loop
let clock = new THREE.Clock();
function animate() {
  const delta = clock.getDelta() * 1000; // Delta in ms

  // Update enemies
  enemies.forEach(enemy => enemy.update(delta));
  enemies = enemies.filter(enemy => enemy.hits < 4); // Remove dead enemies

  // Update gun animation
  if (gunMixer) gunMixer.update(delta / 1000);

  renderer.render(scene, camera);
}

// Initial setup
camera.position.set(0, 0, 0); // Default height, overridden by VR
updateScoreDisplay();

// Basic lighting (optional)
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const aLight = new THREE.Light(0xffffff, 0.5);
scene.add(aLight);