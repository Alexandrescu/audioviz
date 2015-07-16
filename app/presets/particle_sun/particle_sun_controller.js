(function() {
    angular.module('audioViz.directives').controller('audioVizParticleSunController', 
            ['$scope', 'audioAnalyserService', '$http', particleSunPresetController]);
    function particleSunPresetController($scope, audioAnalyserService, $http){
        function getRandomPoint(low_angle, diff) {
            var m = Math.random() * diff  + low_angle;
            return {
                x: Math.sin(m),
                y: Math.cos(m)
            }
        }

        function getColor(angle) {
            var f = angle / (Math.PI * 2) * 6;
            var R = Math.sin(f + 0) * 127 + 128;
            var G = Math.sin(f + 2 * (Math.PI / 3)) * 127 + 128;
            var B = Math.sin(f + 4 * (Math.PI / 3)) * 127 + 128;
            return new THREE.Color (R / 255, G / 255, B / 255);
        }

        var simVertexShader;
        var simFragmentShader;

        console.log('[LOG] audioViz.directives.audioVizSpherePresetController loading shaders');


        var shaders = {
            simVelocityVertexShader: {
                url: 'app/presets/particle_sun/shaders/sim_vertex.c',
                shader: null
            },
            simVelocityFragmentShader: {
                url: 'app/presets/particle_sun/shaders/sim_velocity_frag.c',
                shader: null
            },
            simPositionVertexShader: {
                url: 'app/presets/particle_sun/shaders/sim_vertex.c',
                shader: null
            },
            simPositionFragmentShader: {
                url: 'app/presets/particle_sun/shaders/sim_pos_frag.c',
                shader: null
            },
            simBottomHatVertexShader: {
                url: 'app/presets/particle_sun/shaders/sim_vertex.c',
                shader: null
            },
            simBottomHatFragmentShader: {
                url: 'app/presets/particle_sun/shaders/sim_bottom_hat_frag.c',
                shader: null
            },
        };

        function getShaders() {
            var done = true;
            for (var shaderName in shaders) {
                if (shaders.hasOwnProperty(shaderName)) {
                    if (!shaders[shaderName].shader) {
                        var p = $http.get(shaders[shaderName].url);
                        p.success(function(resp) {
                            console.log('[LOG] Loaded shader: ' + shaderName);
                            shaders[shaderName].shader = resp;
                            getShaders();
                        });
                        done = false;
                        break;
                    }

                }
            }
            if (done) {
                start();
            }
        }

        getShaders();

        function start(){
            console.log('[LOG] Playing with particles now');
            var camera, scene;
            var geometry, material, mesh, mesh2, material2;
            var texSize = 1024;
            var bottomTexSize = 512;
            var dispSize = {x:window.innerWidth, y:window.innerHeight};
            var velocities, positions;
            var circleParticles, bottomParticles;
            var velocitySimShader, positionSimShader;
            var rtTexturePos, rtTexturePos2;
            var renderer = new THREE.WebGLRenderer();
            var timer=0;
            var stats;
            function updateSphere(audioData) {
                var max_level = 0; 
                var levels = [];
                for (var level in audioData) {
                    levels.push(audioData[level]);
                    if (audioData[level] > max_level) {
                        max_level = audioData[level];
                    }
                }
                levels.sort();
                circleParticles.velocitySimShader.uniforms.multiplier.value = levels[levels.length-2] * 1.1;

                var tlevels = [];
                for (var level in audioData) {
                    tlevels.push(audioData[level]);
                }
                bottomParticles.velocitySimShader.uniforms.multiplier.value = audioData.bassLevel;
                circleParticles.velocitySimShader.uniforms.audioLevels.value = tlevels;
            }
            function init() {
                camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 1, 1000000);
                camera.position.z = 60;

                scene = new THREE.Scene();

                circleParticles = {};
                bottomParticles = {};

                function initCircleParticles() {
                    // Initializes positions to a cube
                    var positions = new Float32Array( texSize * texSize * 3 );
                    var velocities = new Float32Array( texSize * texSize * 3 );
                    for (var i=0; i < positions.length; i+=3) {
                        positions[i] = (Math.random() - .5) * .5 ;
                        positions[i+1] = (Math.random() - .5) * .5 ;
                        positions[i+2] = (Math.random() - .5) * .5 ;
                        velocities[i] = 0.0;
                        velocities[i+1] = 0.0;
                        velocities[i+2] = 0.0;
                    }

                    // Calcultes the change in velocity & outputs it out 
                    circleParticles.velocityTexture = new THREE.DataTexture(velocities, texSize, texSize, THREE.RGBFormat, THREE.FloatType);
                    circleParticles.velocityTexture.minFilter = THREE.NearestFilter;
                    circleParticles.velocityTexture.magFilter = THREE.NearestFilter;
                    circleParticles.velocityTexture.needsUpdate = true;

                    // outputs data no
                    circleParticles.positionTexture = new THREE.DataTexture(positions, texSize, texSize, THREE.RGBFormat, THREE.FloatType);
                    circleParticles.positionTexture.minFilter = THREE.NearestFilter;
                    circleParticles.positionTexture.magFilter = THREE.NearestFilter;
                    circleParticles.positionTexture.needsUpdate = true;

                    // Initialize shaders
                    circleParticles.velocitySimShader = new THREE.ShaderMaterial({
                        uniforms: {
                            audioLevels: { type: "fv1", value: [1, 0.5, 3, 2]},
                            multiplier: { type: "f", value: 0.0},
                            origin: { type: "t", value: circleParticles.positionTexture },
                            timer: { type: "f", value: 0},
                            tPositions: { type: "t", value: circleParticles.positionTexture },
                            tVelocities: { type: "t", value: circleParticles.velocityTexture },
                            randomNum: {type : "f", value: 0.02},
                            rotation: {type : "f", value: 0.00}
                        },
                        vertexShader: shaders.simVelocityVertexShader.shader,
                        fragmentShader: shaders.simVelocityFragmentShader.shader
                    });

                    circleParticles.positionSimShader = new THREE.ShaderMaterial({
                        uniforms: {
                            audioLevels: { type: "t", value: null },
                            multiplier: { type: "f", value: 0.0},
                            origin: { type: "t", value: circleParticles.positionTexture },
                            timer: { type: "f", value: 0},
                            tPositions: { type: "t", value: circleParticles.positionTexture },
                            tVelocities: { type: "t", value: circleParticles.velocityTexture },
                        },
                        vertexShader: shaders.simPositionVertexShader.shader,
                        fragmentShader: shaders.simPositionFragmentShader.shader
                    });

                    circleParticles.rtTexturePos = new THREE.WebGLRenderTarget(texSize, texSize, {
                        wrapS:THREE.RepeatWrapping,
                        wrapT:THREE.RepeatWrapping,
                        minFilter: THREE.NearestFilter,
                        magFilter: THREE.NearestFilter,
                        format: THREE.RGBFormat,
                        type:THREE.FloatType,
                        stencilBuffer: false
                    });
                    circleParticles.rtTexturePos2 = circleParticles.rtTexturePos.clone();

                    circleParticles.fboParticlePositions = new THREE.FBOUtils( texSize, renderer, circleParticles.positionSimShader );
                    circleParticles.fboParticlePositions.renderToTexture(circleParticles.rtTexturePos, circleParticles.rtTexturePos2);
                    circleParticles.fboParticlePositions.in = circleParticles.rtTexturePos;
                    circleParticles.fboParticlePositions.out = circleParticles.rtTexturePos2;


                    circleParticles.rtTextureVel = new THREE.WebGLRenderTarget(texSize, texSize, {
                        wrapS:THREE.RepeatWrapping,
                        wrapT:THREE.RepeatWrapping,
                        minFilter: THREE.NearestFilter,
                        magFilter: THREE.NearestFilter,
                        format: THREE.RGBFormat,
                        type:THREE.FloatType,
                        stencilBuffer: false
                    });
                    circleParticles.rtTextureVel2 = circleParticles.rtTextureVel.clone();

                    circleParticles.fboParticleVelocities = new THREE.FBOUtils( texSize, renderer, circleParticles.velocitySimShader );
                    circleParticles.fboParticleVelocities.in = circleParticles.rtTextureVel;
                    circleParticles.fboParticleVelocities.out = circleParticles.rtTextureVel2;
                }

                function initBottomParticles() {
                    // Initializes positions to a cube
                    var positions = new Float32Array( bottomTexSize * bottomTexSize * 3 );
                    var velocities = new Float32Array( bottomTexSize * bottomTexSize * 3 );
                    for (var i=0; i < positions.length; i+=3) {
                        positions[i] = (Math.random() - .5) * 2.5;
                        positions[i+1] = (Math.random() - .5) * .5 ;
                        positions[i+2] = (Math.random() - .5) * .5 ;
                        velocities[i] = 0.0;
                        velocities[i+1] = 0.0;
                        velocities[i+2] = 0.0;
                    }

                    // Calcultes the change in velocity & outputs it out 
                    bottomParticles.velocityTexture = new THREE.DataTexture(velocities, bottomTexSize, bottomTexSize, THREE.RGBFormat, THREE.FloatType);
                    bottomParticles.velocityTexture.minFilter = THREE.NearestFilter;
                    bottomParticles.velocityTexture.magFilter = THREE.NearestFilter;
                    bottomParticles.velocityTexture.needsUpdate = true;

                    // outputs data no
                    bottomParticles.positionTexture = new THREE.DataTexture(positions, bottomTexSize, bottomTexSize, THREE.RGBFormat, THREE.FloatType);
                    bottomParticles.positionTexture.minFilter = THREE.NearestFilter;
                    bottomParticles.positionTexture.magFilter = THREE.NearestFilter;
                    bottomParticles.positionTexture.needsUpdate = true;

                    // Initialize shaders
                    bottomParticles.velocitySimShader = new THREE.ShaderMaterial({
                        uniforms: {
                            audioLevels: { type: "fv1", value: [1, 0.5, 3, 2]},
                            multiplier: { type: "f", value: 0.0},
                            origin: { type: "t", value: bottomParticles.positionTexture },
                            timer: { type: "f", value: 0},
                            tPositions: { type: "t", value: bottomParticles.positionTexture },
                            tVelocities: { type: "t", value: bottomParticles.velocityTexture },
                            randomNum: {type : "f", value: 0.02},
                            rotation: {type : "f", value: 0.00}
                        },
                        vertexShader: shaders.simVelocityVertexShader.shader,
                        fragmentShader: shaders.simBottomHatFragmentShader.shader
                    });

                    bottomParticles.positionSimShader = new THREE.ShaderMaterial({
                        uniforms: {
                            audioLevels: { type: "t", value: null },
                            multiplier: { type: "f", value: 0.0},
                            origin: { type: "t", value: bottomParticles.positionTexture },
                            timer: { type: "f", value: 0},
                            tPositions: { type: "t", value: bottomParticles.positionTexture },
                            tVelocities: { type: "t", value: bottomParticles.velocityTexture },
                        },
                        vertexShader: shaders.simPositionVertexShader.shader,
                        fragmentShader: shaders.simPositionFragmentShader.shader
                    });

                    bottomParticles.rtTexturePos = new THREE.WebGLRenderTarget(bottomTexSize, bottomTexSize, {
                        wrapS:THREE.RepeatWrapping,
                        wrapT:THREE.RepeatWrapping,
                        minFilter: THREE.NearestFilter,
                        magFilter: THREE.NearestFilter,
                        format: THREE.RGBFormat,
                        type:THREE.FloatType,
                        stencilBuffer: false
                    });
                    bottomParticles.rtTexturePos2 = bottomParticles.rtTexturePos.clone();

                    bottomParticles.fboParticlePositions = new THREE.FBOUtils( bottomTexSize, renderer, bottomParticles.positionSimShader );
                    bottomParticles.fboParticlePositions.renderToTexture(bottomParticles.rtTexturePos, bottomParticles.rtTexturePos2);
                    bottomParticles.fboParticlePositions.in = bottomParticles.rtTexturePos;
                    bottomParticles.fboParticlePositions.out = bottomParticles.rtTexturePos2;


                    bottomParticles.rtTextureVel = new THREE.WebGLRenderTarget(bottomTexSize, bottomTexSize, {
                        wrapS:THREE.RepeatWrapping,
                        wrapT:THREE.RepeatWrapping,
                        minFilter: THREE.NearestFilter,
                        magFilter: THREE.NearestFilter,
                        format: THREE.RGBFormat,
                        type:THREE.FloatType,
                        stencilBuffer: false
                    });
                    bottomParticles.rtTextureVel2 = bottomParticles.rtTextureVel.clone();

                    bottomParticles.fboParticleVelocities = new THREE.FBOUtils( bottomTexSize, renderer, bottomParticles.velocitySimShader );
                    bottomParticles.fboParticleVelocities.in = bottomParticles.rtTextureVel;
                    bottomParticles.fboParticleVelocities.out = bottomParticles.rtTextureVel2;
                }

                initCircleParticles();
                initBottomParticles();

                geometry2 = new THREE.Geometry();

                for ( var i = 0, l = texSize * texSize; i < l; i ++ ) {
                    var vertex = new THREE.Vector3();
                    vertex.x = ( i % texSize ) / texSize ;
                    vertex.y = Math.floor( i / texSize ) / texSize;
                    geometry2.vertices.push( vertex );
                }

                for ( var i = 0, l = bottomTexSize * bottomTexSize; i < l; i ++ ) {
                    var vertex = new THREE.Vector3();
                    vertex.x = 1000 + ( i % bottomTexSize ) / bottomTexSize ;
                    vertex.y = 1000 + Math.floor( i / bottomTexSize ) / bottomTexSize;
                    geometry2.vertices.push( vertex );
                }

                material2 = new THREE.ShaderMaterial( {
                    uniforms: {
                        "map": { type: "t", value: null },
                        "bottomMap": { type: "t", value: null },
                        "width": { type: "f", value: texSize },
                        "height": { type: "f", value: texSize },
                        "pointSize": { type: "f", value: 0.0 },
                        "effector" : { type: "f", value: 0 },
                        "rotation" : {type: "f", value: 0.0}
                    },
                    vertexShader: document.getElementById('fboRenderVert').innerHTML,
                    fragmentShader: document.getElementById('fboRenderFrag').innerHTML,
                    depthTest: true,
                    transparent: true,
                    blending: THREE.AdditiveBlending
                } );

                mesh2 = new THREE.PointCloud( geometry2, material2 );
                scene.add( mesh2 );

                controls = new THREE.OrbitControls( camera, renderer.domElement );
                renderer.setSize(window.innerWidth, window.innerHeight);
                document.body.appendChild(renderer.domElement);

                var audioListener = {
                    notify : function(audioData) {
                        updateSphere(audioData);
                    }
                }
                $scope.audioAnalyser.addListener(audioListener);
                $scope.audioAnalyser.playSong();
            }

            var angle = 0;
            var diff = Math.PI / 2000; 
            function calculateCircleParticles(t) {
                // Calculate the new particle velocities
                circleParticles.velocitySimShader.uniforms.timer.value = t;
                var tmp = circleParticles.fboParticleVelocities.in;
                circleParticles.fboParticleVelocities.in = circleParticles.fboParticleVelocities.out;
                circleParticles.fboParticleVelocities.out = tmp;
                circleParticles.velocitySimShader.uniforms.tVelocities.value = circleParticles.fboParticleVelocities.in;
                circleParticles.velocitySimShader.uniforms.tPositions.value = circleParticles.fboParticlePositions.out;
                circleParticles.velocitySimShader.uniforms.randomNum.value = (Math.random() - 0.5) * 0.005;
                circleParticles.velocitySimShader.uniforms.rotation.value = angle;
                circleParticles.fboParticleVelocities.simulate(circleParticles.fboParticleVelocities.out);
                //console.log('[LOG] Calculating velocities... done');
                //


                //console.log('[LOG] Calculating positions...');
                // Calculate new positions
                circleParticles.positionSimShader.uniforms.timer.value = t;
                var tmp = circleParticles.fboParticlePositions.in;
                circleParticles.fboParticlePositions.in = circleParticles.fboParticlePositions.out;
                circleParticles.fboParticlePositions.out = tmp;
                circleParticles.positionSimShader.uniforms.tPositions.value = circleParticles.fboParticlePositions.in;
                circleParticles.positionSimShader.uniforms.tVelocities.value = circleParticles.fboParticleVelocities.out;
                circleParticles.fboParticlePositions.simulate(circleParticles.fboParticlePositions.out);
                //console.log('[LOG] Calculating positions... done');

                angle += diff;
            }

            function calculateBottomParticles(t) {
                // Calculate the new particle velocities
                bottomParticles.velocitySimShader.uniforms.timer.value = t;
                var tmp = bottomParticles.fboParticleVelocities.in;
                bottomParticles.fboParticleVelocities.in = bottomParticles.fboParticleVelocities.out;
                bottomParticles.fboParticleVelocities.out = tmp;
                bottomParticles.velocitySimShader.uniforms.tVelocities.value = bottomParticles.fboParticleVelocities.in;
                bottomParticles.velocitySimShader.uniforms.tPositions.value = bottomParticles.fboParticlePositions.out;
                bottomParticles.velocitySimShader.uniforms.randomNum.value = (Math.random() - 0.5) * 0.005;
                bottomParticles.velocitySimShader.uniforms.rotation.value = angle;
                bottomParticles.fboParticleVelocities.simulate(bottomParticles.fboParticleVelocities.out);
                //console.log('[LOG] Calculating velocities... done');

                //console.log('[LOG] Calculating positions...');
                // Calculate new positions
                bottomParticles.positionSimShader.uniforms.timer.value = t;
                var tmp = bottomParticles.fboParticlePositions.in;
                bottomParticles.fboParticlePositions.in = bottomParticles.fboParticlePositions.out;
                bottomParticles.fboParticlePositions.out = tmp;
                bottomParticles.positionSimShader.uniforms.tPositions.value = bottomParticles.fboParticlePositions.in;
                bottomParticles.positionSimShader.uniforms.tVelocities.value = bottomParticles.fboParticleVelocities.out;
                bottomParticles.fboParticlePositions.simulate(bottomParticles.fboParticlePositions.out);
                //console.log('[LOG] Calculating positions... done');
            }
            function animate(t) {
                requestAnimationFrame(animate);
                // color it!
                material2.uniforms.rotation.value = angle;

                //console.log('[LOG] Calculating velocities...');
                calculateCircleParticles(t);
                calculateBottomParticles(t);


                material2.uniforms.map.value = circleParticles.fboParticlePositions.out;
                material2.uniforms.bottomMap.value = bottomParticles.fboParticlePositions.out;
                controls.update();
                renderer.render( scene, camera );
            }

            init();
            animate(new Date().getTime());
        }
    }
    console.log('[LOG] Loaded audioViz.directives.audioVizSpherePresetController');
})();

