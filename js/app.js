import * as THREE from 'three';
import { ShaderMaterial } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import FontFaceObserver from 'fontfaceobserver';
import imagesLoaded from 'imagesloaded';
import Scroll from './scroll'
import gsap from 'gsap'

import fragment from '../shaders/fragment.glsl'
import vertex from '../shaders/vertex.glsl'
import noise from '../shaders/noise.glsl'

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import ocean from '../img/ocean.jpg'

export default class Sketch {
	constructor(options){
		this.time = 0
		
		this.dom = options.dom
		this.scene = new THREE.Scene();

		this.width = this.dom.offsetWidth
		this.height = this.dom.offsetHeight

		this.images = [...document.querySelectorAll('img')]

		// FOV is vertical angle, using trig can set angle
		this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 100, 2000 );
		this.camera.position.z = 600;

	
		// calculate default fov for camera so that height in units = height in pixels of screen
		// get arc tangent and then convert to degrees
		this.camera.fov = Math.atan((this.height/2) / 600 ) * 2 * (180/Math.PI) 


		this.renderer = new THREE.WebGLRenderer( { antialias: false, alpha: true } );
		this.renderer.setSize( this.width, this.height );
		this.dom.appendChild( this.renderer.domElement );
		this.renderer.setClearColor('#fff')
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))

		this.controls = new OrbitControls( this.camera, this.renderer.domElement );

		// use promises to make sure fonts and images load before syncing coord systems
		const fontOpen = new Promise(resolve => {
			new FontFaceObserver("Open Sans").load().then(() => {
				resolve();
			});
		});

		const fontPlayfair = new Promise(resolve => {
			new FontFaceObserver("Playfair Display").load().then(() => {
				resolve();
			});
		});

		// Preload images
		const preloadImages = new Promise((resolve, reject) => {
			imagesLoaded(document.querySelectorAll("img"), { background: true }, resolve);
		});
  
		let allPromises = [fontOpen, fontPlayfair, preloadImages]

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();



		Promise.all(allPromises).then(()=>{
			this.scroll = new Scroll();
			this.addImages()
			this.setImgPositions()
			this.resize()
			this.addListeners()
			this.addObject()
			this.composerPass()
			this.render()

		})

	}
	composerPass(){
		this.composer = new EffectComposer(this.renderer);
		this.renderPass = new RenderPass(this.scene, this.camera);
		this.composer.addPass(this.renderPass);
  
		//custom shader pass
		var counter = 0.0;
		this.myEffect = {
		  uniforms: {
			"tDiffuse": { value: null },
			"scrollSpeed": { value: null },
			"time": { value: null },
		  },
		  vertexShader: `
		  varying vec2 vUv;
		  void main() {
			vUv = uv;
			gl_Position = projectionMatrix 
			  * modelViewMatrix 
			  * vec4( position, 1.0 );
		  }
		  `,
		  fragmentShader: `
		  uniform sampler2D tDiffuse;
		  varying vec2 vUv;
		  uniform float scrollSpeed;
		  uniform float time;
		  ${noise}
		  void main(){
			vec2 fullDistortUV = vUv;
			vec2 halfDistortUV = vUv;
			float area = smoothstep(0.25, 0.,vUv.y);
			float maskArea = smoothstep(1., 0.6,vUv.y) * 2. -1.;

			float noise = 0.5 * (cnoise(vec3(vUv*5., time/5.)) + 1.);
			float crispNoise = smoothstep(0.5, 0.5, noise + maskArea);

			fullDistortUV.x -= (vUv.x - 0.5) * 0.5 * area * scrollSpeed;
			halfDistortUV.x += (vUv.x - 0.5) * 0.3 * area * scrollSpeed;

			vec4 distort = texture2D( tDiffuse, fullDistortUV);
			vec4 halfDistort = texture2D( tDiffuse, halfDistortUV);
			vec4 textureNormal = texture2D( tDiffuse, vUv);

			vec4 imageTexture = vec4(distort.r, halfDistort.g, textureNormal.b, 1);
			gl_FragColor = mix(vec4(1.), imageTexture, crispNoise);

		  }
		  `
		}
  
		this.customPass = new ShaderPass(this.myEffect);
		this.customPass.renderToScreen = true;
  
		this.composer.addPass(this.customPass);
	  }
	  

	addListeners(){
		window.addEventListener('resize', this.resize.bind(this))
		window.addEventListener( 'mousemove', this.onMouseMove.bind(this));
	}

	onMouseMove(event){

		this.mouse.x = ( event.clientX / this.width ) * 2 - 1;
		this.mouse.y = - ( event.clientY / this.height ) * 2 + 1;

		this.raycaster.setFromCamera(this.mouse, this.camera)

		const intersects = this.raycaster.intersectObjects(this.scene.children)

		if(intersects.length > 0){
			let obj = intersects[0].object
			obj.material.uniforms.hover.value = intersects[0].uv
		}
	}

	resize(){
		this.width = this.dom.offsetWidth
		this.height = this.dom.offsetHeight

		this.imageStore.forEach(obj => {
			let bounds = obj.img.getBoundingClientRect()
			
			obj.top = bounds.top + this.scroll.scrollToRender,
			obj.left = bounds.left,
			obj.width = bounds.width,
			obj.height = bounds.height
	
		})
		
		this.renderer.setSize( this.width, this.height );
		this.camera.aspect = this.width / this.height
		this.camera.updateProjectionMatrix()

	}

	addImages(){

		this.materials = []

		this.imageStore = this.images.map(img => {
			let bounds = img.getBoundingClientRect()
			
			let geometry = new THREE.PlaneGeometry(1,1, 100, 100)
			let texture = new THREE.Texture(img)
			texture.needsUpdate = true
			let material = new ShaderMaterial({
				side: THREE.DoubleSide,
				fragmentShader: fragment,
				vertexShader: vertex,
				// wireframe: true,
				uniforms: {
					uImage: {value: texture},
					time: {value:0},
					hover: {value: new THREE.Vector2(0.5, 0.5)},
					hoverState: {value: 0},
					oceanTexture: {value: new THREE.TextureLoader().load(ocean)}
				}
			})


			this.materials.push(material)
			let mesh = new THREE.Mesh(
				geometry,
				material
			)

			mesh.scale.set(bounds.width, bounds.height)

			this.scene.add(mesh)

			img.addEventListener('mouseenter', ()=>{
				gsap.to(material.uniforms.hoverState, {
					value: 1,
					duration: 1
				})
			})
			img.addEventListener('mouseout', ()=>{
				gsap.to(material.uniforms.hoverState, {
					value: 0,
					duration: 1
				})
			})

			return {
				img: img,
				mesh: mesh,
				top: bounds.top,
				left: bounds.left,
				width: bounds.width,
				height: bounds.height
			}
		})

		console.log(this.imageStore);
	}

	setImgPositions(){
		this.imageStore.forEach(obj => {
			// shift the coordinate from left top dom to center center of web gl
			obj.mesh.scale.set(obj.width, obj.height)
			obj.mesh.position.y = - obj.top + this.height/2 - obj.height/2 + this.scroll.scrollToRender
			obj.mesh.position.x = obj.left - (this.width /2) + obj.width/2

			
		})
	}

	addObject(){
		this.geometry = new THREE.PlaneGeometry( 100, 100, 10, 10 );
		this.material = new THREE.MeshNormalMaterial();

		this.material = new ShaderMaterial({
			side: THREE.DoubleSide,
			fragmentShader: fragment,
			vertexShader: vertex,
			// wireframe: true,
			uniforms: {
				time: {value:0},
				oceanTexture: {value: new THREE.TextureLoader().load(ocean)}
			}
		})
	
		this.mesh = new THREE.Mesh( this.geometry, this.material );
		// this.scene.add( this.mesh );
	}

	render(){
		this.time += 0.1
		this.scroll.render()
		this.currentScroll = this.scroll.scrollToRender
		this.setImgPositions()
		// this.mesh.rotation.x = this.time / 50;
		// this.mesh.rotation.y = this.time / 50;
		this.customPass.uniforms.scrollSpeed.value = this.scroll.speedTarget
		this.customPass.uniforms.time.value = this.time
	
		this.composer.render();
		window.requestAnimationFrame(this.render.bind(this))
		// this.material.uniforms.time.value = this.time

		this.materials.forEach(m => {
			m.uniforms.time.value = this.time
		})
	}
}

new Sketch({
	dom: document.getElementById('container')
})







