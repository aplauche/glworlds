varying vec2 vUv;
uniform sampler2D uImage;
uniform float time;
varying float vDist;

void main()	{




  vec4 imageTexture = texture2D(uImage, vUv);
  gl_FragColor = imageTexture;
  gl_FragColor.rgb += 0.02*vec3(vDist);

}