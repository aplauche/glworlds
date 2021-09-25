varying vec2 vUv;
varying float vNoise;
uniform sampler2D oceanTexture;
uniform float time;
varying float vDist;
void main()	{
  // vec2 newUV = (vUv - vec2(0.5))*resolution.zw + vec2(0.5);
  vec3 color1 = vec3(1.,0.,0.);
  vec3 color2 = vec3(0.,0.,1.);
  vec3 final = mix(color1, color2, (vNoise + 1.0) * 0.5);

  vec2 newUV = vUv;

  newUV = vec2(newUV.x , newUV.y + 0.05*sin(newUV.x*10. + time/5.));

  vec4 oceanView = texture2D(oceanTexture, newUV);
  // gl_FragColor = vec4(final,1.);
  gl_FragColor = oceanView + vec4(vNoise);
  // gl_FragColor = vec4(vUv, 0., 1.);
  gl_FragColor = vec4( - vNoise + 0.6);
}