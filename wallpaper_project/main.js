import * as THREE from 'three';
import { Viewer } from '@mkkellogg/gaussian-splats-3d';

// =========================================================================
// 💎 最终壁纸配置 (全功能版)
// =========================================================================

const SETUP_MODE = false;

const MODEL_CONFIG = {
    cameraPos: { x: -0.317, y: 0.436, z: -13.112 },
    cameraTarget: { x: 0.522, y: -3.224, z: -58.038 },
    modelRotation: { x: -3.140, y: 0.000, z: 0.000 },
    modelScale: 20.0,
    cameraFOV: 45,          // 如果去掉了暗角觉得边缘空，可以试着把这个改小一点（比如 40）
    parallaxPower: 2.0,
    focusAperture: 0     // 改回 0.85 以恢复边缘融合；设为 0 则完全关闭
};

// =========================================================================
// 🚀 核心渲染引擎
// =========================================================================

const state = {
    mouseX: 0, mouseY: 0,
    camX: 0, camY: 0
};

async function init() {
    const container = document.getElementById('canvas-container');
    const loadingScreen = document.getElementById('loading-screen');

    container.style.backgroundColor = '#000000';

    // 1. 恢复暗角层逻辑
    // 即使 focusAperture 是 0，层也存在，只是透明度为 0，这样以后想改回来只要改配置就行
    const vignette = document.createElement('div');
    vignette.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;
        background: radial-gradient(circle, rgba(0,0,0,0) 30%, rgba(0,0,0,1) 95%);
        opacity: ${MODEL_CONFIG.focusAperture};
        transition: opacity 0.5s ease; /* 加个过渡效果 */
    `;
    document.body.appendChild(vignette);

    // 2. 初始化 Viewer
    const viewer = new Viewer({
        'rootElement': container,
        'cameraUp': [0, 1, 0],
        'initialCameraPosition': [MODEL_CONFIG.cameraPos.x, MODEL_CONFIG.cameraPos.y, MODEL_CONFIG.cameraPos.z],
        'initialCameraLookAt': [MODEL_CONFIG.cameraTarget.x, MODEL_CONFIG.cameraTarget.y, MODEL_CONFIG.cameraTarget.z],
        'selfDrivenMode': false,
        'useBuiltInControls': false,
        'camera': new THREE.PerspectiveCamera(MODEL_CONFIG.cameraFOV, window.innerWidth / window.innerHeight, 0.1, 2000)
    });

    try {
        await viewer.addSplatScene('./scene.ply', {
            'showLoadingUI': false,
            'position': [0, 0, 0],
            'rotation': [0, 0, 0, 1],
            'scale': [MODEL_CONFIG.modelScale, MODEL_CONFIG.modelScale, MODEL_CONFIG.modelScale]
        });

        if (viewer.splatMesh) {
            viewer.splatMesh.rotation.set(MODEL_CONFIG.modelRotation.x, MODEL_CONFIG.modelRotation.y, MODEL_CONFIG.modelRotation.z);
            if (!viewer.splatMesh.parent) viewer.threeScene.add(viewer.splatMesh);
        }

        // 强制刷新一次位置
        viewer.camera.position.set(MODEL_CONFIG.cameraPos.x, MODEL_CONFIG.cameraPos.y, MODEL_CONFIG.cameraPos.z);
        viewer.camera.lookAt(new THREE.Vector3(MODEL_CONFIG.cameraTarget.x, MODEL_CONFIG.cameraTarget.y, MODEL_CONFIG.cameraTarget.z));

        loadingScreen.style.opacity = '0';
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 1000);

        const animate = () => {
            requestAnimationFrame(animate);
            applyParallax(viewer);
            viewer.render();
        };
        animate();

    } catch (e) {
        console.error(e);
    }

    window.addEventListener('mousemove', (e) => {
        state.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        state.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('resize', () => {
        viewer.camera.aspect = window.innerWidth / window.innerHeight;
        viewer.camera.updateProjectionMatrix();
    });
}

function applyParallax(viewer) {
    const p = MODEL_CONFIG.parallaxPower;
    state.camX += (-state.mouseX * p - state.camX) * 0.05;
    state.camY += (-state.mouseY * p - state.camY) * 0.05;

    const camera = viewer.camera;
    const base = MODEL_CONFIG.cameraPos;
    const target = MODEL_CONFIG.cameraTarget;

    camera.position.x = base.x + state.camX;
    camera.position.y = base.y + state.camY;
    camera.lookAt(new THREE.Vector3(target.x, target.y, target.z));

    viewer.update();
}

init();