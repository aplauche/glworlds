import * as THREE from 'three';
import { ShaderMaterial } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

		this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 0.01, 10 );
		this.camera.position.z = 1;

	


		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setSize( this.width, this.height );
		this.dom.appendChild( this.renderer.domElement );
		this.renderer.setClearColor('#fff')

		this.controls = new OrbitControls( this.camera, this.renderer.domElement );

		this.addObject()
		this.render()
		this.setupResize()
	}

	setupResize(){
		window.addEventListener('resize', this.resize.bind(this))
	}

	resize(){
		this.width = this.dom.offsetWidth
		this.height = this.dom.offsetHeight
		this.renderer.setSize( this.width, this.height );
		this.camera.aspect = this.width / this.height
		this.camera.updateProjectionMatrix()

	}

	addObject(){
		this.geometry = new THREE.SphereGeometry( 0.4, 200, 200 );
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
		this.scene.add( this.mesh );
	}

	render(){
		this.time += 0.1
		this.mesh.rotation.x = this.time / 50;
		this.mesh.rotation.y = this.time / 50;
	
		this.renderer.render( this.scene, this.camera );
		window.requestAnimationFrame(this.render.bind(this))
		this.material.uniforms.time.value = this.time
	}
}

new Sketch({
	dom: document.getElementById('container')
})







