import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Group, Line, LineBasicMaterial, LineDashedMaterial,
  LineSegments, Mesh, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Points, PointsMaterial, Scene,
  ShaderMaterial, SphereGeometry, Vector2, Vector3, WebGLRenderTarget, WebGLRenderer,
} from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/*
 * Background: Spartan-style celestial line art with a Spider-Verse print finish.
 * An astrolabe, construction lines, and constellations draw themselves on as you scroll
 * (raw sky first, structure later); halftone-shaded moons, smoke, twinkling stars.
 * A final pass adds print misregistration (RGB split, scaled by scroll speed), grain, vignette.
 */

const INK = "#E4E7EA";
const BG = [0x10 / 255, 0x10 / 255, 0x10 / 255]; // matches --bg in styles.css

const NOISE = /* glsl */ `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  float fbm(vec3 p){float a=0.5,s=0.0;for(int i=0;i<3;i++){s+=a*snoise(p);p*=2.02;a*=0.5;}return s;}
`;

// Moon: cratered noise, lit from upper left, rendered as a 45° halftone dot screen (comic print).
const MOON_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vP;
  void main(){ vN=normalize(normalMatrix*normal); vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
const MOON_FRAG = /* glsl */ `
  ${NOISE}
  uniform float uCell; uniform float uSeed; uniform float uTime; uniform float uAlpha;
  varying vec3 vN; varying vec3 vP;
  float dotAt(vec2 frag,float L){
    vec2 q=mat2(0.7071,-0.7071,0.7071,0.7071)*(frag/uCell);
    float r=sqrt(L)*0.66;
    return 1.0-smoothstep(r-0.07,r+0.07,length(fract(q)-0.5));
  }
  float h1(float x){return fract(sin(x)*43758.5453);}
  void main(){
    vec3 p=normalize(vP);
    float n=fbm(p*2.2+uSeed);
    float crater=smoothstep(0.42,0.6,abs(snoise(p*4.5+uSeed*3.0)));
    float albedo=clamp(0.62+0.38*n-0.3*crater,0.0,1.0);
    float diff=max(dot(vN,normalize(vec3(-0.55,0.6,0.6))),0.0);
    float L=albedo*diff;
    // hologram glitch: some rows slide sideways; the pattern re-rolls 4 times a second
    float row=floor(gl_FragCoord.y/(1.2*uCell));
    float k=floor(uTime*4.0);
    float hit=step(0.9,h1(row*12.9898+k*78.233+uSeed));
    vec2 f=gl_FragCoord.xy+vec2(hit*(h1(row*3.1+k)-0.5)*5.0*uCell,0.0);
    // misregistered halftone plates: red and blue dots offset from green
    float sp=0.4*uCell;
    float dr=dotAt(f+vec2(sp,0.0),L), dg=dotAt(f,L), db=dotAt(f-vec2(sp,0.0),L);
    float rim=pow(1.0-max(vN.z,0.0),4.0);
    float scan=0.7+0.3*step(0.5,fract(gl_FragCoord.y/(0.6*uCell)));
    vec3 col=vec3(dr,dg,db)*0.85+L*0.15+rim*0.55;
    float a=clamp(max(max(dr,dg),db)*0.85+L*0.2+rim*0.7,0.0,1.0)*uAlpha*scan;
    gl_FragColor=vec4(col,a);
  }
`;

const STAR_VERT = /* glsl */ `
  attribute float aSize; attribute float aPhase;
  uniform float uTime; uniform float uPx;
  varying float vA;
  void main(){
    vec4 mv=modelViewMatrix*vec4(position,1.0);
    gl_PointSize=aSize*uPx*(14.0/-mv.z);
    gl_Position=projectionMatrix*mv;
    vA=0.55+0.45*sin(uTime*(0.4+aPhase)+aPhase*6.2831);
  }
`;
const STAR_FRAG = /* glsl */ `
  uniform float uFlare;
  varying float vA;
  void main(){
    vec2 c=gl_PointCoord-0.5; float d=length(c);
    if(d>0.5) discard;
    float core=pow(1.0-d*2.0,3.0);
    float cross=uFlare*(1.0-smoothstep(0.0,0.035,abs(c.x))+1.0-smoothstep(0.0,0.035,abs(c.y)))*(1.0-d*2.0);
    gl_FragColor=vec4(vec3(1.0),clamp(core+cross,0.0,1.0)*vA);
  }
`;

const SMOKE_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const SMOKE_FRAG = /* glsl */ `
  ${NOISE}
  uniform float uTime; uniform float uOpacity; uniform float uSeed;
  varying vec2 vUv;
  void main(){
    vec2 uv=vUv*vec2(2.6,1.6);
    float n=fbm(vec3(uv+uSeed,uTime*0.025));
    n+=0.5*snoise(vec3(uv*2.3-uSeed,uTime*0.04));
    float edge=smoothstep(0.0,0.3,vUv.x)*smoothstep(1.0,0.7,vUv.x)*smoothstep(0.0,0.35,vUv.y)*smoothstep(1.0,0.65,vUv.y);
    gl_FragColor=vec4(vec3(0.85),smoothstep(0.05,0.9,n)*edge*uOpacity);
  }
`;

const POST_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;
const POST_FRAG = /* glsl */ `
  uniform sampler2D tScene; uniform sampler2D tSmoke; uniform vec2 uRes; uniform float uShift; uniform float uTime; uniform float uGlitch; uniform float uIdle; uniform vec3 uBg;
  varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){
    vec2 uv=vUv;
    float row=floor(uv.y*28.0);
    float band=step(0.82,h(vec2(row,floor(uTime*18.0))));
    float tear=max(uGlitch,uIdle);
    uv.x+=tear*band*(h(vec2(row,uTime))-0.5)*0.12;
    vec2 o=vec2((uShift+uGlitch*14.0+uIdle*5.0)/uRes.x,0.0);
    vec3 c=texture2D(tScene,uv).rgb;
    float r=texture2D(tScene,uv+o).r;
    float b=texture2D(tScene,uv-o).b;
    // print misregistration: ink fringes pull pink and green, like an offset comic plate
    vec3 col=vec3(r,c.g,b)+texture2D(tSmoke,uv).rgb;
    col+=vec3(0.55,0.0,0.35)*max(r-c.r,0.0)+vec3(0.0,0.45,0.25)*max(b-c.b,0.0);
    float grain=(h(vUv*uRes+fract(uTime)*91.0)-0.5)*0.045;
    float vig=smoothstep(1.15,0.3,length((vUv-0.5)*vec2(1.25,1.0)));
    gl_FragColor=vec4((uBg+col+grain)*mix(0.5,1.0,vig),1.0);
  }
`;

/* ---------- geometry helpers ---------- */

function circlePts(r: number, segs = 160, arc = Math.PI * 2, start = 0) {
  const a: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = start + (arc * i) / segs;
    a.push(Math.cos(t) * r, Math.sin(t) * r, 0);
  }
  return a;
}
const geom = (a: number[]) => {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(a), 3));
  return g;
};
const LINE_DIM = 0.7; // everything line-drawn sits back behind the text
const ink = (opacity: number) =>
  new LineBasicMaterial({ color: INK, transparent: true, opacity: opacity * LINE_DIM, blending: AdditiveBlending, depthWrite: false });

// Anything that draws itself on: a geometry, its full vertex count, and a scroll window.
type Drawable = { g: BufferGeometry; count: number; a: number; b: number; step: number };

export function startScene(canvas: HTMLCanvasElement): () => void {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width: 767px)").matches;
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  const px = Math.min(mobile ? 1.25 : 1.5, devicePixelRatio || 1);
  renderer.setPixelRatio(px);
  renderer.setClearColor(0x000000, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 200);
  const rt = new WebGLRenderTarget(1, 1);
  // Smoke is soft, so it renders at quarter resolution (1/16 of the pixels) and is upsampled in the post pass.
  const smokeRT = new WebGLRenderTarget(1, 1);
  const smokeScene = new Scene();
  const drawables: Drawable[] = [];
  const draw = (g: BufferGeometry, a: number, b: number, step = 1) => {
    const count = g.getAttribute("position").count;
    drawables.push({ g, count, a, b, step });
    g.setDrawRange(0, 0);
    return g;
  };
  const disposables: { dispose(): void }[] = [rt, smokeRT];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  const world = new Group();
  scene.add(world);

  /* stars + flares */
  const starCount = mobile ? 450 : 1300;
  const sPos = new Float32Array(starCount * 3), sSize = new Float32Array(starCount), sPhase = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    sPos.set([(Math.random() - 0.5) * 70, (Math.random() - 0.5) * 40, -10 - Math.random() * 40], i * 3);
    sSize[i] = 0.6 + Math.random() ** 3 * 2.4;
    sPhase[i] = Math.random();
  }
  const starGeo = track(new BufferGeometry());
  starGeo.setAttribute("position", new BufferAttribute(sPos, 3));
  starGeo.setAttribute("aSize", new BufferAttribute(sSize, 1));
  starGeo.setAttribute("aPhase", new BufferAttribute(sPhase, 1));
  const starU = { uTime: { value: 0 }, uPx: { value: px * 2 }, uFlare: { value: 0 } };
  const starMat = track(new ShaderMaterial({
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: starU,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  }));
  scene.add(new Points(starGeo, starMat));

  const flareGeo = track(new BufferGeometry());
  const flares = [[11, 6.5, -6], [-3, 7.5, -12], [14, -6, -9], [7.5, 1.5, -2], [-9, -5, -14], [2, -7.5, -6]];
  flareGeo.setAttribute("position", new BufferAttribute(new Float32Array(flares.flat()), 3));
  flareGeo.setAttribute("aSize", new BufferAttribute(new Float32Array(flares.map(() => 7 + Math.random() * 5)), 1));
  flareGeo.setAttribute("aPhase", new BufferAttribute(new Float32Array(flares.map(() => Math.random())), 1));
  const flareU = { uTime: starU.uTime, uPx: starU.uPx, uFlare: { value: 1 } };
  scene.add(new Points(flareGeo, track(new ShaderMaterial({
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: flareU,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  }))));

  /* smoke */
  const smokeU: { uTime: { value: number } }[] = [];
  const smokes: [number, number, number, number, number, number][] = mobile
    ? [[0, -3, -12, 26, 14, 0.16]]
    : [[8, -4.5, -12, 30, 14, 0.2], [-6, 5, -16, 34, 16, 0.12], [12, 6, -10, 22, 10, 0.14]];
  smokes.forEach(([x, y, z, w, h, o], i) => {
    const u = { uTime: { value: 0 }, uOpacity: { value: o }, uSeed: { value: i * 7.3 } };
    smokeU.push(u);
    const m = new Mesh(track(new PlaneGeometry(w, h)), track(new ShaderMaterial({
      vertexShader: SMOKE_VERT, fragmentShader: SMOKE_FRAG, uniforms: u,
      transparent: true, depthWrite: false, blending: AdditiveBlending,
    })));
    m.position.set(x, y, z);
    smokeScene.add(m);
  });

  /* moons (halftone) */
  const moonGeo = track(new SphereGeometry(1, 96, 96));
  const moonTime = { value: 0 };
  const moonMat = (seed: number) => track(new ShaderMaterial({
    vertexShader: MOON_VERT, fragmentShader: MOON_FRAG,
    uniforms: { uCell: { value: 5 * px }, uSeed: { value: seed }, uTime: moonTime, uAlpha: { value: 0.55 } },
    transparent: true, depthWrite: false,
  }));
  const bigMoon = new Mesh(moonGeo, moonMat(1.7));
  bigMoon.scale.setScalar(2.1);
  bigMoon.position.set(7.2, 4.6, -5);
  world.add(bigMoon);

  /* astrolabe: rings, tick dials, spokes, gyroscope ellipse, node circles */
  const astro = new Group();
  astro.position.set(4.6, -0.4, -1);
  astro.rotation.set(0.18, -0.32, 0);
  world.add(astro);
  const rings: Group[] = [];
  const ringDefs: [number, number, number, number][] = [
    // radius, opacity, draw window start, end
    [1.15, 0.5, 0.02, 0.14], [2.3, 0.45, 0.04, 0.18], [2.38, 0.25, 0.05, 0.2], [3.35, 0.5, 0.06, 0.22], [4.7, 0.3, 0.08, 0.26],
  ];
  for (const [r, o, a, b] of ringDefs) {
    const g = new Group();
    g.add(new Line(track(draw(geom(circlePts(r)), a, b)), track(ink(o))));
    astro.add(g);
    rings.push(g);
  }
  // tick dial on r=3.35: 120 ticks, every 10th long
  const ticks: number[] = [];
  for (let i = 0; i < 120; i++) {
    const t = (i / 120) * Math.PI * 2, len = i % 10 === 0 ? 0.36 : i % 5 === 0 ? 0.2 : 0.1;
    ticks.push(Math.cos(t) * 3.35, Math.sin(t) * 3.35, 0, Math.cos(t) * (3.35 + len), Math.sin(t) * (3.35 + len), 0);
  }
  const tickGroup = new Group();
  tickGroup.add(new LineSegments(track(draw(geom(ticks), 0.12, 0.3, 2)), track(ink(0.55))));
  astro.add(tickGroup);
  // inner fine dial on r=1.15
  const fine: number[] = [];
  for (let i = 0; i < 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    fine.push(Math.cos(t) * 1.15, Math.sin(t) * 1.15, 0, Math.cos(t) * 1.05, Math.sin(t) * 1.05, 0);
  }
  rings[0].add(new LineSegments(track(draw(geom(fine), 0.1, 0.24, 2)), track(ink(0.4))));
  // spokes between r=2.38 and r=3.35
  const spokes: number[] = [];
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2 + 0.13;
    spokes.push(Math.cos(t) * 2.38, Math.sin(t) * 2.38, 0, Math.cos(t) * 3.35, Math.sin(t) * 3.35, 0);
  }
  rings[2].add(new LineSegments(track(draw(geom(spokes), 0.16, 0.32, 2)), track(ink(0.3))));
  // gyroscope: a ring turned on its side reads as an ellipse
  const gyro = new Group();
  gyro.rotation.set(1.15, 0.2, 0);
  gyro.add(new Line(track(draw(geom(circlePts(3.9)), 0.1, 0.28)), track(ink(0.32))));
  astro.add(gyro);
  // dotted ring
  const dotted = new Points(track(geom(circlePts(4.2, 220).slice(0, -3))), track(new PointsMaterial({
    color: INK, size: 2 * px, sizeAttenuation: false, transparent: true, opacity: 0.55 * LINE_DIM, depthWrite: false,
  })));
  astro.add(dotted);
  // node circles riding the rings
  const nodes: [number, number, number][] = [[2.3, 0.6, 0.14], [3.35, 2.2, 0.18], [4.7, 4.1, 0.16], [1.15, 3.6, 0.1], [4.7, 1.2, 0.12]];
  for (const [r, t, s] of nodes) {
    const c = new Line(track(draw(geom(circlePts(s, 40)), 0.2, 0.34)), track(ink(0.7)));
    c.position.set(Math.cos(t) * r, Math.sin(t) * r, 0);
    astro.add(c);
  }

  /* construction lines: the spear, plumb, horizon, and their ticks */
  const cons: number[] = [
    4.6, -11, 0, 4.6, 11, 0, // plumb line through the astrolabe
    -4, -0.4, 0, 16, -0.4, 0, // horizon
    -1.5, -7.5, 0, 12.5, 7.2, 0, // the spear
    7.2, -9, -0.5, 7.2, 9, -0.5, // second plumb, through the moon
  ];
  for (let y = -8; y <= 8; y += 1) cons.push(4.45, y, 0, 4.75, y, 0); // plumb ticks
  const consLines = new LineSegments(track(draw(geom(cons), 0.04, 0.24, 2)), track(ink(0.28)));
  world.add(consLines);
  const spearTip = new Line(track(draw(geom(circlePts(0.22, 40)), 0.22, 0.3)), track(ink(0.7)));
  spearTip.position.set(12.5, 7.2, 0);
  world.add(spearTip);

  /* orbiting moons on dashed ellipses */
  const orbitDefs: [number, number, number, number, number][] = [
    // rx, ry, tilt, size, speed
    [5.6, 1.8, 0.35, 0.34, 0.11], [3.0, 1.1, -0.5, 0.2, -0.17],
  ];
  const orbiters: { m: Mesh; rx: number; ry: number; tilt: number; speed: number }[] = [];
  orbitDefs.forEach(([rx, ry, tilt, size, speed], i) => {
    const pts: number[] = [];
    for (let k = 0; k <= 180; k++) {
      const t = (k / 180) * Math.PI * 2;
      pts.push(Math.cos(t) * rx, Math.sin(t) * ry, 0);
    }
    const line = new Line(track(geom(pts)), track(new LineDashedMaterial({
      color: INK, dashSize: 0.12, gapSize: 0.14, transparent: true, opacity: 0.35 * LINE_DIM, depthWrite: false,
    })));
    line.computeLineDistances();
    line.rotation.z = tilt;
    astro.add(line);
    const m = new Mesh(moonGeo, moonMat(4.1 + i * 2.3));
    m.scale.setScalar(size);
    astro.add(m);
    orbiters.push({ m, rx, ry, tilt, speed });
  });

  /* constellations: random walks that connect late (structure from scattered points) */
  const constPts: number[] = [], constLines: number[] = [];
  const centers = mobile ? [[-2, 6], [3, -7]] : [[-6, 6.5], [1.5, 7.5], [13, 1.5], [-8, -6], [10.5, -7]];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const [cx, cy] of centers) {
    let x = cx, y = cy;
    const z = -8 - rnd() * 4;
    for (let k = 0; k < 6; k++) {
      const nx = x + (rnd() - 0.4) * 2.6, ny = y + (rnd() - 0.5) * 2.2;
      constPts.push(x, y, z);
      constLines.push(x, y, z, nx, ny, z);
      x = nx;
      y = ny;
    }
    constPts.push(x, y, z);
  }
  scene.add(new Points(track(geom(constPts)), track(new PointsMaterial({
    color: INK, size: 4 * px, sizeAttenuation: false, transparent: true, opacity: 0.9 * LINE_DIM, depthWrite: false,
  }))));
  scene.add(new LineSegments(track(draw(geom(constLines), 0.22, 0.5, 2)), track(ink(0.35))));

  /* post pass */
  const postScene = new Scene();
  const postCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postU = {
    tScene: { value: rt.texture }, tSmoke: { value: smokeRT.texture }, uRes: { value: new Vector2(1, 1) }, uShift: { value: 1 },
    uTime: { value: 0 }, uGlitch: { value: 0 }, uIdle: { value: 0 }, uBg: { value: new Vector3(...BG) },
  };
  postScene.add(new Mesh(track(new PlaneGeometry(2, 2)), track(new ShaderMaterial({
    vertexShader: POST_VERT, fragmentShader: POST_FRAG, uniforms: postU, depthTest: false, depthWrite: false,
  }))));

  /* layout */
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    rt.setSize(Math.round(w * px), Math.round(h * px));
    smokeRT.setSize(Math.max(1, Math.round((w * px) / 4)), Math.max(1, Math.round((h * px) / 4)));
    postU.uRes.value.set(w * px, h * px);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Text lives on the left on desktop, so the composition sits right; on phones it centers behind the text, dimmer.
    world.position.x = mobile ? -4.6 : 0;
    world.scale.setScalar(mobile ? 0.7 : 1);
  };
  resize();
  addEventListener("resize", resize);

  const state = { p: reduced ? 1 : 0, mx: 0, my: 0, vel: 0, shift: 1 };
  const onMove = (e: PointerEvent) => {
    state.mx = e.clientX / innerWidth - 0.5;
    state.my = e.clientY / innerHeight - 0.5;
  };
  const onGlitch = () => gsap.fromTo(postU.uGlitch, { value: 1 }, { value: 0, duration: 0.7, ease: "power2.out" });

  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const render = (time: number) => {
    // draw-on: each drawable reveals over its own scroll window
    for (const d of drawables) {
      const k = clamp01((state.p - d.a) / (d.b - d.a));
      d.g.setDrawRange(0, Math.floor((d.count * k) / d.step) * d.step);
    }
    starU.uTime.value = time;
    moonTime.value = time;
    smokeU.forEach((u) => (u.uTime.value = time));
    postU.uTime.value = time;
    state.shift += (1 + Math.min(Math.abs(state.vel) / 900, 6) - state.shift) * 0.12;
    postU.uShift.value = state.shift;

    rings.forEach((r, i) => (r.rotation.z = time * (i % 2 ? -0.03 : 0.045) * (1 + i * 0.3) + state.p * (i + 1) * 0.6));
    tickGroup.rotation.z = -time * 0.02 - state.p * 1.2;
    gyro.rotation.z = time * 0.08;
    orbiters.forEach((o) => {
      const t = time * o.speed + o.tilt * 4;
      const x = Math.cos(t) * o.rx, y = Math.sin(t) * o.ry;
      o.m.position.set(x * Math.cos(o.tilt) - y * Math.sin(o.tilt), x * Math.sin(o.tilt) + y * Math.cos(o.tilt), 0);
      o.m.rotation.y = time * 0.2;
    });
    bigMoon.rotation.y = time * 0.02 + state.p * 0.8;
    camera.position.set(state.mx * 0.8, -state.my * 0.5 - state.p * 1.2, 15 - state.p * 2.5);
    camera.lookAt(mobile ? -1 : 2.5, -state.p * 1.2, -2);

    renderer.setRenderTarget(smokeRT);
    renderer.render(smokeScene, camera);
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  };

  const dispose = () => {
    removeEventListener("resize", resize);
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
  };

  if (reduced) {
    render(0); // one static frame, fully drawn
    const redraw = () => render(0);
    addEventListener("resize", redraw);
    return () => {
      removeEventListener("resize", redraw);
      dispose();
    };
  }

  addEventListener("pointermove", onMove);
  addEventListener("pangram:glitch", onGlitch);
  const ctx = gsap.context(() => {
    gsap.to(state, { p: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 1.2 } });
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => (state.vel = s.getVelocity()) });
  });
  const tick = (time: number) => {
    if (document.hidden) return;
    state.vel *= 0.9; // velocity decays when scrolling stops
    render(time);
  };
  gsap.ticker.add(tick);

  // Idle tear: one short slice glitch every 2.5 to 5 s (well under 3 flashes a second).
  let idleCall = gsap.delayedCall(3, function idle() {
    gsap.fromTo(postU.uIdle, { value: 0.4 }, { value: 0, duration: 0.28, ease: "power1.out" });
    idleCall = gsap.delayedCall(gsap.utils.random(2.5, 5), idle);
  });

  return () => {
    idleCall.kill();
    gsap.ticker.remove(tick);
    ctx.revert();
    removeEventListener("pointermove", onMove);
    removeEventListener("pangram:glitch", onGlitch);
    dispose();
  };
}
