'use strict';

let canvas, engine, scene, camera, freeCamera, box;
let cameraMode = 'orbit';
let cubetti = [];
let dist = 0.4;
let p0, currentPivot;
let shadowGenerator;
let pivot_macchina, pivot_rotation;
let mfoglie_mat, mtronco_mat;
let carSpeed = 50;
let targetSpeed = 50;
let carPos = 0;
let speedValueEl;

const trackHash = new Map();
const CELL = 1.5;
const UNDERGROUND_Y = -0.3;

window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('renderCanvas');
    canvas.addEventListener('wheel', evt => evt.preventDefault());

    engine = new BABYLON.Engine(canvas, true);
    scene  = new BABYLON.Scene(engine);

    // Cielo e nebbia
    scene.clearColor = new BABYLON.Color4(0.52, 0.80, 0.97, 1.0);
    scene.fogMode    = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.006;
    scene.fogColor   = new BABYLON.Color3(0.72, 0.86, 0.97);

    // Camera orbit (default)
    camera = new BABYLON.ArcRotateCamera('cam-orbit', -1.2, 0.6, 20,
        new BABYLON.Vector3(0, 2, 0), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision  = 50;
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 200;
    camera.upperBetaLimit   = 1.52;
    camera.panningSensibility = 80;

    // Camera libera — frecce per muoversi, click+trascina per guardare
    freeCamera = new BABYLON.UniversalCamera('cam-free',
        new BABYLON.Vector3(0, 10, -25), scene);
    freeCamera.setTarget(new BABYLON.Vector3(0, 2, 0));
    freeCamera.speed  = 0.5;
    freeCamera.minZ   = 0.1;
    freeCamera.keysUp    = [38]; // ArrowUp
    freeCamera.keysDown  = [40]; // ArrowDown
    freeCamera.keysLeft  = [37]; // ArrowLeft
    freeCamera.keysRight = [39]; // ArrowRight

    // V → toggle camera
    window.addEventListener('keydown', evt => {
        if (evt.key === 'v' || evt.key === 'V') toggleCamera();
    });

    creaMenuUI();
    populateScene();

    engine.runRenderLoop(() => scene.render());
    window.addEventListener('resize', () => engine.resize());
});

// ─── Camera ──────────────────────────────────────────────────────────────────

function toggleCamera() {
    if (cameraMode === 'orbit') {
        camera.detachControl();
        scene.activeCamera = freeCamera;
        freeCamera.attachControl(canvas, true);
        cameraMode = 'free';
    } else {
        freeCamera.detachControl();
        scene.activeCamera = camera;
        camera.attachControl(canvas, true);
        cameraMode = 'orbit';
    }
    const lbl = document.getElementById('cam-mode-label');
    if (lbl) lbl.textContent = cameraMode === 'orbit'
        ? 'Orbit — trascina per ruotare'
        : 'Libera — ↑↓←→ muovi  click ruota';
}

// ─── UI ──────────────────────────────────────────────────────────────────────

function creaMenuUI() {
    function row(k, label, color) {
        color = color || '#ffd700';
        return `<div style="display:flex;gap:10px;align-items:center;padding:3px 0">
            <kbd style="background:#222;border:1px solid #444;border-radius:4px;
                        padding:1px 6px;color:${color};font-family:monospace;
                        font-size:12px;min-width:20px;text-align:center">${k}</kbd>
            <span style="color:#bbb;font-size:12px">${label}</span>
        </div>`;
    }
    function sep(title) {
        return `<div style="color:#555;font-size:10px;letter-spacing:1.5px;
                            margin:12px 0 5px;padding-top:8px;
                            border-top:1px solid #222">${title}</div>`;
    }

    // Pannello laterale sinistro
    const panel = document.createElement('div');
    panel.id = 'side-panel';
    panel.style.cssText = [
        'position:fixed','top:0','left:0','height:100%','width:210px',
        'background:rgba(8,10,18,0.92)','color:#fff','font-family:monospace',
        'z-index:100','overflow-y:auto','padding-bottom:24px',
        'border-right:1px solid #1e2030',
        'box-shadow:4px 0 28px rgba(0,0,0,0.7)',
        'transition:transform 0.22s cubic-bezier(.4,0,.2,1)'
    ].join(';');

    panel.innerHTML = `
        <div style="padding:14px 14px 10px;border-bottom:1px solid #1e2030;
                    display:flex;justify-content:space-between;align-items:center">
            <div>
                <div style="font-size:15px;font-weight:bold;color:#ffd700
                    ;letter-spacing:.5px">&#127950; Costruttore</div>
                <div id="cam-mode-label" style="font-size:10px;color:#555;margin-top:3px">
                    Orbit — trascina per ruotare</div>
            </div>
            <button id="panel-close-btn"
                style="background:none;border:1px solid #333;color:#666;
                       border-radius:5px;width:26px;height:26px;cursor:pointer;
                       font-size:13px;line-height:1;padding:0">✕</button>
        </div>

        <div style="padding:4px 14px 0">
            ${sep('PISTA')}
            ${row('A','Rettilineo')}
            ${row('Q','Curva destra')}
            ${row('D','Curva sinistra')}
            ${row('F','Giro della morte')}
            ${row('E','Giro della morte ↔ (specul.)')}
            ${row('G','Spirale in discesa')}
            ${row('T','Spirale discesa ↔ (specul.)')}
            ${row('H','Spirale in salita')}
            ${row('Y','Spirale salita ↔ (specul.)')}
            ${row('Z','Salita dolce')}
            ${row('X','Discesa dolce')}
            ${row('C','Chiudi circuito')}
            ${row('R','Reset pista','#ff7575')}

            ${sep('VELOCITÀ')}
            ${row('W','Accelera')}
            ${row('S','Decelera / frena')}

            ${sep('CAMERA')}
            ${row('V','Free ↔ Orbit')}
            <div style="color:#444;font-size:10px;line-height:1.7;margin-top:4px">
                Free: ↑↓←→ muovi<br>click+trascina: guarda
            </div>

            ${sep('PANNELLO')}
            ${row('I','Mostra / nascondi')}
        </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('panel-close-btn').onclick = () => togglePanel();

    // Bottone hamburger (visibile quando il pannello è nascosto)
    const openBtn = document.createElement('button');
    openBtn.id = 'panel-open-btn';
    openBtn.innerHTML = '&#9776;';
    openBtn.title = 'Mostra pannello (I)';
    openBtn.style.cssText = [
        'position:fixed','top:14px','left:14px','z-index:102',
        'background:rgba(8,10,18,0.88)','color:#ffd700',
        'border:1px solid #333','border-radius:8px',
        'width:36px','height:36px','font-size:18px',
        'cursor:pointer','display:none','padding:0','line-height:1'
    ].join(';');
    openBtn.onclick = () => togglePanel();
    document.body.appendChild(openBtn);

    // I → toggle pannello
    window.addEventListener('keydown', evt => {
        if (evt.key === 'i' || evt.key === 'I') togglePanel();
    });

    // Hint panel (fondo schermo)
    const hint = document.createElement('div');
    hint.id = 'hint-panel';
    hint.style.cssText = [
        'position:fixed','bottom:24px','left:50%','transform:translateX(-50%)',
        'color:#fff','padding:10px 22px','border-radius:8px',
        'font-family:monospace','font-size:13px','display:none','z-index:99',
        'pointer-events:none','transition:background 0.25s'
    ].join(';');
    document.body.appendChild(hint);

    // Contachilometri
    const speedo = document.createElement('div');
    speedo.style.cssText = [
        'position:fixed','bottom:24px','right:24px','z-index:99',
        'background:rgba(8,10,18,0.88)','border:2px solid #ffd700',
        'border-radius:14px','padding:10px 18px','text-align:center',
        'font-family:monospace','min-width:90px',
        'box-shadow:0 4px 20px rgba(0,0,0,0.6)'
    ].join(';');
    speedo.innerHTML = `
        <div id="speed-value"
             style="font-size:40px;font-weight:bold;color:#ffd700;line-height:1.1">72</div>
        <div style="font-size:11px;color:#555;letter-spacing:3px;margin-top:2px">KM/H</div>
        <div style="margin-top:6px;height:4px;background:#1e2030;border-radius:2px">
            <div id="speed-bar"
                 style="height:4px;background:#ffd700;border-radius:2px;
                        width:17%;transition:width 0.12s"></div>
        </div>
    `;
    document.body.appendChild(speedo);
    speedValueEl = document.getElementById('speed-value');
}

function togglePanel() {
    const panel  = document.getElementById('side-panel');
    const openBtn = document.getElementById('panel-open-btn');
    const hidden = panel.style.transform === 'translateX(-100%)';
    panel.style.transform  = hidden ? '' : 'translateX(-100%)';
    openBtn.style.display  = hidden ? 'none' : 'block';
}

// ─── Geometria pista (invariata) ─────────────────────────────────────────────

function toWorld(pivot, localPos) {
    return BABYLON.Vector3.TransformCoordinates(localPos, pivot.computeWorldMatrix());
}

function ElicaSalita(pivot) {
    let AltezzaY = 5, n = 200;
    let r = n * dist / Math.PI / 2;
    for (let i = 0; i < n; i++) {
        let phi = Math.PI * 2 * i / n;
        let b = box.createInstance('box-Elica');
        b.isVisible = true;
        b.position.set(r * Math.sin(phi), AltezzaY / n * i, r + r * -Math.cos(phi));
        b.parent = pivot;
        b.rotation.y = -phi;
        cubetti.push(b);
    }
    let lastPos = toWorld(pivot, new BABYLON.Vector3(
        r * Math.sin(2 * Math.PI), AltezzaY, r + r * -Math.cos(2 * Math.PI)));
    let np = new BABYLON.TransformNode('nuovo');
    np.position.copyFrom(lastPos);
    np.rotation.copyFrom(pivot.rotation);
    return np;
}

function ElicaDiscesa(pivot) {
    let DislielloY = -5, n = 200;
    let r = n * dist / Math.PI / 2;
    for (let i = 0; i < n; i++) {
        let phi = Math.PI * 2 * i / n;
        let b = box.createInstance('box-Elica');
        b.isVisible = true;
        b.position.set(r * Math.sin(phi), DislielloY / n * i, r + r * -Math.cos(phi));
        b.parent = pivot;
        b.rotation.y = -phi;
        cubetti.push(b);
    }
    let lastPos = toWorld(pivot, new BABYLON.Vector3(
        r * Math.sin(2 * Math.PI), DislielloY, r + r * -Math.cos(2 * Math.PI)));
    let np = new BABYLON.TransformNode('nuovo');
    np.position.copyFrom(lastPos);
    np.rotation.copyFrom(pivot.rotation);
    return np;
}

function destra(pivot, n = 30) {
    let completePhi = Math.PI / 2;
    let r = n * dist / completePhi;
    for (let i = 0; i < n; i++) {
        let phi = i * completePhi / n;
        let b = box.createInstance('box-Destra');
        b.isVisible = true;
        b.position.set(r * Math.sin(phi), 0, -r + r * Math.cos(phi));
        b.rotation.y = phi + Math.PI;
        b.parent = pivot;
        cubetti.push(b);
    }
    let lastPos = toWorld(pivot, new BABYLON.Vector3(
        r * Math.sin(completePhi), 0, -r + r * Math.cos(completePhi)));
    let np = new BABYLON.TransformNode('nuovo');
    np.position.copyFrom(lastPos);
    np.rotation.copyFrom(pivot.rotation);
    np.rotation.y += completePhi;
    return np;
}

function sinistra(pivot, n = 30) {
    let completePhi = Math.PI / 2;
    let r = n * dist / completePhi;
    for (let i = 0; i < n; i++) {
        let phi = i * completePhi / n;
        let b = box.createInstance('box-Destra');
        b.isVisible = true;
        b.position.set(r * Math.sin(phi), 0, r - r * Math.cos(phi));
        b.rotation.y = -phi + Math.PI;
        b.parent = pivot;
        cubetti.push(b);
    }
    let lastPos = toWorld(pivot, new BABYLON.Vector3(
        r * Math.sin(completePhi), 0, r - r * Math.cos(completePhi)));
    let np = new BABYLON.TransformNode('nuovo');
    np.position.copyFrom(lastPos);
    np.rotation.copyFrom(pivot.rotation);
    np.rotation.y -= completePhi;
    return np;
}

function GiroMorte(pivot) {
    let LarghezzaZ = 2, n = 200;
    let r = n * dist / Math.PI / 2;
    for (let i = 0; i < n; i++) {
        let phi = Math.PI * 2 * i / n;
        let b = box.createInstance('box-GiroMorte');
        b.isVisible = true;
        b.position.set(r * Math.sin(phi), r + r * -Math.cos(phi), LarghezzaZ / n * i);
        b.parent = pivot;
        b.rotation.z = phi;
        cubetti.push(b);
    }
    let lastPos = toWorld(pivot, new BABYLON.Vector3(
        r * Math.sin(2 * Math.PI), r + r * -Math.cos(2 * Math.PI), LarghezzaZ));
    let np = new BABYLON.TransformNode('nuovo');
    np.position.copyFrom(lastPos);
    np.rotation.copyFrom(pivot.rotation);
    return np;
}

// ─── Pezzi speculari (riflessi sull'asse di avanzamento X) ───────────────────
// Annullano lo sbilanciamento laterale dei rispettivi pezzi normali.

function GiroMorteDx(pivot) {
    let LarghezzaZ = -2, n = 200;   // deriva laterale opposta a GiroMorte
    let r = n * dist / Math.PI / 2;
    for (let i = 0; i < n; i++) {
        let phi = Math.PI * 2 * i / n;
        let b = box.createInstance('box-GiroMorte');
        b.isVisible = true;
        b.position.set(r * Math.sin(phi), r + r * -Math.cos(phi), LarghezzaZ / n * i);
        b.parent = pivot;
        b.rotation.z = phi;
        cubetti.push(b);
    }
    let lastPos = toWorld(pivot, new BABYLON.Vector3(
        r * Math.sin(2 * Math.PI), r + r * -Math.cos(2 * Math.PI), LarghezzaZ));
    let np = new BABYLON.TransformNode('nuovo');
    np.position.copyFrom(lastPos);
    np.rotation.copyFrom(pivot.rotation);
    return np;
}

function ElicaSalitaDx(pivot) {
    let AltezzaY = 5, n = 200;
    let r = n * dist / Math.PI / 2;
    for (let i = 0; i < n; i++) {
        let phi = Math.PI * 2 * i / n;
        let b = box.createInstance('box-Elica');
        b.isVisible = true;
        // avvolgimento speculare: componente Z negata
        b.position.set(r * Math.sin(phi), AltezzaY / n * i, -(r + r * -Math.cos(phi)));
        b.parent = pivot;
        b.rotation.y = phi;
        cubetti.push(b);
    }
    let lastPos = toWorld(pivot, new BABYLON.Vector3(
        r * Math.sin(2 * Math.PI), AltezzaY, -(r + r * -Math.cos(2 * Math.PI))));
    let np = new BABYLON.TransformNode('nuovo');
    np.position.copyFrom(lastPos);
    np.rotation.copyFrom(pivot.rotation);
    return np;
}

function ElicaDiscesaDx(pivot) {
    let DislielloY = -5, n = 200;
    let r = n * dist / Math.PI / 2;
    for (let i = 0; i < n; i++) {
        let phi = Math.PI * 2 * i / n;
        let b = box.createInstance('box-Elica');
        b.isVisible = true;
        b.position.set(r * Math.sin(phi), DislielloY / n * i, -(r + r * -Math.cos(phi)));
        b.parent = pivot;
        b.rotation.y = phi;
        cubetti.push(b);
    }
    let lastPos = toWorld(pivot, new BABYLON.Vector3(
        r * Math.sin(2 * Math.PI), DislielloY, -(r + r * -Math.cos(2 * Math.PI))));
    let np = new BABYLON.TransformNode('nuovo');
    np.position.copyFrom(lastPos);
    np.rotation.copyFrom(pivot.rotation);
    return np;
}

function dritto(pivot, n = 30) {
    for (let i = 0; i < n; i++) {
        let b = box.createInstance('box-Dritto');
        b.isVisible = true;
        b.position.set(i * dist, 0, 0);
        b.parent = pivot;
        cubetti.push(b);
    }
    let lastPos = toWorld(pivot, new BABYLON.Vector3(n * dist, 0, 0));
    let np = new BABYLON.TransformNode('nuovo');
    np.position.copyFrom(lastPos);
    np.rotation.copyFrom(pivot.rotation);
    return np;
}

// ─── Ambiente ────────────────────────────────────────────────────────────────

function creaPavimento(w, h) {
    const floor = BABYLON.MeshBuilder.CreateGround('floor', {width: w, height: h}, scene);
    const mat = new BABYLON.StandardMaterial('floor-mat', scene);
    mat.diffuseColor.set(0.20, 0.42, 0.20);
    mat.specularColor.set(0.03, 0.06, 0.03);
    floor.material = mat;
    floor.receiveShadows = true;
    return floor;
}

function creaAlbero(scale) {
    scale = scale || 1;
    const foglie = BABYLON.MeshBuilder.CreateCylinder('cone', {
        diameterTop: 0, height: 2.8 * scale, diameterBottom: 2.6 * scale, tessellation: 7
    }, scene);
    const tronco = BABYLON.MeshBuilder.CreateCylinder('cylinder', {
        diameterBottom: 0.55 * scale, diameterTop: 0.42 * scale,
        height: 1.1 * scale, tessellation: 7
    }, scene);
    foglie.position.y = 0.9 * scale;
    foglie.parent = tronco;
    tronco.position.y = 0.55 * scale;
    foglie.material = mfoglie_mat;
    tronco.material = mtronco_mat;
    const piv = new BABYLON.TransformNode('albero', scene);
    tronco.parent = piv;
    return piv;
}

function creaAlberi() {
    for (let ring = 0; ring < 5; ring++) {
        const n   = 55 + ring * 25;
        const r   = 65 + ring * 32;
        const jitter = 18;
        for (let i = 0; i < n; i++) {
            const phi   = (Math.PI * 2 * i / n) + ring * 0.41;
            const scale = 0.55 + Math.random() * 0.9;
            const p = creaAlbero(scale);
            p.position.set(
                r * Math.sin(phi) + (Math.random() - 0.5) * jitter,
                0,
                r * -Math.cos(phi) + (Math.random() - 0.5) * jitter
            );
            p.rotation.y = Math.random() * Math.PI * 2;
        }
    }
}

function creaMontagne() {
    const mat = new BABYLON.StandardMaterial('monte', scene);
    mat.diffuseColor.set(0.32, 0.40, 0.28);
    mat.specularColor.set(0, 0, 0);
    const matNeve = new BABYLON.StandardMaterial('neve', scene);
    matNeve.diffuseColor.set(0.90, 0.93, 0.96);
    matNeve.specularColor.set(0.1, 0.1, 0.1);

    const n = 12;
    for (let i = 0; i < n; i++) {
        const phi  = (i / n) * Math.PI * 2 + 0.2;
        const rPos = 200 + Math.random() * 60;
        const w    = 55 + Math.random() * 45;
        const hgt  = 22 + Math.random() * 22;

        const base = BABYLON.MeshBuilder.CreateSphere('monte', {
            diameterX: w, diameterY: hgt, diameterZ: w, segments: 5
        }, scene);
        base.position.set(rPos * Math.sin(phi), -hgt * 0.45, rPos * Math.cos(phi));
        base.material = mat;

        // Cappuccio di neve (sfera più piccola in cima)
        const neve = BABYLON.MeshBuilder.CreateSphere('neve', {
            diameterX: w * 0.45, diameterY: hgt * 0.45, diameterZ: w * 0.45, segments: 5
        }, scene);
        neve.position.set(
            rPos * Math.sin(phi),
            -hgt * 0.45 + hgt * 0.46,
            rPos * Math.cos(phi)
        );
        neve.material = matNeve;
    }
}

function salitaDolce(pivot, n = 30) {
    const hTotal = 4;
    for (let i = 0; i < n; i++) {
        const b = box.createInstance('box-Dritto');
        b.isVisible = true;
        b.position.set(i * dist, (i / n) * hTotal, 0);
        b.parent = pivot;
        cubetti.push(b);
    }
    const lastPos = toWorld(pivot, new BABYLON.Vector3(n * dist, hTotal, 0));
    const np = new BABYLON.TransformNode('nuovo');
    np.position.copyFrom(lastPos);
    np.rotation.copyFrom(pivot.rotation);
    return np;
}

function discesaDolce(pivot, n = 30) {
    const hTotal = -4;
    for (let i = 0; i < n; i++) {
        const b = box.createInstance('box-Dritto');
        b.isVisible = true;
        b.position.set(i * dist, (i / n) * hTotal, 0);
        b.parent = pivot;
        cubetti.push(b);
    }
    const lastPos = toWorld(pivot, new BABYLON.Vector3(n * dist, hTotal, 0));
    const np = new BABYLON.TransformNode('nuovo');
    np.position.copyFrom(lastPos);
    np.rotation.copyFrom(pivot.rotation);
    return np;
}

// Pure-math path sampling (no Babylon nodes). Returns world-space sample points.
function simulaPercorsoMath(px, pz, py, angle, tipo) {
    const c = Math.cos(angle), s = Math.sin(angle);
    function tw(lx, ly, lz) {
        return { x: px + lx * c + lz * s, y: py + ly, z: pz - lx * s + lz * c };
    }
    const pts = [];
    const segLen = 30 * dist;
    const r_c = segLen / (Math.PI / 2);
    const r_l = 200 * dist / Math.PI / 2;

    switch (tipo) {
        case 1: case 7: case 8: {
            const dy = tipo === 7 ? 4 : tipo === 8 ? -4 : 0;
            for (let i = 0; i <= 10; i++) {
                const t = i / 10;
                pts.push(tw(t * segLen, t * dy, 0));
            }
            break;
        }
        case 2: {
            for (let i = 0; i <= 10; i++) {
                const phi = i * (Math.PI / 2) / 10;
                pts.push(tw(r_c * Math.sin(phi), 0, -r_c + r_c * Math.cos(phi)));
            }
            break;
        }
        case 3: {
            for (let i = 0; i <= 10; i++) {
                const phi = i * (Math.PI / 2) / 10;
                pts.push(tw(r_c * Math.sin(phi), 0, r_c - r_c * Math.cos(phi)));
            }
            break;
        }
        case 4: {
            // Giro della morte: loop verticale nel piano XY, avanza 2 in Z locale
            for (let i = 0; i <= 30; i++) {
                const t = i / 30;
                const phi = 2 * Math.PI * t;
                pts.push(tw(r_l * Math.sin(phi), r_l * (1 - Math.cos(phi)), 2 * t));
            }
            break;
        }
        case 5: {
            // Spirale discesa: elica nel piano XZ, scende in Y, torna alla stessa XZ
            for (let i = 0; i <= 30; i++) {
                const t = i / 30;
                const phi = 2 * Math.PI * t;
                pts.push(tw(r_l * Math.sin(phi), -5 * t, r_l * (1 - Math.cos(phi))));
            }
            break;
        }
        case 6: {
            // Spirale salita
            for (let i = 0; i <= 30; i++) {
                const t = i / 30;
                const phi = 2 * Math.PI * t;
                pts.push(tw(r_l * Math.sin(phi), 5 * t, r_l * (1 - Math.cos(phi))));
            }
            break;
        }
        case 9: {
            // Giro della morte destro: deriva laterale opposta (-2 in Z locale)
            for (let i = 0; i <= 30; i++) {
                const t = i / 30;
                const phi = 2 * Math.PI * t;
                pts.push(tw(r_l * Math.sin(phi), r_l * (1 - Math.cos(phi)), -2 * t));
            }
            break;
        }
        case 10: {
            // Spirale discesa destra (avvolgimento speculare in Z)
            for (let i = 0; i <= 30; i++) {
                const t = i / 30;
                const phi = 2 * Math.PI * t;
                pts.push(tw(r_l * Math.sin(phi), -5 * t, -r_l * (1 - Math.cos(phi))));
            }
            break;
        }
        case 11: {
            // Spirale salita destra
            for (let i = 0; i <= 30; i++) {
                const t = i / 30;
                const phi = 2 * Math.PI * t;
                pts.push(tw(r_l * Math.sin(phi), 5 * t, -r_l * (1 - Math.cos(phi))));
            }
            break;
        }
    }
    return pts;
}

function cellKey(x, y, z) {
    return `${Math.round(x / CELL)},${Math.round(y / CELL)},${Math.round(z / CELL)}`;
}

function addToTrackHash(samples) {
    for (const p of samples) trackHash.set(cellKey(p.x, p.y, p.z), true);
}

function segmentoCollide(samples, skipFirst = 3, skipLast = 1) {
    const end = samples.length - skipLast;
    for (let i = skipFirst; i < end; i++) {
        const p = samples[i];
        if (p.y < UNDERGROUND_Y) return 'sottoterra';
        if (trackHash.has(cellKey(p.x, p.y, p.z))) return 'sovrapposizione';
    }
    return null;
}

// ─── Logica pista ─────────────────────────────────────────────────────────────

function aggiungiSegmento(tipo, skipCheck = false) {
    const ox = currentPivot.position.x;
    const oz = currentPivot.position.z;
    const oy = currentPivot.position.y;
    const oa = currentPivot.rotation.y;

    if (!skipCheck) {
        const samples = simulaPercorsoMath(ox, oz, oy, oa, tipo);
        const reason = segmentoCollide(samples);
        const hint = document.getElementById('hint-panel');
        if (reason === 'sottoterra') {
            hint.textContent = 'Questo segmento andrebbe sottoterra!';
            hint.style.background = 'rgba(180,30,30,0.9)';
            hint.style.display = 'block';
            return false;
        }
        if (reason === 'sovrapposizione') {
            hint.textContent = 'Il percorso si sovrappone con un tratto esistente!';
            hint.style.background = 'rgba(180,30,30,0.9)';
            hint.style.display = 'block';
            return false;
        }
    }

    const prevLen = cubetti.length;
    switch (tipo) {
        case 1: currentPivot = dritto(currentPivot);         break;
        case 2: currentPivot = destra(currentPivot);         break;
        case 3: currentPivot = sinistra(currentPivot);       break;
        case 4: currentPivot = GiroMorte(currentPivot);      break;
        case 5: currentPivot = ElicaDiscesa(currentPivot);   break;
        case 6: currentPivot = ElicaSalita(currentPivot);    break;
        case 7: currentPivot = salitaDolce(currentPivot);    break;
        case 8: currentPivot = discesaDolce(currentPivot);   break;
        case 9:  currentPivot = GiroMorteDx(currentPivot);   break;
        case 10: currentPivot = ElicaDiscesaDx(currentPivot); break;
        case 11: currentPivot = ElicaSalitaDx(currentPivot);  break;
    }
    for (let i = prevLen; i < cubetti.length; i++) {
        shadowGenerator.addShadowCaster(cubetti[i]);
    }

    addToTrackHash(simulaPercorsoMath(ox, oz, oy, oa, tipo));
    verificaChiusura();
    return true;
}

function resetPista() {
    // Svuota la shadow map
    const sm = shadowGenerator.getShadowMap();
    if (sm && sm.renderList) sm.renderList.length = 0;

    // Distrugge tutti i pezzi della pista
    for (const c of cubetti) c.dispose();
    cubetti.length = 0;

    carPos      = 0;
    carSpeed    = 50;
    targetSpeed = 50;
    currentPivot = p0;
    trackHash.clear();

    const hint = document.getElementById('hint-panel');
    if (hint) hint.style.display = 'none';

    aggiungiSegmento(1);
}

function verificaChiusura() {
    const d = BABYLON.Vector3.Distance(currentPivot.position, p0.position);
    const hint = document.getElementById('hint-panel');
    if (d < 5) {
        hint.textContent = 'Circuito quasi chiuso! — Premi C per collegare!';
        hint.style.background = 'rgba(0,160,60,0.9)';
        hint.style.display = 'block';
    } else {
        hint.textContent = 'Premi C per calcolare il percorso di chiusura automatica';
        hint.style.background = 'rgba(30,32,50,0.9)';
        hint.style.display = cubetti.length > 30 ? 'block' : 'none';
    }
}

// Beam-search A*: trova la sequenza di segmenti che riporta alla partenza.
function trovaCamminoChiusura() {
    const HALF_PI = Math.PI / 2;
    const TWO_PI  = Math.PI * 2;
    const segLen  = 30 * dist;
    const r       = segLen / HALF_PI;

    const sx = currentPivot.position.x, sz = currentPivot.position.z;
    const sy = currentPivot.position.y, sa = currentPivot.rotation.y;
    const gx = p0.position.x, gz = p0.position.z;
    const gy = p0.position.y, ga = p0.rotation.y;

    function normA(a) { a %= TWO_PI; return a < 0 ? a + TWO_PI : a; }
    function aDiff(a, b) { const d = normA(a - b); return d > Math.PI ? TWO_PI - d : d; }

    function applyStep(x, z, y, a, tipo) {
        const c = Math.cos(a), s = Math.sin(a);
        switch (tipo) {
            case 1:  return [x + segLen * c,  z - segLen * s,  y,      a];
            case 2:  return [x + r*(c-s),     z - r*(s+c),     y,      a + HALF_PI];
            case 3:  return [x + r*(c+s),     z + r*(c-s),     y,      a - HALF_PI];
            case 4:  return [x + 2 * s,       z + 2 * c,       y,      a];
            case 5:  return [x,               z,               y - 5,  a];
            case 6:  return [x,               z,               y + 5,  a];
            case 7:  return [x + segLen * c,  z - segLen * s,  y + 4,  a];
            case 8:  return [x + segLen * c,  z - segLen * s,  y - 4,  a];
            case 9:  return [x - 2 * s,       z - 2 * c,       y,      a];
            case 10: return [x,               z,               y - 5,  a];
            case 11: return [x,               z,               y + 5,  a];
        }
    }

    // Costo per pezzo: i pezzi "speciali" (eliche, giri) sono lunghi e vistosi,
    // quindi penalizzati → usati solo quando annullano uno sbilanciamento.
    function costo(tipo) {
        if (tipo === 1 || tipo === 7 || tipo === 8) return segLen;
        if (tipo === 2 || tipo === 3)               return r * HALF_PI;
        return segLen * 4;   // 5,6,9,10,11 : eliche e giro della morte speculare
    }

    // Euristica: distanza euclidea + disallineamento angolare (pesato).
    function h(x, z, y, a) {
        const dx = gx - x, dz = gz - z, dy = gy - y;
        return Math.sqrt(dx*dx + dz*dz + dy*dy) + aDiff(a, ga) * r * 2;
    }
    // Costo-meta: quanto un nodo è vicino a chiudere (pos + angolo). Serve per
    // ricordare il MIGLIOR nodo mai visto, non solo quello finale del beam.
    function goalCost(x, z, y, a) {
        const dx = gx - x, dz = gz - z, dy = gy - y;
        return Math.sqrt(dx*dx + dz*dz + dy*dy) + aDiff(a, ga) * r * 2;
    }

    const elevDiff = Math.abs(gy - sy);
    const actions = [1, 2, 3, 7, 8];
    // Spirali (normali e speculari) come strumenti di cancellazione del dislivello:
    // le due versioni avvolgono in lati opposti, così se una collide l'altra può passare.
    if (elevDiff > 2) actions.push(5, 6, 10, 11);

    const d0 = Math.sqrt((gx-sx)**2 + (gz-sz)**2 + (gy-sy)**2);
    // Profondità proporzionale alla distanza (con margine per l'inversione a U).
    const MAX  = Math.min(90, 18 + Math.ceil(d0 / segLen) * 3);
    const BEAM = 60;
    const W    = 2.5;                 // A* pesato → spinge verso la meta
    const TOL_POS = 2.0, TOL_ANG = 0.22;

    let beam = [{ x: sx, z: sz, y: sy, a: sa, path: [], g: 0 }];
    // Miglior nodo visto finora (anche se il beam poi se ne allontana)
    let best = { gc: goalCost(sx, sz, sy, sa), path: [], pos: d0, ang: aDiff(sa, ga) };

    for (let depth = 0; depth < MAX; depth++) {
        if (best.pos < TOL_POS && best.ang < TOL_ANG) break;

        const next = [];
        for (const cand of beam) {
            for (const tipo of actions) {
                const tail = cand.path.slice(-2);
                if (tail.length === 2 && tail.every(t => t === tipo) && tipo !== 1) continue;

                const samples = simulaPercorsoMath(cand.x, cand.z, cand.y, cand.a, tipo);
                if (segmentoCollide(samples, 3, 3)) continue;

                const [nx, nz, ny, na] = applyStep(cand.x, cand.z, cand.y, cand.a, tipo);
                const ng = cand.g + costo(tipo);
                const node = { x: nx, z: nz, y: ny, a: na,
                    path: [...cand.path, tipo], g: ng, f: ng + W * h(nx, nz, ny, na) };
                next.push(node);

                const gc = goalCost(nx, nz, ny, na);
                if (gc < best.gc) {
                    const dxx = gx-nx, dzz = gz-nz, dyy = gy-ny;
                    best = { gc, path: node.path,
                             pos: Math.sqrt(dxx*dxx+dzz*dzz+dyy*dyy),
                             ang: aDiff(na, ga) };
                }
            }
        }
        if (next.length === 0) break;

        next.sort((a, b) => a.f - b.f);
        const deduped = [];
        for (const cand of next) {
            const dup = deduped.some(d =>
                Math.abs(d.x - cand.x) < 1.2 && Math.abs(d.z - cand.z) < 1.2 &&
                Math.abs(d.y - cand.y) < 1.2 && aDiff(d.a, cand.a) < 0.12);
            if (!dup) deduped.push(cand);
        }
        beam = deduped.slice(0, BEAM);
    }
    return best.path;
}

// ── Percorso di Dubins (curva-retta-curva a curvatura limitata) ──────────────
// Connette QUALSIASI coppia di pose (posizione+direzione) senza cuspidi, usando
// lo stesso raggio delle curve manuali. È lo strumento giusto per raccordare:
// niente ripiegamenti anche quando la meta è dietro o di lato.
function mod2pi(t) { return t - 2 * Math.PI * Math.floor(t / (2 * Math.PI)); }

function dubinsCandidati(alpha, beta, d) {
    const sa = Math.sin(alpha), sb = Math.sin(beta);
    const ca = Math.cos(alpha), cb = Math.cos(beta), cab = Math.cos(alpha - beta);
    const out = [];

    // LSL
    let p2 = 2 + d*d - 2*cab + 2*d*(sa - sb);
    if (p2 >= 0) {
        const tmp = Math.atan2(cb - ca, d + sa - sb);
        out.push({ modes: ['L','S','L'], t: mod2pi(-alpha + tmp), p: Math.sqrt(p2), q: mod2pi(beta - tmp) });
    }
    // RSR
    p2 = 2 + d*d - 2*cab + 2*d*(sb - sa);
    if (p2 >= 0) {
        const tmp = Math.atan2(ca - cb, d - sa + sb);
        out.push({ modes: ['R','S','R'], t: mod2pi(alpha - tmp), p: Math.sqrt(p2), q: mod2pi(-beta + tmp) });
    }
    // LSR
    p2 = -2 + d*d + 2*cab + 2*d*(sa + sb);
    if (p2 >= 0) {
        const p = Math.sqrt(p2);
        const tmp = Math.atan2(-ca - cb, d + sa + sb) - Math.atan2(-2, p);
        out.push({ modes: ['L','S','R'], t: mod2pi(-alpha + tmp), p, q: mod2pi(-beta + tmp) });
    }
    // RSL
    p2 = d*d - 2 + 2*cab - 2*d*(sa + sb);
    if (p2 >= 0) {
        const p = Math.sqrt(p2);
        const tmp = Math.atan2(ca + cb, d - sa - sb) - Math.atan2(2, p);
        out.push({ modes: ['R','S','L'], t: mod2pi(alpha - tmp), p, q: mod2pi(beta - tmp) });
    }
    // RLR
    let tmp = (6 - d*d + 2*cab + 2*d*(sa - sb)) / 8;
    if (Math.abs(tmp) <= 1) {
        const p = mod2pi(2*Math.PI - Math.acos(tmp));
        const t = mod2pi(alpha - Math.atan2(ca - cb, d - sa + sb) + p/2);
        out.push({ modes: ['R','L','R'], t, p, q: mod2pi(alpha - beta - t + p) });
    }
    // LRL
    tmp = (6 - d*d + 2*cab + 2*d*(sb - sa)) / 8;
    if (Math.abs(tmp) <= 1) {
        const p = mod2pi(2*Math.PI - Math.acos(tmp));
        const t = mod2pi(-alpha - Math.atan2(ca - cb, d + sa - sb) + p/2);
        out.push({ modes: ['L','R','L'], t, p, q: mod2pi(beta - alpha - t + p) });
    }
    return out;
}

// Campiona un percorso di Dubins in coordinate piane (u,w), forward=(cos θ, sin θ).
function dubinsCampiona(u0, w0, th0, cand, R, step) {
    const lens = [cand.t, cand.p, cand.q];
    const pts = [{ u: u0, w: w0 }];
    let u = u0, w = w0, th = th0;
    for (let i = 0; i < 3; i++) {
        const m = cand.modes[i];
        const segLenReal = lens[i] * R;          // sia archi (angolo*R) che retta (lung.scalata*R)
        if (segLenReal < 1e-9) continue;
        const dir = m === 'L' ? 1 : m === 'R' ? -1 : 0;
        const n = Math.max(1, Math.round(segLenReal / step));
        const ds = segLenReal / n;
        for (let k = 0; k < n; k++) {
            th += dir * ds / R;
            u += ds * Math.cos(th);
            w += ds * Math.sin(th);
            pts.push({ u, w });
        }
    }
    return pts;
}

function chiudiRaccordo() {
    const sx = currentPivot.position.x, sy = currentPivot.position.y, sz = currentPivot.position.z;
    const sa = currentPivot.rotation.y;
    const gx = p0.position.x,           gy = p0.position.y,           gz = p0.position.z;
    const ga = p0.rotation.y;

    const d3 = Math.sqrt((gx - sx) ** 2 + (gy - sy) ** 2 + (gz - sz) ** 2);
    if (d3 < dist * 2) { currentPivot = p0; return; }

    const R = 30 * dist / (Math.PI / 2);   // stesso raggio delle curve manuali

    // Mappa al piano standard (u,w) con forward = (cos θ, sin θ):  u = x, w = -z
    const u0 = sx, w0 = -sz, u1 = gx, w1 = -gz;
    const D = Math.hypot(u1 - u0, w1 - w0);
    const d = D / R;
    const phi = Math.atan2(w1 - w0, u1 - u0);
    const alpha = mod2pi(sa - phi);
    const beta  = mod2pi(ga - phi);

    // Converte un candidato in blocchi nel mondo {x,y,z,yaw}, con il dislivello
    // distribuito a scaletta lungo l'arco.
    function blocchiMondo(cand) {
        const planPts = dubinsCampiona(u0, w0, sa, cand, R, dist);
        let total = 0;
        const segS = [0];
        for (let i = 1; i < planPts.length; i++) {
            total += Math.hypot(planPts[i].u - planPts[i-1].u, planPts[i].w - planPts[i-1].w);
            segS.push(total);
        }
        const blocks = [];
        for (let i = 0; i < planPts.length; i++) {
            const x = planPts[i].u, z = -planPts[i].w;
            const y = sy + (gy - sy) * (total > 0 ? segS[i] / total : 0);
            const nx = (i < planPts.length - 1) ? planPts[i+1] : planPts[i];
            const px = (i < planPts.length - 1) ? planPts[i] : planPts[i-1];
            const ddx = nx.u - px.u, ddz = -(nx.w - px.w);
            const yaw = (Math.abs(ddx) > 1e-6 || Math.abs(ddz) > 1e-6) ? Math.atan2(-ddz, ddx) : 0;
            blocks.push({ x, y: Math.max(0, y), z, yaw });
        }
        return blocks;
    }

    // Conta le collisioni del raccordo con la pista esistente (salta gli estremi,
    // che combaciano per forza con i tratti adiacenti).
    function collisioni(blocks) {
        let c = 0;
        const skip = 6;
        for (let i = skip; i < blocks.length - skip; i++) {
            if (trackHash.has(cellKey(blocks[i].x, blocks[i].y, blocks[i].z))) c++;
        }
        return c;
    }

    // Sceglie il candidato: prima senza collisioni, poi il più corto.
    const cands = dubinsCandidati(alpha, beta, d);
    let best = null, bestScore = Infinity;
    for (const cand of cands) {
        const len = cand.t + cand.p + cand.q;
        if (!isFinite(len)) continue;
        const blocks = blocchiMondo(cand);
        const coll = collisioni(blocks);
        const score = coll * 1000 + len;     // le collisioni dominano la scelta
        if (score < bestScore) { bestScore = score; best = blocks; }
    }

    const prevLen = cubetti.length;
    if (best) {
        for (const blk of best) {
            const b = box.createInstance('box-Dritto');
            b.isVisible = true;
            b.position.set(blk.x, blk.y, blk.z);
            b.rotation.y = blk.yaw;
            cubetti.push(b);
        }
    } else {
        chiudiConBezierFallback(sx, sy, sz, sa, gx, gy, gz, ga);
    }

    for (let i = prevLen; i < cubetti.length; i++) shadowGenerator.addShadowCaster(cubetti[i]);
    currentPivot = p0;
}

function chiudiConBezierFallback(sx, sy, sz, sa, gx, gy, gz, ga) {
    const d3 = Math.hypot(gx - sx, gy - sy, gz - sz);
    const ten = Math.max(d3 * 0.5, 30 * dist * 0.5);
    const P0 = [sx, sy, sz], P3 = [gx, gy, gz];
    const P1 = [sx + ten * Math.cos(sa), sy, sz - ten * Math.sin(sa)];
    const P2 = [gx - ten * Math.cos(ga), gy, gz + ten * Math.sin(ga)];
    const bez = (u) => { const m = 1 - u; return [
        m**3*P0[0]+3*m**2*u*P1[0]+3*m*u*u*P2[0]+u**3*P3[0],
        m**3*P0[1]+3*m**2*u*P1[1]+3*m*u*u*P2[1]+u**3*P3[1],
        m**3*P0[2]+3*m**2*u*P1[2]+3*m*u*u*P2[2]+u**3*P3[2] ]; };
    const N = Math.max(20, Math.round(d3 * 1.5 / dist));
    for (let i = 0; i < N; i++) {
        const p = bez(i / N), pn = bez((i + 1) / N);
        const b = box.createInstance('box-Dritto');
        b.isVisible = true;
        b.position.set(p[0], Math.max(0, p[1]), p[2]);
        const ddx = pn[0]-p[0], ddz = pn[2]-p[2];
        if (Math.abs(ddx) > 1e-6 || Math.abs(ddz) > 1e-6) b.rotation.y = Math.atan2(-ddz, ddx);
        cubetti.push(b);
    }
}

function tentaChiusura() {
    const hint = document.getElementById('hint-panel');
    hint.textContent = 'Calcolo percorso di chiusura…';
    hint.style.background = 'rgba(30,32,50,0.9)';
    hint.style.display = 'block';

    setTimeout(() => {
        // Fase 1: beam-search avvicina il più possibile con pezzi standard.
        // La collision detection interna alla beam-search evita già spirali/segmenti sovrapposti.
        const path = trovaCamminoChiusura();
        for (const tipo of path) aggiungiSegmento(tipo, true);

        // Fase 2: raccordo di Dubins che chiude il gap rimanente senza cuspidi
        chiudiRaccordo();

        hint.textContent = 'Circuito chiuso!';
        hint.style.background = 'rgba(0,160,60,0.9)';
    }, 20);
}

// ─── Scena principale ─────────────────────────────────────────────────────────

function populateScene() {
    creaPavimento(1000, 1000);
    creaMontagne();

    mfoglie_mat = new BABYLON.StandardMaterial('mfoglie', scene);
    mfoglie_mat.diffuseColor.set(0.22, 0.65, 0.20);
    mfoglie_mat.specularColor.set(0, 0, 0);

    mtronco_mat = new BABYLON.StandardMaterial('mtronco', scene);
    mtronco_mat.diffuseColor.set(0.55, 0.35, 0.12);
    mtronco_mat.specularColor.set(0, 0, 0);

    creaAlberi();

    new BABYLON.Sound('audi', 'sounds/audi.mp3', scene, null, {loop: true, autoplay: true});

    // Luce emisferiaca (cielo/terra) — illuminazione ambientale principale
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.diffuse.set(0.85, 0.88, 0.95);
    hemi.groundColor.set(0.25, 0.35, 0.22);
    hemi.specular.set(0, 0, 0);
    hemi.intensity = 0.85;

    // Luce direzionale (sole) — proietta ombre
    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.5, -1.2, 0.4), scene);
    sun.diffuse.set(1.0, 0.95, 0.80);
    sun.intensity = 1.1;
    sun.position.set(40, 80, -20);

    shadowGenerator = new BABYLON.ShadowGenerator(1024, sun);
    shadowGenerator.setDarkness(0.45);
    shadowGenerator.usePoissonSampling = true;

    box = BABYLON.MeshBuilder.CreateBox('box-template',
        {size: 1, height: 0.5, width: 0.5}, scene);
    box.material = new BABYLON.StandardMaterial('textureMaterial', scene);
    box.material.diffuseTexture = new BABYLON.Texture('./assets/texture_strada_2.jpg', scene);
    box.isVisible = false;

    pivot_rotation = new BABYLON.TransformNode('pivot_rotation', scene);
    pivot_macchina = new BABYLON.TransformNode('pivot_macchina', scene);
    pivot_macchina.rotationQuaternion = new BABYLON.Quaternion();
    BABYLON.SceneLoader.ImportMesh('', './assets/', 's15.glb', scene, meshes => {
        meshes[0].position.z = -0.85;
        meshes[0].parent = pivot_rotation;
        pivot_rotation.parent = pivot_macchina;
    });

    p0 = new BABYLON.TransformNode('start');
    p0.position.set(-5, 0, -5);
    currentPivot = p0;

    aggiungiSegmento(1);

    // ─ Tastiera ─
    window.addEventListener('keydown', evt => {
        if (cameraMode === 'free') return; // in free mode le frecce muovono la camera
        switch (evt.key) {
            case 'a': aggiungiSegmento(1); break;
            case 'q': aggiungiSegmento(2); break;
            case 'd': aggiungiSegmento(3); break;
            case 'f': aggiungiSegmento(4); break;
            case 'g': aggiungiSegmento(5); break;
            case 'h': aggiungiSegmento(6); break;
            case 'z': aggiungiSegmento(7); break;
            case 'x': aggiungiSegmento(8); break;
            case 'e': aggiungiSegmento(9);  break;
            case 't': aggiungiSegmento(10); break;
            case 'y': aggiungiSegmento(11); break;
            case 'c': tentaChiusura();     break;
            case 'r': case 'R': resetPista(); break;
            case 'w': case 'W':
                targetSpeed = Math.min(300, targetSpeed + 30); break;
            case 's': case 'S':
                targetSpeed = Math.max(0,   targetSpeed - 30); break;
        }
    });

    // ─ Render loop ─
    const _p0 = new BABYLON.Vector3(), _r0 = new BABYLON.Quaternion();
    const _p1 = new BABYLON.Vector3(), _r1 = new BABYLON.Quaternion();
    const _qBlock = new BABYLON.Quaternion();
    const _qPitch = new BABYLON.Quaternion();
    const _axis   = new BABYLON.Vector3();
    const _bar = document.getElementById('speed-bar');

    scene.registerBeforeRender(() => {
        if (cubetti.length === 0) return;

        const dt = engine.getDeltaTime() / 1000;

        // Accelerazione graduale
        const rate = targetSpeed > carSpeed ? 40 : 90;
        const diff = targetSpeed - carSpeed;
        carSpeed += Math.sign(diff) * Math.min(rate * dt, Math.abs(diff));

        carPos = (carPos + carSpeed * dt) % cubetti.length;

        const q     = Math.floor(carPos) % cubetti.length;
        const qNext = (q + 1) % cubetti.length;
        const frac  = carPos - Math.floor(carPos);

        cubetti[q].computeWorldMatrix().decompose(null, _r0, _p0);
        cubetti[qNext].computeWorldMatrix().decompose(null, _r1, _p1);

        BABYLON.Vector3.LerpToRef(_p0, _p1, frac, pivot_macchina.position);
        BABYLON.Quaternion.SlerpToRef(_r0, _r1, frac, _qBlock);

        // Sul giro della morte il blocco codifica già rollio/beccheggio (rotation.z):
        // si usa l'orientamento del blocco così com'è.
        // Altrimenti (rettilinei, curve, salite/discese, spirali, raccordo) i blocchi
        // sono piatti: l'auto va INCLINATA secondo la pendenza del moto, così si
        // adagia sulla salita invece di restare parallela al pavimento.
        if (cubetti[q].name === 'box-GiroMorte') {
            pivot_macchina.rotationQuaternion.copyFrom(_qBlock);
        } else {
            const Tx = _p1.x - _p0.x, Ty = _p1.y - _p0.y, Tz = _p1.z - _p0.z;
            const horiz = Math.sqrt(Tx*Tx + Tz*Tz);
            const pitch = Math.atan2(Ty, horiz);
            if (horiz > 1e-6 && Math.abs(pitch) > 1e-4) {
                // asse laterale orizzontale, perpendicolare alla direzione di marcia
                _axis.set(Tz / horiz, 0, -Tx / horiz);
                BABYLON.Quaternion.RotationAxisToRef(_axis, -pitch, _qPitch);
                _qPitch.multiplyToRef(_qBlock, pivot_macchina.rotationQuaternion);
            } else {
                pivot_macchina.rotationQuaternion.copyFrom(_qBlock);
            }
        }

        pivot_rotation.rotation.x = Math.PI;
        pivot_rotation.rotation.z = Math.PI;
        pivot_rotation.rotation.y = cubetti[q].name === 'box-Destra' ? Math.PI/2 : -Math.PI/2;

        const kmh = Math.round(carSpeed * 1.44);
        if (speedValueEl) speedValueEl.textContent = kmh;
        if (_bar) _bar.style.width = (carSpeed / 300 * 100).toFixed(1) + '%';
    });
}