import * as THREE from 'three';
import { Viewer } from '@mkkellogg/gaussian-splats-3d';

// =========================================================================
// 💎 最终壁纸配置 (全功能版)
// =========================================================================

// Parse Query Params
const urlParams = new URLSearchParams(window.location.search);
const wpId = urlParams.get('id');
const directorMode = urlParams.get('mode') === 'director';

const SETUP_MODE = directorMode; // Enable controls if director mode

const MODEL_CONFIG = {
    cameraPos: { x: 0, y: 0, z: 5 },
    cameraTarget: { x: 0, y: 0, z: 0 },
    modelRotation: { x: 0, y: 0, z: 0 },
    modelScale: 1.0,
    cameraFOV: 45,
    parallaxPower: 2.0,
    focusAperture: 0.85     // Default vignette opacity
};

// =========================================================================
// 🚀 核心渲染引擎
// =========================================================================

const state = {
    mouseX: 0, mouseY: 0,
    camX: 0, camY: 0
};

async function getPlyPath() {
    if (!wpId) return './scene.ply'; // Fallback

    try {
        const response = await fetch(`/api/upload/${wpId}`);
        if (!response.ok) throw new Error("Metadata fetch failed");
        const data = await response.json();
        if (data.ply_path) {
            // Adjust path if needed. Assuming /media mount
            // DB stores relative path like "data/generated/xxx.ply"
            // We need "/media/generated/xxx.ply"
            let path = data.ply_path.replace(/\\/g, '/');
            if (path.startsWith('data/')) {
                path = path.replace(/^data\//, '/media/');
            }
            console.log("[AnimaFlow] Resolved PLY Path:", path);
            return path;
        }
    } catch (e) {
        console.error("Failed to load wallpaper info, using default.", e);
    }
    return './scene.ply';
}

async function loadConfig() {
    if (!wpId) return;
    try {
        const response = await fetch(`/api/view/${wpId}`);
        if (response.ok) {
            const data = await response.json();
            console.log("[AnimaFlow] Loaded Saved Config:", data);

            if (data.fov) {
                MODEL_CONFIG.cameraFOV = data.fov;
            }

            if (data.cam_matrix) {
                try {
                    const parsed = JSON.parse(data.cam_matrix);
                    // Check if it's the new format with position/target
                    if (parsed.position && parsed.target) {
                        MODEL_CONFIG.cameraPos = parsed.position;
                        MODEL_CONFIG.cameraTarget = parsed.target;
                    }
                    if (parsed.parallaxPower !== undefined) {
                        MODEL_CONFIG.parallaxPower = parsed.parallaxPower;
                    }
                    if (parsed.focusAperture !== undefined) {
                        MODEL_CONFIG.focusAperture = parsed.focusAperture;
                    }
                    if (parsed.modelRotation) {
                        MODEL_CONFIG.modelRotation = parsed.modelRotation;
                    }
                    console.log("[AnimaFlow] Restored Camera & Effects Config");
                } catch (err) {
                    console.warn("Failed to parse cam_matrix json", err);
                }
            }
        }
    } catch (e) {
        console.warn("Failed to load view config, using defaults.", e);
    }
}

async function init() {
    const container = document.getElementById('canvas-container');
    const loadingScreen = document.getElementById('loading-screen');

    container.style.backgroundColor = '#000000';

    // Pre-load configuration before initializing viewer
    await loadConfig();

    // 1. 恢复暗角层逻辑
    const vignette = document.createElement('div');
    vignette.id = 'vignette-overlay';
    vignette.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;
        background: radial-gradient(circle, rgba(0,0,0,0) 30%, rgba(0,0,0,1) 95%);
        opacity: ${MODEL_CONFIG.focusAperture};
        transition: opacity 0.2s ease;
    `;
    document.body.appendChild(vignette);

    // 2. 初始化 Viewer
    // 🔍 自动检测环境兼容性 (修复 Wallpaper Engine 卡死问题)
    const isSharedMemoryAvailable = typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated;
    console.log(`[AnimaFlow] Environment Check - SharedArrayBuffer: ${typeof SharedArrayBuffer}, CrossOriginIsolated: ${window.crossOriginIsolated}`);
    
    const viewer = new Viewer({
        'rootElement': container,
        'cameraUp': [0, 1, 0],
        'initialCameraPosition': [MODEL_CONFIG.cameraPos.x, MODEL_CONFIG.cameraPos.y, MODEL_CONFIG.cameraPos.z],
        'initialCameraLookAt': [MODEL_CONFIG.cameraTarget.x, MODEL_CONFIG.cameraTarget.y, MODEL_CONFIG.cameraTarget.z],
        'selfDrivenMode': false,
        'useBuiltInControls': SETUP_MODE, // Enable orbit controls in Director Mode
        'dynamicScene': true, // 💎 关键修复：告诉 Viewer 模型本身会动，强制每帧重排 Splat，防止画面破碎
        'antialiased': true,  // 💎 画质提升：开启抗锯齿
        'sharedMemoryForWorkers': isSharedMemoryAvailable, // 🛡️ 核心修复：根据环境自动降级
        'camera': new THREE.PerspectiveCamera(MODEL_CONFIG.cameraFOV, window.innerWidth / window.innerHeight, 0.1, 2000)
    });

    const plyPath = await getPlyPath();
    console.log("Loading PLY:", plyPath);

    try {
        await viewer.addSplatScene(plyPath, {
            'showLoadingUI': false,
            'position': [0, 0, 0],
            'rotation': [0, 0, 0, 1],
            'scale': [MODEL_CONFIG.modelScale, MODEL_CONFIG.modelScale, MODEL_CONFIG.modelScale]
        });

        if (viewer.splatMesh) {
            viewer.splatMesh.rotation.set(MODEL_CONFIG.modelRotation.x, MODEL_CONFIG.modelRotation.y, MODEL_CONFIG.modelRotation.z);
            if (!viewer.splatMesh.parent) viewer.threeScene.add(viewer.splatMesh);
        }

        // 强制刷新一次位置 (无论什么模式都执行)
        viewer.camera.position.set(MODEL_CONFIG.cameraPos.x, MODEL_CONFIG.cameraPos.y, MODEL_CONFIG.cameraPos.z);
        viewer.camera.lookAt(new THREE.Vector3(MODEL_CONFIG.cameraTarget.x, MODEL_CONFIG.cameraTarget.y, MODEL_CONFIG.cameraTarget.z));

        // 如果是导演模式，需要更新 OrbitControls 的目标点，否则它会以 (0,0,0) 为中心旋转
        if (SETUP_MODE && viewer.controls) {
            viewer.controls.target.set(MODEL_CONFIG.cameraTarget.x, MODEL_CONFIG.cameraTarget.y, MODEL_CONFIG.cameraTarget.z);

            // 🔓 解锁相机旋转限制 (允许无死角查看)
            viewer.controls.minPolarAngle = 0;
            viewer.controls.maxPolarAngle = Math.PI;
            viewer.controls.minAzimuthAngle = -Infinity;
            viewer.controls.maxAzimuthAngle = Infinity;

            viewer.controls.update();

            // === 🎥 导演模式增强：实时参数面板 ===
            const debugPanel = document.createElement('div');
            debugPanel.style.cssText = `
                position: absolute; bottom: 20px; left: 20px; z-index: 100;
                background: rgba(0, 0, 0, 0.85); color: #0f0; padding: 15px;
                font-family: 'Courier New', monospace; font-size: 13px;
                border-radius: 8px; border: 1px solid #333; pointer-events: auto;
                user-select: none; min-width: 300px; backdrop-filter: blur(5px);
            `;

            // Added controls section
            debugPanel.innerHTML = `
                <div style="font-weight:bold; color:#fff; margin-bottom:10px; border-bottom:1px solid #555; padding-bottom:5px;">DIRECTOR MODE</div>
                
                <div style="margin-bottom: 12px;">
                    <label style="color: #ccc; display: flex; justify-content: space-between;">FOV <span id="val-fov">${MODEL_CONFIG.cameraFOV}</span></label>
                    <input type="range" id="fov-slider" min="10" max="150" step="1" style="width: 100%; cursor: pointer;">
                </div>

                <div style="margin-bottom: 12px;">
                    <label style="color: #ccc; display: flex; justify-content: space-between;">Parallax Power <span id="val-parallax">${MODEL_CONFIG.parallaxPower}</span></label>
                    <input type="range" id="parallax-slider" min="0" max="10" step="0.1" style="width: 100%; cursor: pointer;">
                </div>

                <div style="margin-bottom: 12px;">
                    <label style="color: #ccc; display: flex; justify-content: space-between;">Vignette (Focus) <span id="val-focus">${MODEL_CONFIG.focusAperture}</span></label>
                    <input type="range" id="focus-slider" min="0" max="1" step="0.05" style="width: 100%; cursor: pointer;">
                </div>

                <div style="margin-bottom: 5px; border-top:1px dashed #444; padding-top:5px; font-size:11px; color:#888;">MODEL ROTATION</div>
                <div style="margin-bottom: 5px; display:flex; align-items:center;">
                    <span style="width:20px; color:#f55">X</span> <input type="range" id="rot-x" min="0" max="6.28" step="0.1" style="flex:1;">
                </div>
                <div style="margin-bottom: 5px; display:flex; align-items:center;">
                    <span style="width:20px; color:#5f5">Y</span> <input type="range" id="rot-y" min="0" max="6.28" step="0.1" style="flex:1;">
                </div>
                <div style="margin-bottom: 12px; display:flex; align-items:center;">
                    <span style="width:20px; color:#55f">Z</span> <input type="range" id="rot-z" min="0" max="6.28" step="0.1" style="flex:1;">
                </div>

                <div style="margin-bottom: 12px; display:flex; gap:5px;">
                    <button id="btn-flip-h" style="flex:1; background:#444; color:#ddd; border:1px solid #666; cursor:pointer; font-size:11px; padding:4px;">FLIP HORZ</button>
                    <button id="btn-flip-v" style="flex:1; background:#444; color:#ddd; border:1px solid #666; cursor:pointer; font-size:11px; padding:4px;">FLIP VERT</button>
                    <button id="btn-reset-cam" style="flex:1; background:#664; color:#fff; border:1px solid #886; cursor:pointer; font-size:11px; padding:4px;">RESET CAM</button>
                </div>

                <div style="margin-top: 15px; display:flex; gap:10px;">
                    <button id="save-config-btn" style="flex:1; background: #28a745; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-family: inherit; font-weight:bold;">SAVE CONFIG</button>
                </div>
                <div id="save-status" style="margin-top:5px; height:20px; color: #fff; text-align:center; font-size:12px;"></div>
                
                <div id="debug-content" style="margin-top:10px; padding-top:10px; border-top:1px solid #444; color:#aaa; font-size:11px;"></div>
            `;
            document.body.appendChild(debugPanel);

            // Init Sliders
            const fovSlider = document.getElementById('fov-slider');
            const parallaxSlider = document.getElementById('parallax-slider');
            const focusSlider = document.getElementById('focus-slider');
            const rotX = document.getElementById('rot-x');
            const rotY = document.getElementById('rot-y');
            const rotZ = document.getElementById('rot-z');

            fovSlider.value = MODEL_CONFIG.cameraFOV;
            parallaxSlider.value = MODEL_CONFIG.parallaxPower;
            focusSlider.value = MODEL_CONFIG.focusAperture;

            // Set initial rotation values from config
            rotX.value = MODEL_CONFIG.modelRotation.x;
            rotY.value = MODEL_CONFIG.modelRotation.y;
            rotZ.value = MODEL_CONFIG.modelRotation.z;

            // Event Listeners
            const updateModelRot = () => {
                MODEL_CONFIG.modelRotation.x = parseFloat(rotX.value);
                MODEL_CONFIG.modelRotation.y = parseFloat(rotY.value);
                MODEL_CONFIG.modelRotation.z = parseFloat(rotZ.value);
                if (viewer.splatMesh) {
                    viewer.splatMesh.rotation.set(
                        MODEL_CONFIG.modelRotation.x,
                        MODEL_CONFIG.modelRotation.y,
                        MODEL_CONFIG.modelRotation.z
                    );
                }
            };
            rotX.addEventListener('input', updateModelRot);
            rotY.addEventListener('input', updateModelRot);
            rotZ.addEventListener('input', updateModelRot);

            fovSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                MODEL_CONFIG.cameraFOV = val;
                viewer.camera.fov = val;
                viewer.camera.updateProjectionMatrix();
                document.getElementById('val-fov').innerText = val;
            });

            parallaxSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                MODEL_CONFIG.parallaxPower = val;
                document.getElementById('val-parallax').innerText = val;
            });

            focusSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                MODEL_CONFIG.focusAperture = val;
                document.getElementById('vignette-overlay').style.opacity = val;
                document.getElementById('val-focus').innerText = val;
            });

            // Button Listeners
            document.getElementById('btn-flip-h').addEventListener('click', () => {
                // Orbit 180 deg around Y
                const currentPos = viewer.camera.position.clone().sub(viewer.controls.target);
                currentPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
                viewer.camera.position.copy(viewer.controls.target).add(currentPos);
                viewer.camera.lookAt(viewer.controls.target);
            });

            document.getElementById('btn-flip-v').addEventListener('click', () => {
                // Invert Up Vector
                viewer.camera.up.y = viewer.camera.up.y > 0 ? -1 : 1;
                // Need to re-orient camera
                viewer.camera.lookAt(viewer.controls.target);
            });

            document.getElementById('btn-reset-cam').addEventListener('click', () => {
                viewer.camera.up.set(0, 1, 0);
                viewer.controls.reset();
                // Re-apply current config pos
                viewer.camera.position.set(MODEL_CONFIG.cameraPos.x, MODEL_CONFIG.cameraPos.y, MODEL_CONFIG.cameraPos.z);
                viewer.controls.target.set(MODEL_CONFIG.cameraTarget.x, MODEL_CONFIG.cameraTarget.y, MODEL_CONFIG.cameraTarget.z);
                viewer.camera.lookAt(viewer.controls.target);
            });

            // Init Save Button
            const saveBtn = document.getElementById('save-config-btn');
            const saveStatus = document.getElementById('save-status');

            saveBtn.addEventListener('click', async () => {
                if (!wpId) return;
                saveBtn.disabled = true;
                saveBtn.style.opacity = "0.5";
                saveStatus.innerText = "Saving to database...";

                try {
                    // Enhanced payload to store full camera state AND effects
                    const camState = {
                        matrix: viewer.camera.matrixWorld.elements,
                        position: viewer.camera.position,
                        target: viewer.controls.target,
                        parallaxPower: MODEL_CONFIG.parallaxPower,
                        focusAperture: MODEL_CONFIG.focusAperture,
                        modelRotation: MODEL_CONFIG.modelRotation
                    };

                    const payload = {
                        wallpaper_id: wpId,
                        user: 'default',
                        fov: MODEL_CONFIG.cameraFOV,
                        cam_matrix: JSON.stringify(camState)
                    };

                    const res = await fetch('/api/view/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (res.ok) {
                        saveStatus.innerText = "✅ Configuration Saved!";
                        saveStatus.style.color = "#4fd675";
                        setTimeout(() => {
                            saveStatus.innerText = "";
                            saveStatus.style.color = "#fff";
                        }, 2500);
                    } else {
                        throw new Error("API Error");
                    }
                } catch (e) {
                    console.error(e);
                    saveStatus.innerText = "❌ Save Failed!";
                    saveStatus.style.color = "#ff4444";
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.style.opacity = "1";
                }
            });

            const debugContent = document.getElementById('debug-content');
            const updateDebug = () => {
                if (!debugContent) return;
                const p = viewer.camera.position;

                // Format helper
                const f = (v) => v.toFixed(2);

                debugContent.innerHTML = `
                    CAM: [${f(p.x)}, ${f(p.y)}, ${f(p.z)}]
                `;
                requestAnimationFrame(updateDebug);
            };
            updateDebug();
        }

        loadingScreen.style.opacity = '0';
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 1000);

        const animate = () => {
            requestAnimationFrame(animate);
            if (!SETUP_MODE) {
                applyParallax(viewer);
            } else {
                viewer.update();
            }
            viewer.render();
        };
        animate();

    } catch (e) {
        console.error(e);
        loadingScreen.innerHTML = `<div style="color:red">加载失败: ${e.message}</div>`;
    }

    if (!SETUP_MODE) {
        window.addEventListener('mousemove', (e) => {
            state.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            state.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        });
    }

    window.addEventListener('resize', () => {
        viewer.camera.aspect = window.innerWidth / window.innerHeight;
        viewer.camera.updateProjectionMatrix();
    });
}

function applyParallax(viewer) {
    const p = MODEL_CONFIG.parallaxPower;
    
    // 缓动计算
    state.camX += (state.mouseX - state.camX) * 0.08;
    state.camY += (state.mouseY - state.camY) * 0.08;

    const basePos = new THREE.Vector3(MODEL_CONFIG.cameraPos.x, MODEL_CONFIG.cameraPos.y, MODEL_CONFIG.cameraPos.z);
    const target = new THREE.Vector3(MODEL_CONFIG.cameraTarget.x, MODEL_CONFIG.cameraTarget.y, MODEL_CONFIG.cameraTarget.z);

    // 1. 计算视距
    const viewVector = new THREE.Vector3().subVectors(basePos, target);
    const distance = viewVector.length();

    // 2. 像素级物理锁定 (Pixel-Perfect Lock)
    // 利用 FOV 计算在目标距离处，屏幕究竟有多宽/多高
    // 这样能保证鼠标移动的比例与物体移动的比例是 1:1 的 (当 Power=1.0 时)
    const vFOV = THREE.MathUtils.degToRad(viewer.camera.fov);
    const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
    const visibleWidth = visibleHeight * viewer.camera.aspect;

    // 3. 计算精确位移
    // state.camX 通常范围是 -1 到 1 (屏幕左边缘到右边缘)
    // 我们将其映射到物理宽度的一半，实现"指哪打哪"的跟手感
    const offsetX = -state.camX * (visibleWidth / 2) * p;
    const offsetY = -state.camY * (visibleHeight / 2) * p;

    // 4. 局部坐标轴
    const forward = viewVector.clone().normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(forward.y) > 0.99) worldUp.set(0, 0, 1);
    
    const right = new THREE.Vector3().crossVectors(worldUp, forward).normalize();
    const up = new THREE.Vector3().crossVectors(forward, right).normalize();

    // 5. 应用位移
    const camOffset = new THREE.Vector3()
        .addScaledVector(right, offsetX)
        .addScaledVector(up, offsetY);

    // 6. 纯平移 (Target 跟随)
    const dynamicTarget = target.clone().add(camOffset);

    viewer.camera.position.copy(basePos).add(camOffset);
    viewer.camera.lookAt(dynamicTarget);

    if(viewer.splatMesh) {
        viewer.splatMesh.rotation.set(MODEL_CONFIG.modelRotation.x, MODEL_CONFIG.modelRotation.y, MODEL_CONFIG.modelRotation.z);
    }

    viewer.update();
}

init();