varying vec2 vUv;
uniform sampler2D uImage;
uniform float time;
varying float vDist;
uniform float hoverState;

void main()	{




  vec2 newUV = vUv;
  float progress = hoverState;
  progress = smoothstep(.0,1.0,(progress*2.0+newUV.y-1.0));
  vec4 final = mix(
    texture2D(uImage, (newUV-.5)*(1.-progress)+.5), 
    texture2D(uImage, (newUV*0.5-0.25)*progress+.5), 
    progress);



  vec4 imageTexture = texture2D(uImage, vUv);
  gl_FragColor = final;
  gl_FragColor.rgb += 0.02*vec3(vDist);

}