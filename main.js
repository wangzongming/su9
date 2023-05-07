
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
var earthParticleSystem;
// 地球的灯光
var earthLight;
// 地球和光柱的合并网格
var mergeMesh;
var ddosPaths = [],ddosPathsAniOver = {};

// 地球皮肤
// const earthImgUrl = "https://wangzongming.top/eart2.jpg";
const earthImgUrl = "http://192.168.43.163:8000/eart.jpg";
// 粒子皮肤
// const liziImgUrl = "https://wangzongming.top/flare.png";
const liziImgUrl = "http://192.168.43.163:8000/flare.png";

const colors = {
    blue: new BABYLON.Color3(0,0.43,0.46),
    white: new BABYLON.Color3(0.98,0.98,0.98),
    gray: new BABYLON.Color3(0.1,0.1,0.1),
    red: new BABYLON.Color3(1,0.07,0)
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
    const imgUrl = earthImgUrl;
    mat.bumpTexture = new BABYLON.Texture(imgUrl,scene);
    earth.material = mat;

    // 初始化动画
    initAni();

    // 调试...
    // streamerAni();
    // streamer.position.y = 6;   // 这是个动画
    // ddosAni()
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
                particleSystem.start();
                streamer.position.y += 0.018;
            }
            return
        } else {
            if (!ddosAniing) {
                particleSystem.stop();
                // streamer.position.y = 0; 
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
                setTimeout(() => {
                    ddosAniing = false;
                    particleSystem.gravity.y = -20;
                    particleSystem.minLifeTime = 0.2;
                    particleSystem.maxLifeTime = 1;
                    particleSystem.minSize = 0.01;
                    particleSystem.maxSize = 0.06;
                },2000)
            },pauseTime)
        }
        if (earth_x <= earth_x_init) { // 放大 
            streamer.position.y = 0; 
            z_status = "zoomIn";

            // 暂停一会
            if (pauseIng === false) {
                // console.log('缩小完毕')
                ddosAni();
                pauseIng = true;
                setTimeout(() => {
                    pauseIng = false;
                },15000)
            }
        }
        if (ddosAniing) return;
        earth_x += (z_status === "zoomOut" ? -0.03 : 0.03);

        earth.position.x = earth_x;
        streamer.position.x = earth_x;
        ddosPaths.forEach((ddosPath) => {
            ddosPath.position.x = earth_x;
        })
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
    if (streamer) {
        streamer.position.y = 0; 
        return;
    };
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
    const useGPUVersion = true;

    const createNewSystem = function () {
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
        particleSystem.particleTexture = new BABYLON.Texture(liziImgUrl,scene);
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

    // 创造一个爆炸粒子,  
    const useGPUVersion = true;
    var earthParticleSystem;
    const earthParFn = function () {
        if (earthParticleSystem) {
            // earthParticleSystem.dispose();
            return;
        }
        const center = BABYLON.MeshBuilder.CreateSphere("center",{ diameter: 0.01,segments: 32 },scene);
        if (useGPUVersion && BABYLON.GPUParticleSystem.IsSupported) {
            earthParticleSystem = new BABYLON.GPUParticleSystem("particles2",{ capacity: 25000 },scene);
            earthParticleSystem.activeParticleCount = 25000;
        } else {
            earthParticleSystem = new BABYLON.ParticleSystem("particles2",5000,scene);
        }

        earthParticleSystem.emitRate = 10000;
        earthParticleSystem.updateSpeed = 0.03;
        earthParticleSystem.particleEmitterType = new BABYLON.SphereParticleEmitter(3);
        earthParticleSystem.particleTexture = new BABYLON.Texture(liziImgUrl,scene);
        earthParticleSystem.minLifeTime = 0.2;
        earthParticleSystem.maxLifeTime = 0.5;
        earthParticleSystem.minSize = 0.03;
        earthParticleSystem.maxSize = 0.08;
        earthParticleSystem.emitter = center;
        earthParticleSystem.minEmitPower = 5;
        earthParticleSystem.maxEmitPower = 10;
        earthParticleSystem.color1 = colors.blue;
        earthParticleSystem.color2 = colors.red;
        earthParticleSystem.colorDead = colors.red;
        // earthParticleSystem.start();
    }
    earthParFn();


    const pathNumber = 6; // 一共多少条线路
    const pos = 5;
    const firstPot = new BABYLON.Vector3(0,pos,0);
    const secondPot = new BABYLON.Vector3(-(pos),0,0);
    const thirdPot = new BABYLON.Vector3(pos,0,0);
    const pointsLen = 360;
    const arc = BABYLON.Curve3.ArcThru3Points(firstPot,secondPot,thirdPot,pointsLen,false,true);
    const points = arc.getPoints();

    const path3d = new BABYLON.Path3D(points);
    const curve = path3d.getCurve();
    function createLGPath(pathIndex,isReverse) {
        const curLen = random((pointsLen * 0.4),70,1000);
        const pathPoints = [...curve].splice(0,curLen)
        const ddosPathOpts = {
            points: pathPoints.map(() => []),
            updatable: true
        };
        const lineName = "ddosPath_" + pathIndex + (isReverse ? "_reverse" : "");
        let ddosPath = BABYLON.MeshBuilder.CreateLines(lineName,ddosPathOpts,scene);
        ddosPath.color = colors.blue;
        ddosPath.alpha = 0.9;
        ddosPath.rotation.y = isReverse ? pathIndex * (-Math.PI / pathNumber) : pathIndex * (Math.PI / pathNumber);
        ddosPaths.push(ddosPath)
        // 显示的路线长度  
        const showPathLen = random(50,20,100);
        let curIndex = 0;
        let scaleIndex = showPathLen;
        let notDelPots = curLen - 8,potEndIndex = curLen - 1;
        scene.registerBeforeRender(() => {
            /** 线段不断延伸 **/
            curIndex += 1;
            if (curIndex < potEndIndex) {
                ddosPathOpts.instance = ddosPath;
                ddosPathOpts.points[curIndex] = pathPoints[curIndex];
                if (curIndex > showPathLen) {
                    // 隐藏掉多余的路线点
                    const hidePots = curIndex - showPathLen;
                    for (let i = 0; i < hidePots; i++) {
                        ddosPathOpts.points[i] = [];
                    }
                }
                ddosPath = BABYLON.MeshBuilder.CreateLines(lineName,ddosPathOpts,scene);
            };

            /** 线段延伸完毕后慢慢缩短路径 **/
            if (curIndex >= potEndIndex) {
                // console.log('线段走完',pathIndex)
                scaleIndex += 1;

                // 将线条慢慢缩短
                if (scaleIndex <= notDelPots) {
                    // ddosPathOpts.points[scaleIndex] = []; // 卡了就会导致路线清除不了
                    // 隐藏掉多余的路线点 
                    for (let i = 0; i < scaleIndex; i++) {
                        ddosPathOpts.points[i] = [];
                    }

                    ddosPathOpts.instance = ddosPath;
                    ddosPath = BABYLON.MeshBuilder.CreateLines(lineName,ddosPathOpts,scene);
                }

                if (scaleIndex <= notDelPots) {
                    if (!ddosPathsAniOver[lineName]) { 
                        const arc2 = BABYLON.Curve3.ArcThru3Points(
                            ddosPathOpts.points[curLen - 5],
                            ddosPathOpts.points[curLen - 3],
                            new BABYLON.Vector3.Zero(),
                            1,
                            true,
                            false
                        );
                        const points2 = arc2.getPoints().splice(3,4);
                        const toEarthOpts = {
                            points: points2,
                            updatable: true
                        }
                        setTimeout(() => {
                            const toEarthPath = BABYLON.MeshBuilder.CreateLines("toEarth",toEarthOpts,scene);
                            toEarthPath.rotation.y = ddosPath.rotation.y;
                            toEarthPath.color = colors.blue;
                            toEarthPath.alpha = 0;

                            const frameRate = 10;
                            const alphaAni = new BABYLON.Animation("alphaAni","alpha",frameRate,BABYLON.Animation.ANIMATIONTYPE_FLOAT,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                            const colorAni = new BABYLON.Animation("colorAni","color",frameRate,BABYLON.Animation.ANIMATIONTYPE_FLOAT,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                            const ddosPathAlphaAni = new BABYLON.Animation("ddosPathAlphaAni","alpha",frameRate,BABYLON.Animation.ANIMATIONTYPE_FLOAT,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                            alphaAni.setKeys([
                                { frame: 0,value: 0.6 },
                                { frame: 2 * frameRate,value: 1 },
                                { frame: 3 * frameRate,value: 1 },
                                { frame: 4 * frameRate,value: 1 },
                                { frame: 6 * frameRate,value: 0 },
                            ]);
                            colorAni.setKeys([
                                { frame: 0,value: colors.blue },
                                { frame: 2 * frameRate,value: colors.red }, 
                            ]);
                            ddosPathAlphaAni.setKeys([
                                { frame: 0,value: 1 },
                                { frame: 6 * frameRate,value: 0 },
                            ]);

                            toEarthPath.animations.push(alphaAni,colorAni);
                            ddosPath.animations.push(ddosPathAlphaAni)
                            scene.beginAnimation(toEarthPath,0,6 * frameRate,true);
                            scene.beginAnimation(ddosPath,0,6 * frameRate,true);

                            // 最后一个爆炸动画 
                            setTimeout(() => {
                                earthParticleSystem.start();
                                setTimeout(() => {
                                    earthParticleSystem.stop();
                                },2000)
                            },2000)
                        },1000)
                    }
                    ddosPathsAniOver[lineName] = true;
                }
                return;
            }
        })
    }
    function random(max,min,randomMax) {
        const num = Math.round(Math.random() * randomMax);
        if (num > max) return random(max,min,randomMax);
        return Math.max(num,min); // 路线太短效果不好
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