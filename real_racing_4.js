'use strict';

let canvas, engine, scene, camera, box;
let cubetti = [];
let dist = 0.4;
let p0;
/* Con telecamera muovibile attraverso wasd
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('renderCanvas');

    engine = new BABYLON.Engine(canvas, true);
    scene = new BABYLON.Scene(engine);
    camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(-10, 10, -10), scene);
    camera.attachControl(canvas, true);

    let cameraSpeed = 1;

    window.addEventListener('keydown', evt => {
        switch(evt.key) {
            case 'w': moveCamera('forward'); break;
            case 's': moveCamera('backward'); break;
            case 'a': moveCamera('left'); break;
            case 'd': moveCamera('right'); break;
            case 'q': moveCamera('up'); break;
            case 'e': moveCamera('down'); break;
        }
    });

    canvas.addEventListener('wheel', evt => {
        if (evt.deltaY < 0) {
            camera.position.addInPlace(camera.getDirection(BABYLON.Axis.Z).scale(cameraSpeed));
        } else {
            camera.position.subtractInPlace(camera.getDirection(BABYLON.Axis.Z).scale(cameraSpeed));
        }
    });

    function moveCamera(direction) {
        let forwardVector = camera.getForwardRay().direction;
        let rightVector = camera.getDirection(BABYLON.Axis.X);
        let upVector = camera.upVector;

        forwardVector.normalize();
        rightVector.normalize();
        upVector.normalize();

        switch(direction) {
            case 'forward': camera.position.addInPlace(forwardVector.scale(cameraSpeed)); break;
            case 'backward': camera.position.subtractInPlace(forwardVector.scale(cameraSpeed)); break;
            case 'left': camera.position.subtractInPlace(rightVector.scale(cameraSpeed)); break;
            case 'right': camera.position.addInPlace(rightVector.scale(cameraSpeed)); break;
            case 'up': camera.position.addInPlace(upVector.scale(cameraSpeed)); break;
            case 'down': camera.position.subtractInPlace(upVector.scale(cameraSpeed)); break;
        }
    }

    function render() {
        scene.render();
    }

    populateScene();
    engine.runRenderLoop(render);
    window.addEventListener("resize", () => engine.resize());
});*/

window.addEventListener('DOMContentLoaded', () => {
    // il tag canvas che visualizza l'animazione
    canvas = document.getElementById('renderCanvas');
    // la rotella del mouse serve per fare zoom e non per scrollare la pagina
    canvas.addEventListener('wheel', evt => evt.preventDefault());
    
    // engine & scene
    engine = new BABYLON.Engine(canvas, true);
    scene = new BABYLON.Scene(engine);
    
    // camera
    camera = new BABYLON.ArcRotateCamera('cam', 
            -1.2,0.6,
            15, 
            new BABYLON.Vector3(0,0,0), 
            scene);
    camera.attachControl(canvas,true);
    camera.wheelPrecision = 50;
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 100;   
    camera.upperBetaLimit = 1.46          
    
    // luce
    let light1 = new BABYLON.PointLight('light1',new BABYLON.Vector3(1,1,0), scene);
    light1.parent = camera;
    
    // aggiungo i vari oggetti
    populateScene(scene);
    
    // main loop
    engine.runRenderLoop(()=>scene.render());

    // resize event
    window.addEventListener("resize", () => engine.resize());
});
function toWorld(pivot, localPos){
    return BABYLON.Vector3.TransformCoordinates(
        localPos,
        pivot.computeWorldMatrix());
}
function creaPavimento(w, h){
    let floor = BABYLON.MeshBuilder.CreateGround('floor', {width: w, height: h}, scene);
    floor.material = new BABYLON.StandardMaterial('floor-mat', scene);
    floor.material.diffuseColor.set(0.5,0.8,0.5);
    floor.material.specularColor.set(0,0,0);
    floor.receiveShadows = true;
    return floor
}
function ElicaSalita(pivot) {
    let AltezzaY = 5, n = 200;
    let r = n*dist/Math.PI/2;
    for (let i = 0; i <  n; i++) {
        let phi = Math.PI*2*i/n; 

        let b = box.createInstance("box-Elica");
        b.isVisible = true;
        b.position.set(r * Math.sin(phi),AltezzaY/n*i,r+r * -Math.cos(phi));
        b.parent = pivot;
        b.rotation.y = -phi;
        cubetti.push(b);

    }  
    let lastPos = toWorld(pivot, new BABYLON.Vector3(r * Math.sin(2*Math.PI),AltezzaY,r+r * -Math.cos(2*Math.PI)));
    let nextPivot = new BABYLON.TransformNode('nuovo');
    nextPivot.position.copyFrom(lastPos);
    nextPivot.rotation.copyFrom(pivot.rotation);
    return nextPivot;
}
function ElicaDiscesa(pivot) {
    let DislielloY = -5, n = 200;
    let r = n*dist/Math.PI/2;
    for (let i = 0; i <  n; i++) {
        let phi = Math.PI*2*i/n; 

        let b = box.createInstance("box-Elica");
        b.isVisible = true;
        b.position.set(r * Math.sin(phi),DislielloY/n*i,r+r * -Math.cos(phi));
        b.parent = pivot;
        b.rotation.y = -phi;
        cubetti.push(b);

    }  
    let lastPos = toWorld(pivot, new BABYLON.Vector3(r * -Math.sin(2*Math.PI),DislielloY,r+r * -Math.cos(2*Math.PI)));
    let nextPivot = new BABYLON.TransformNode('nuovo');
    nextPivot.position.copyFrom(lastPos);
    nextPivot.rotation.copyFrom(pivot.rotation);
    //nextPivot.rotation.y -= Math.PI;
    return nextPivot;
}
function destra(pivot, n = 30) {
    let completePhi = Math.PI/2;
    let r = n*dist/completePhi;
    for(let i=0;i<n;i++) {

        let phi = i*completePhi/n;
        let b = box.createInstance('box-Destra');
        b.isVisible = true;
        b.position.set(r*Math.sin(phi),0,-r+r*Math.cos(phi));
        b.rotation.y = phi+Math.PI;
        b.parent = pivot;
        cubetti.push(b);
    }  

    let lastPos = toWorld(pivot, new BABYLON.Vector3(r*Math.sin(completePhi),0,-r+r*Math.cos(completePhi)));
    let nextPivot = new BABYLON.TransformNode('nuovo');
    nextPivot.position.copyFrom(lastPos);
    nextPivot.rotation.copyFrom(pivot.rotation);
    nextPivot.rotation.y += completePhi;
    return nextPivot;
}
function sinistra(pivot, n = 30) {
    let completePhi = Math.PI/2;
    let r = n*dist/completePhi;
    for(let i=0;i<n;i++) {

        let phi = i*completePhi/n;
        let b = box.createInstance('box-Destra');
        b.isVisible = true;
        b.position.set(r*Math.sin(phi),0,r-r*Math.cos(phi));
        b.rotation.y = -phi+Math.PI;
        b.parent = pivot;
        cubetti.push(b);
    }  
    let lastPos = toWorld(pivot, new BABYLON.Vector3(r*Math.sin(completePhi),0,r-r*Math.cos(completePhi)));
    let nextPivot = new BABYLON.TransformNode('nuovo');
    nextPivot.position.copyFrom(lastPos);
    nextPivot.rotation.copyFrom(pivot.rotation);
    nextPivot.rotation.y -= completePhi;
    return nextPivot;
}
function GiroMorte(pivot) {
    let LarghezzaZ = 2, n = 200;
    let r = n*dist/Math.PI/2;
    for (let i = 0; i <  n; i++) {
        let phi = Math.PI*2*i/n; 

        let b = box.createInstance("box-GiroMorte");
        b.isVisible = true;
        b.position.set(r * Math.sin(phi),r+r * -Math.cos(phi),LarghezzaZ/n*i);
        b.parent = pivot;
        b.rotation.z = phi;
        cubetti.push(b);

    }  
    let lastPos = toWorld(pivot, new BABYLON.Vector3(r * Math.sin(2*Math.PI),r+r * -Math.cos(2*Math.PI),LarghezzaZ));
    let nextPivot = new BABYLON.TransformNode('nuovo');
    nextPivot.position.copyFrom(lastPos);
    nextPivot.rotation.copyFrom(pivot.rotation);
    return nextPivot;
}
function dritto(pivot, n = 30) {
    for(let i=0;i<n;i++) {

        let b = box.createInstance("box-Dritto");
        b.isVisible = true;
        b.position.set(i*dist,0,0);
        b.parent = pivot;
        cubetti.push(b);
    }
    let lastPos = toWorld(pivot, new BABYLON.Vector3(n*dist,0,0));
    let nextPivot = new BABYLON.TransformNode('nuovo');
    nextPivot.position.copyFrom(lastPos);
    nextPivot.rotation.copyFrom(pivot.rotation);
    return nextPivot;
}
function creaPercorsoConAlberi() {

    p0 = new BABYLON.TransformNode("a");
    p0.position.set(-5,0,-5)

    for (let n = 75; n <  200; n+= 50) {
        for (let i = 0; i <  n; i++) {
        let p2 = creaAlbero()
        let phi = Math.PI*2*i/n; 
        p2.position.set(n * Math.sin(phi),0,n * -Math.cos(phi));
    }}
    let p = p0;  
    p = dritto(p)  
    p = sinistra(p)
    p = sinistra(p)
    p = GiroMorte(p)
    p = dritto(p)
    p = ElicaSalita(p)
    p = sinistra(p)
    p = sinistra(p)
    p = dritto(p)
    p = GiroMorte(p)
    p = dritto(p)
    p = dritto(p)
    p = dritto(p)
    p = ElicaDiscesa(p)
    p = sinistra(p)
    p = dritto(p)
    p = sinistra(p)
    p = dritto(p)
    p = dritto(p)
    p = dritto(p)
    p = dritto(p)
    p = dritto(p)
    p = sinistra(p)
    p = dritto(p)
    p = sinistra(p)
    p = dritto(p)
    p = dritto(p)
}
function creaAlbero() {

    let mfoglie = new BABYLON.StandardMaterial('mfoglie',scene);
    mfoglie.diffuseColor.set(0.5,1,0.4);
    let mtronco = new BABYLON.StandardMaterial('mtronco',scene);
    mtronco.diffuseColor.set(1.2,0.6,0.1);

    let foglie = new BABYLON.MeshBuilder.CreateCylinder('cone',{
    diameterTop:0,
    height:2.5,
    diameterBottom:2.5},scene);
    let tronco = new BABYLON.MeshBuilder.CreateCylinder('cylinder',{
        diameterBottom:1,
        diameterTop:1},scene);
    foglie.position.y=1;
    foglie.parent= tronco;
    tronco.position.y = 1;
    foglie.material = mfoglie;
    tronco.material = mtronco;
    let pivot_albero = new BABYLON.TransformNode('b',scene);
    tronco.parent = pivot_albero;
    return pivot_albero;
}
function ombre(oggetti,light) {
  
    let shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
    shadowGenerator.setDarkness(0.5);
    shadowGenerator.usePoissonSampling = true;

    oggetti.forEach(oggetto => {
        shadowGenerator.addShadowCaster(oggetto);
    });
}

function populateScene() { 
    creaPavimento(1000, 1000)
    p0 = new BABYLON.TransformNode("a");

    let light = new BABYLON.PointLight('light1', new BABYLON.Vector3(1,20,-10), scene);
    light.position.set(5,50,5)

    box = BABYLON.MeshBuilder.CreateBox('box-GiroMorte', { size: 1 , height : 0.5, width : 0.5}, scene)
    var texture = new BABYLON.Texture("./assets/texture_strada_2.jpg", scene);
    box.material = new BABYLON.StandardMaterial("textureMaterial", scene);
    box.material.diffuseTexture = texture;
    box.isVisible = false;

    let pivot_rotation = new BABYLON.TransformNode('b',scene);
    let pivot_macchina = new BABYLON.TransformNode('a',scene);
    BABYLON.SceneLoader.ImportMesh("", "./assets/", "s15.glb", scene, function (meshes) {
        let macchina = meshes[0];
        macchina.position.z = -0.85;
        pivot_macchina.rotationQuaternion = new BABYLON.Quaternion()
        macchina.parent = pivot_rotation;
        pivot_rotation.parent = pivot_macchina;
    }); 
    creaPercorsoConAlberi()
    ombre(cubetti,light) 


    scene.registerBeforeRender(()=>{
        let t = (performance.now() * 0.001) * 0.1;
        let q = Math.floor((t - Math.floor(t)) * cubetti.length);
        if (cubetti[q].name == 'box-GiroMorte'){
            pivot_rotation.rotation.x = Math.PI ;
            pivot_rotation.rotation.z = Math.PI ;
            pivot_rotation.rotation.y = -Math.PI/2 ;}
        else if (cubetti[q].name == 'box-Dritto'){
            pivot_rotation.rotation.x = Math.PI ;
            pivot_rotation.rotation.z = Math.PI ;
            pivot_rotation.rotation.y = -Math.PI/2 ;}
        else if (cubetti[q].name == 'box-Destra'){
            pivot_rotation.rotation.x = Math.PI ;
            pivot_rotation.rotation.z = Math.PI ;
            pivot_rotation.rotation.y = Math.PI/2 ;}
        else if (cubetti[q].name == 'box-Elica'){
            pivot_rotation.rotation.x = Math.PI ;
            pivot_rotation.rotation.z = Math.PI ;
            pivot_rotation.rotation.y =-Math.PI/2 ;}
        cubetti[q].computeWorldMatrix().decompose(
            null, 
            pivot_macchina.rotationQuaternion,
            pivot_macchina.position);

    })
}