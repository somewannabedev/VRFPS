// Import Three.js via CDN
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// Scene, Camera, and Renderer Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.xr.enabled = true; // Enable WebXR

// Start Screen UI
const startScreen = document.createElement('div');
startScreen.style.position = 'absolute';
startScreen.style.top = '50%';
startScreen.style.left = '50%';
startScreen.style.transform = 'translate(-50%, -50%)';
startScreen.style.background = 'rgba(0, 0, 0, 0.8)';
startScreen.style.padding = '20px';
startScreen.style.color = 'white';
startScreen.innerHTML = '<h1>Basic VR FPS</h1><button id="startButton">Start Game</button>';
document.body.appendChild(startScreen);
const startButton = document.getElementById('startButton');

// Enemy Setup
let enemy;
function spawnEnemy() {
  enemy = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 1), // Green box enemy
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  enemy.position.set(0, 1, -5); // Position enemy 5m in front of player
  scene.add(enemy);
}

// Room Setup
function createRoom() {
  const roomSize = 10;

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
  const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2; // Rotate to make the floor flat
  floor.position.y = -1; // Slightly below player height
  scene.add(floor);

  // Walls
  const wallMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });

  // Front wall
  const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), wallMaterial);
  frontWall.position.z = -roomSize / 2;
  frontWall.rotation.y = Math.PI;
  scene.add(frontWall);

  // Back wall
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), wallMaterial);
  backWall.position.z = roomSize / 2;
  scene.add(backWall);

  // Left wall
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), wallMaterial);
  leftWall.position.x = -roomSize / 2;
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), wallMaterial);
  rightWall.position.x = roomSize / 2;
  rightWall.rotation.y = -Math.PI / 2;
  scene.add(rightWall);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), wallMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = roomSize / 2;
  scene.add(ceiling);
}

// VR Controller Setup
let controller;
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

// Firing Mechanic
function onSelectStart() {
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const intersects = raycaster.intersectObject(enemy, false);
  if (intersects.length > 0) {
    scene.remove(enemy); // Remove enemy if hit
    console.log('Enemy hit!');
  }
}

// Start Game
startButton.addEventListener('click', () => {
  startScreen.style.display = 'none';

  navigator.xr.requestSession('immersive-vr', { requiredFeatures: ['local'] })
    .then((session) => {
      renderer.xr.setSession(session);

      session.requestReferenceSpace('local').then((referenceSpace) => {
        renderer.xr.setReferenceSpace(referenceSpace);
        camera.position.set(0, 1.6, 0); // Ensure player starts at a normal height
      });

      // Controller setup
      controller = renderer.xr.getController(0);
      scene.add(controller);
      controller.addEventListener('selectstart', onSelectStart);

      // Spawn enemy
      spawnEnemy();

      // Create the room (floor, walls, ceiling)
      createRoom();

      // Add Light inside the room
      const light = new THREE.AmbientLight(0xffffff, 1); // Ambient light
      scene.add(light);

      // Start animation loop
      renderer.setAnimationLoop(animate);
    })
    .catch((error) => console.error('VR session failed:', error));
});

// Animation Loop
function animate() {
  renderer.render(scene, camera);
}

