import * as THREE from 'three';
import { ShaderMaterial } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import FontFaceObserver from 'fontfaceobserver';
import imagesLoaded from 'imagesloaded';
import Scroll from './scroll'
import gsap from 'gsap'

import fragment from '../shaders/fragment.glsl'
import vertex from '../shaders/vertex.glsl'

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


		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
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
			this.render()

		})

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
		this.renderer.setSize( this.width, this.height );
		this.camera.aspect = this.width / this.height
		this.camera.updateProjectionMatrix()

	}

	addImages(){

		this.materials = []

		this.imageStore = this.images.map(img => {
			let bounds = img.getBoundingClientRect()
			
			let geometry = new THREE.PlaneGeometry(bounds.width, bounds.height, 100, 100)
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
			obj.mesh.position.y = - obj.top + this.height/2 - obj.height/2 + this.currentScroll
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
	
		this.renderer.render( this.scene, this.camera );
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







