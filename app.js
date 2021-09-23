import * as THREE from 'three';
import { ShaderMaterial } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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
		this.geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
		this.material = new THREE.MeshNormalMaterial();

		this.material = new ShaderMaterial({
			fragmentShader: `
				varying vec2 vUv;
				void main()	{
					// vec2 newUV = (vUv - vec2(0.5))*resolution.zw + vec2(0.5);
					gl_FragColor = vec4(vUv,0.0,1.);
				}
			`,
			vertexShader: `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}
			`,
		})
	
		this.mesh = new THREE.Mesh( this.geometry, this.material );
		this.scene.add( this.mesh );
	}

	render(){
		this.time += 0.1
		this.mesh.rotation.x = this.time / 2000;
		this.mesh.rotation.y = this.time / 1000;
	
		this.renderer.render( this.scene, this.camera );
		window.requestAnimationFrame(this.render.bind(this))
	}
}

new Sketch({
	dom: document.getElementById('container')
})







