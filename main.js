
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas,true);
// 场景
var scene;
// 相机
var camera;
// 地球
var earth;
// 光柱
var streamer,streamer_max_y = 6,streamer_init_y = 1;
var particleSystem;
// 地球的灯光
var earthLight;
// 地球和光柱的合并网格
var mergeMesh;
var ddosPaths = [],ddosPathsAniOver = {};

const colors = {
    blue: new BABYLON.Color3(0,0.43,0.46),
    white: new BABYLON.Color3(0.98,0.98,0.98),
    gray: new BABYLON.Color3(0.1,0.1,0.1),
    red: new BABYLON.Color3(0.89,0.13,0.07)
}

const init = function () {
    // 场景
    scene = new BABYLON.Scene(engine);
    // 去除场景默认背景色
    scene.clearColor = BABYLON.Color3(1,0,1);

    // 这里使用 arc 相机 
    camera = new BABYLON.ArcRotateCamera("Camera",0,Math.PI / 2.4,20,new BABYLON.Vector3(0,0,0),scene);
    camera.attachControl(canvas,true);

    // 创建地球灯光
    earthLight = new BABYLON.HemisphericLight("light",new BABYLON.Vector3(-1,1,1),scene);
    // 灯光暗一些
    earthLight.intensity = 0.9;
    // 暗蓝色的灯光色
    earthLight.diffuse = colors.blue;

    // 创建地球
    earth = BABYLON.MeshBuilder.CreateSphere("sphere",{ diameter: 8,segments: 512 },scene);

    // 设置纹理
    const mat = new BABYLON.StandardMaterial("mat0",scene);
    // 这个图片服务必须支持跨域
    const imgUrl = "https://82.157.234.215/eart.jpg";
    mat.bumpTexture = new BABYLON.Texture(imgUrl,scene);
    earth.material = mat;

    // 初始化动画
    // initAni();

    // 调试...
    streamerAni();
    streamer.position.y = 6;   // 这是个动画
    ddosAni()
};
init();


// 动画开始入口
function initAni() {
    // 创建光柱
    streamerAni();

    const initX = earth.position.x || 0.1;
    const initY = earth.position.y || 0.1;

    var earth_x = initX,earth_x_init = 0.2,earth_x_max = initX + 6,
        // 放大缩小状态 zoomIn | zoomOut
        z_status = "zoomIn";
    var earth_y = initY,
        // 下沉上升状态 up | down
        y_status = "down";

    var pauseIng,pauseTime = 1000 * 4,scalingStep = 0.005;
    var ddosAniing;
    scene.registerBeforeRender(function () {
        /** 地球自转动画, 不用被暂停 **/
        earth.rotation.y += 0.01;

        if (pauseIng) {
            // 光柱发射动画
            if (z_status === "zoomOut" && !ddosAniing) {
                streamer.position.y += 0.018;
            }
            return
        } else {
            if (!ddosAniing) {
                streamer.position.y = 0;
            }
        };

        /** 地球放大又缩小动画 **/
        // 远近视觉 
        if (earth_x >= earth_x_max) { // 缩小
            z_status = "zoomOut";

            // 暂停一会
            pauseIng = true;

            setTimeout(() => {
                ddosAniing = true;
                pauseIng = false;
                // 发射的光柱爆炸
                if (particleSystem) {
                    particleSystem.gravity.y = 2;
                    particleSystem.minLifeTime = 1;
                    particleSystem.maxLifeTime = 2;
                    particleSystem.minSize = 0.06;
                    particleSystem.maxSize = 0.1;
                }

                // 停止发送光柱时候发送 ddos 攻击
                ddosAni()
                setTimeout(() => {
                    ddosAniing = false;
                    // particleSystem.dispose();
                    // particleSystem = null;

                    particleSystem.gravity.y = -20;
                    particleSystem.minLifeTime = 0.2;
                    particleSystem.maxLifeTime = 1;
                    particleSystem.minSize = 0.01;
                    particleSystem.maxSize = 0.06;
                },1000)
            },pauseTime)
        }
        if (earth_x <= earth_x_init) { // 放大 
            z_status = "zoomIn";

            // 暂停一会
            if (pauseIng === false) {
                pauseIng = true;
                setTimeout(() => {
                    pauseIng = false;
                },pauseTime)
            }
        }
        if (ddosAniing) return;
        earth_x += (z_status === "zoomOut" ? -0.03 : 0.03);

        earth.position.x = earth_x;
        streamer.position.x = earth_x;
        ddosPaths.forEach((ddosPath) => ddosPath.position.x = earth_x)
        earth.scaling.y += (z_status === "zoomOut" ? -(scalingStep) : scalingStep);
        earth.scaling.x += (z_status === "zoomOut" ? -(scalingStep) : scalingStep);
        earth.scaling.z += (z_status === "zoomOut" ? -(scalingStep) : scalingStep);

        // 下沉视觉, 和放大缩小对称
        if (z_status === "zoomOut") { // 上升
            y_status = "up";
        }
        if (z_status === "zoomIn") { // 下沉
            y_status = "down";
        }
        earth_y += (y_status === "down" ? -0.04 : 0.04);
        earth.position.y = earth_y;
    });
}

// 发射一个光到天空的动画
function streamerAni() {
    streamer = BABYLON.MeshBuilder.CreateCylinder("cylinder",{
        height: 0.01, // 高度
        diameter: 0.01, // 直径
        faceColors: new BABYLON.Color3(0.99,0.99,0.99),
        updatable: true, // 可更新
    });
    // streamer.position.y = 6;   // 这是个动画 
    streamer.visibility = 0.6;
    // 不使用地球灯光
    earthLight.excludedMeshes.push(streamer);

    // 白色光柱, 这个光只用于柱子
    cylinderLight = new BABYLON.HemisphericLight("cylinderLight",new BABYLON.Vector3(-1,1,1),scene);
    cylinderLight.diffuse = colors.blue;
    cylinderLight.specular = colors.blue;
    cylinderLight.groundColor = colors.white;
    cylinderLight.includedOnlyMeshes.push(streamer);

    // 顶端是蓝白色的烟火  
    var useGPUVersion = true;

    var createNewSystem = function () {
        if (particleSystem) {
            particleSystem.dispose();
        }

        if (useGPUVersion && BABYLON.GPUParticleSystem.IsSupported) {
            particleSystem = new BABYLON.GPUParticleSystem("particles",{ capacity: 5000 },scene);
            particleSystem.activeParticleCount = 25000;
        } else {
            particleSystem = new BABYLON.ParticleSystem("particles",25000,scene);
        }

        particleSystem.emitRate = 2000;
        particleSystem.updateSpeed = 0.02;
        particleSystem.particleEmitterType = new BABYLON.SphereParticleEmitter(1);
        particleSystem.particleTexture = new BABYLON.Texture("https://82.157.234.215/flare.png",scene);
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 1;
        particleSystem.minSize = 0.01;
        particleSystem.maxSize = 0.06;
        particleSystem.emitter = streamer;

        // 向下掉落
        particleSystem.gravity.y = -20;
        particleSystem.minEmitPower = -5;
        particleSystem.maxEmitPower = -2;
        particleSystem.isLocal = true;
        particleSystem.color1 = colors.blue;
        particleSystem.color2 = colors.white;
        particleSystem.colorDead = colors.gray;
        particleSystem.start();

    }

    createNewSystem();
}

// 全球攻击动画
function ddosAni() {
    ddosPaths = [];
    ddosPathsAniOver = {}
    const pathNumber = 6; // 一共多少条线路
    const pos = 5;
    const firstPot = new BABYLON.Vector3(0,pos,0);
    const secondPot = new BABYLON.Vector3(-(pos),0,0);
    const thirdPot = new BABYLON.Vector3(pos,0,0);
    const pointsLen = 720;
    const arc = BABYLON.Curve3.ArcThru3Points(firstPot,secondPot,thirdPot,pointsLen,false,true);
    const points = arc.getPoints();


    const path3d = new BABYLON.Path3D(points);
    const curve = path3d.getCurve();
    function createLGPath(pathIndex,isReverse) {
        const curLen = random();
        const pathPoints = [...curve].splice(0,curLen)
        const ddosPathOpts = {
            points: pathPoints.map(() => []),
            updatable: true
        };
        let ddosPath = BABYLON.MeshBuilder.CreateLines('ddosPath' + pathIndex,ddosPathOpts,scene);
        ddosPath.color = colors.blue;
        ddosPath.alpha = 0.9;
        ddosPath.rotation.y = isReverse ? pathIndex * (-Math.PI / pathNumber) : pathIndex * (Math.PI / pathNumber);
        ddosPaths.push(ddosPath)
        let curIndex = 0;
        let scaleIndex = 0;
        scene.registerBeforeRender(() => {
            if (curIndex >= curLen - 1) {
                // 将线条缩成一个点
                scaleIndex += 1;
                ddosPathOpts.instance = ddosPath;
                const endPot = new BABYLON.Vector3(
                    ddosPathOpts.points[scaleIndex]?.x,
                    ddosPathOpts.points[scaleIndex]?.y,
                    ddosPathOpts.points[scaleIndex]?.z
                    // ddosPath.rotation.y
                )
                if (scaleIndex <= curLen - 10) {
                    ddosPathOpts.points[scaleIndex] = [];
                    ddosPath = BABYLON.MeshBuilder.CreateLines("ddosPathOpts",ddosPathOpts,scene);
                }

                if (scaleIndex <= curLen - 10) {
                    if (!ddosPathsAniOver[pathIndex]) {


                        const arc2 = BABYLON.Curve3.ArcThru3Points(
                            ddosPathOpts.points[curLen - 1],
                            new BABYLON.Vector3.Zero(),
                            new BABYLON.Vector3.Zero(),120,
                            false,
                            true
                        );
                        const points2 = arc2.getPoints();
                        console.log(points2);
                        let scaleIndex = 0;
                        scene.registerBeforeRender(() => {
                            // ing...
                        })
                        ddosPathOpts.instance = ddosPath;
                        ddosPathOpts.points[curLen - 1] = new BABYLON.Vector3.Zero();
                        ddosPath = BABYLON.MeshBuilder.CreateLines("ddosPathOpts",ddosPathOpts,scene);
                        ddosPath.alpha = 0;
                        // const localNormals = ddosPath.getTotalVertices(); // returns the array of facet normals in the local space
                        // // const getFacetNormal = ddosPath.getFacetNormal(); // returns the array of facet normals in the local space
                        // const getWorldMatrix = ddosPath.getWorldMatrix(); // eturns the array of facet normals in the local space

                        // console.log("localNormals", localNormals);
                        // // console.log("getFacetNormal", getFacetNormal);
                        // console.log("getWorldMatrix", getWorldMatrix);
                        // // console.log("getFacetNormal", getFacetNormal);
                        // console.log(endPot,ddosPath);
                        // const endPot = pathPoints[curLen - 1];
                        // console.log(pathIndex,endPot)
                        // // 画一个光点  
                        // const dot = BABYLON.MeshBuilder.CreateSphere("sphere",{ diameter: 1,segments: 36 },scene);
                        // // dot.position = ddosPath.position;
                        // const newMesh = BABYLON.Mesh.MergeMeshes([
                        //     dot, ddosPath
                        // ]);


                        // dot.position.y = endPot.y * (Math.PI / pathNumber);
                        // dot.position.x = endPot.x * (Math.PI / pathNumber);
                        // dot.position.z = endPot.z * (Math.PI / pathNumber);


                        // // 顶端是蓝白色的烟火  
                        // let useGPUVersion = true;
                        // let particleSystem;
                        // let createNewSystem = function () {
                        //     if (particleSystem) {
                        //         particleSystem.dispose();
                        //     }
                        //     if (useGPUVersion && BABYLON.GPUParticleSystem.IsSupported) {
                        //         particleSystem = new BABYLON.GPUParticleSystem("particles",{ capacity: 5000 },scene);
                        //         particleSystem.activeParticleCount = 500;
                        //     } else {
                        //         particleSystem = new BABYLON.ParticleSystem("particles",500,scene);
                        //     }

                        //     particleSystem.emitRate = 1000;
                        //     particleSystem.updateSpeed = 0.02;
                        //     particleSystem.particleEmitterType = new BABYLON.SphereParticleEmitter(1);
                        //     particleSystem.particleTexture = new BABYLON.Texture("https://82.157.234.215/flare.png",scene);
                        //     particleSystem.minLifeTime = 0.2;
                        //     particleSystem.maxLifeTime = 1;
                        //     particleSystem.minSize = 0.01;
                        //     particleSystem.maxSize = 0.06;
                        //     particleSystem.emitter = dot;

                        //     // 向下掉落
                        //     // particleSystem.gravity.y = -20;
                        //     particleSystem.minEmitPower = -5;
                        //     particleSystem.maxEmitPower = -2;
                        //     particleSystem.isLocal = true;
                        //     particleSystem.color1 = colors.blue;
                        //     particleSystem.color2 = colors.white;
                        //     particleSystem.colorDead = colors.gray;
                        //     particleSystem.start();

                        // }

                        // createNewSystem();

                        setTimeout(() => {
                            // ddosPath.alpha = 0;  

                            // particleSystem.dispose();
                            // 进行攻击地球动画
                        },3000)
                    }
                    ddosPathsAniOver[pathIndex] = true;
                }
                return; // 走完就不走了
            } else {
                curIndex += 1;
            }
            ddosPathOpts.instance = ddosPath;
            ddosPathOpts.points[curIndex] = pathPoints[curIndex];
            ddosPath = BABYLON.MeshBuilder.CreateLines("ddosPathOpts",ddosPathOpts,scene);

        })
    }
    function random() {
        const num = Math.round(Math.random() * 1000);
        if (num > (pointsLen * 0.4)) return random();
        return Math.max(num,100); // 路线太短效果不好
    }
    // 创建多条线段 
    for (let i = 0; i < pathNumber; i++) {
        setTimeout(() => {
            // 正面
            createLGPath(i);
            // 反面
            createLGPath(i + 1,true);
        },Math.random() * 1000)
    }
}

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {
    scene.render();
});
// Watch for browser/canvas resize events
window.addEventListener("resize",function () {
    engine.resize();
});