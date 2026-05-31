'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader, extend } from '@react-three/fiber';
import { TextureLoader, ShaderMaterial, Vector2 } from 'three';

const noiseGLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0+1.0)*x)); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0+1.0;
  vec4 s1 = floor(b1)*2.0+1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

const vertexShader = `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D u_map;
uniform sampler2D u_hovermap;
uniform float u_alpha;
uniform float u_time;
uniform float u_progressHover;
uniform float u_progressClick;
uniform vec2 u_res;
uniform vec2 u_ratio;
uniform vec2 u_hoverratio;
uniform vec2 u_mouse;
varying vec2 v_uv;
${noiseGLSL}
float circle(vec2 _st, float _radius, float blurriness) {
  vec2 dist = _st;
  return 1.0 - smoothstep(_radius-(_radius*blurriness), _radius+(_radius*blurriness), dot(dist,dist)*4.0);
}
void main() {
  vec2 resolution = u_res;
  float time = u_time * 0.05;
  float progressHover = u_progressHover;
  float progress = u_progressClick;
  vec2 uv = v_uv;
  vec2 uv_h = v_uv;
  vec2 st = gl_FragCoord.xy / resolution.xy - vec2(0.5);
  st.y *= resolution.y / resolution.x;
  vec2 mouse = vec2((u_mouse.x/u_res.x)*2.0-1.0, -(u_mouse.y/u_res.y)*2.0+1.0)*-0.5;
  mouse.y *= resolution.y / resolution.x;
  vec2 cpos = st + mouse;
  float grd = 0.1 * progressHover;
  float sqr = 100.0*((smoothstep(0.0,grd,uv.x)-smoothstep(1.0-grd,1.0,uv.x))*(smoothstep(0.0,grd,uv.y)-smoothstep(1.0-grd,1.0,uv.y)))-10.0;
  float c = circle(cpos, 0.04*progressHover + progress*0.8, 2.0)*50.0;
  float c2 = circle(cpos, 0.01*progressHover + progress*0.5, 2.0);
  float offX = uv.x + sin(uv.y+time*2.0);
  float offY = uv.y - time*0.2 - cos(time*2.0)*0.1;
  float nc = snoise(vec3(offX,offY,time*0.5)*8.0)*progressHover;
  float nh = snoise(vec3(offX,offY,time*0.5)*2.0)*0.1;
  c2 = smoothstep(0.1,0.8,c2*5.0+nc*3.0-1.0);
  uv_h -= vec2(0.5);
  uv_h *= 1.0 - progressHover*0.1;
  uv_h += vec2(0.5);
  uv_h *= u_hoverratio;
  uv -= vec2(0.5);
  uv *= 1.0 - progressHover*0.2;
  uv += mouse*0.1*progressHover;
  uv *= u_ratio;
  uv += vec2(0.5);
  vec4 image = texture2D(u_map, uv);
  vec4 hover = texture2D(u_hovermap, uv_h+vec2(nh)*progressHover*(1.0-progress));
  vec3 tint = vec3(0.0314, 0.0314, 0.2235);
  hover = mix(hover, vec4(tint, 1.0)*hover, 0.8*(1.0-progress));
  float finalMask = smoothstep(0.0,0.1,sqr-c*50.0);
  image = mix(image, hover, clamp(c2+progress, 0.0, 1.0));
  gl_FragColor = vec4(image.rgb, u_alpha*finalMask);
}
`;

interface GooeyTileProps {
  baseImg: string;
  hoverImg: string;
  position: [number, number, number];
  scale: [number, number];
  onHover?: (hovering: boolean) => void;
  onClick?: () => void;
  active?: boolean;
  dimmed?: boolean;
}

export function GooeyTile({ baseImg, hoverImg, position, scale, onHover, onClick, active, dimmed }: GooeyTileProps) {
  const meshRef = useRef<any>(null);
  const hoverProgress = useRef(0);
  const clickProgress = useRef(0);
  const mouseVec = useRef(new Vector2(0, 0));
  const time = useRef(0);
  const targetPos = useRef<[number, number, number]>(position);
  const targetScale = useRef<[number, number]>(scale);
  const targetAlpha = useRef(1);

  const [baseTex, hoverTex] = useLoader(TextureLoader, [baseImg, hoverImg]);

  const uniforms = useMemo(() => ({
    u_map: { value: baseTex },
    u_hovermap: { value: hoverTex },
    u_alpha: { value: 1 },
    u_time: { value: 0 },
    u_progressHover: { value: 0 },
    u_progressClick: { value: 0 },
    u_res: { value: new Vector2(1920, 1080) },
    u_ratio: { value: new Vector2(1, 1) },
    u_hoverratio: { value: new Vector2(1, 1) },
    u_mouse: { value: new Vector2(0, 0) },
  }), [baseTex, hoverTex]);

  useMemo(() => {
    const w = scale[0];
    const h = scale[1];
    const imgA = (baseTex.image as HTMLImageElement).naturalWidth / (baseTex.image as HTMLImageElement).naturalHeight;
    const tileA = w / h;
    uniforms.u_ratio.value.set(tileA / imgA, 1);
    const imgA2 = (hoverTex.image as HTMLImageElement).naturalWidth / (hoverTex.image as HTMLImageElement).naturalHeight;
    uniforms.u_hoverratio.value.set(tileA / imgA2, 1);
  }, [baseTex, hoverTex, scale, uniforms]);

  useEffect(() => {
    if (active) {
      targetPos.current = [0, 0, 3];
      targetScale.current = [scale[0] * 2.5, scale[1] * 2.5];
      clickProgress.current = 1;
    } else {
      targetPos.current = position;
      targetScale.current = scale;
      clickProgress.current = 0;
    }
    targetAlpha.current = dimmed ? 0 : 1;
  }, [active, dimmed]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(position[0], position[1], position[2]);
      meshRef.current.scale.set(scale[0], scale[1], 1);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      uniforms.u_res.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [uniforms]);

  useFrame((state) => {
    time.current += state.clock.getDelta();
    uniforms.u_time.value = time.current;
    const target = hoverProgress.current;
    uniforms.u_progressHover.value += (target - uniforms.u_progressHover.value) * 0.06;
    uniforms.u_progressClick.value += (clickProgress.current - uniforms.u_progressClick.value) * 0.04;
    uniforms.u_mouse.value.lerp(mouseVec.current, 0.06);
    if (meshRef.current) {
      const mp = meshRef.current.position;
      const ms = meshRef.current.scale;
      mp.x += (targetPos.current[0] - mp.x) * 0.06;
      mp.y += (targetPos.current[1] - mp.y) * 0.06;
      mp.z += (targetPos.current[2] - mp.z) * 0.06;
      ms.x += (targetScale.current[0] - ms.x) * 0.06;
      ms.y += (targetScale.current[1] - ms.y) * 0.06;
    }
    uniforms.u_alpha.value += (targetAlpha.current - uniforms.u_alpha.value) * 0.06;
  });

  const mat = useMemo(() => new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
  }), [uniforms]);

  return (
    <mesh
      ref={meshRef}
      material={mat}
      onPointerEnter={() => { hoverProgress.current = 1; onHover?.(true); }}
      onPointerLeave={() => { hoverProgress.current = 0; onHover?.(false); }}
      onPointerMove={(e) => { mouseVec.current.set(e.pointer.x, e.pointer.y); }}
      onPointerDown={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      <planeGeometry args={[1, 1, 32, 32]} />
    </mesh>
  );
}
