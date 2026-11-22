import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.getElementById('app')!.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#8fd3ff');
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
camera.position.set(3, 3, 3);
camera.lookAt(0, 0, 0);
scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial()));
renderer.render(scene, camera);
(window as any).__info = () => ({ gl: (renderer.getContext().getParameter(renderer.getContext().getExtension('WEBGL_debug_renderer_info')!.UNMASKED_RENDERER_WEBGL)) });
(window as any).__ready = true;
