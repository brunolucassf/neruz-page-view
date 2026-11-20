import {
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three';

export interface BenchState {
  horizon: number;
  base: number;
  centerX: number;
  edgeLeft: number;
  edgeRight: number;
  guide: number;
  dim: number;
  lamp: number;
}

export interface StripState {
  isVisible: boolean;
  x: number;
  y: number;
  scale: number;
  rolled: number;
  radius: number;
  rotateX: number;
  rotateY: number;
  lift: number;
  clipBottom: number;
  opacity: number;
}

export interface GlStage {
  resize(width: number, height: number): void;
  render(bench: BenchState, strip: StripState): void;
  setPrint(print: HTMLCanvasElement, pageLength: number): void;
}

const MAX_DPR = 1.5;
const PAGE_WIDTH = 390;
const FIELD_OF_VIEW = 30;

const benchVertex = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy * 2.0, 0.9999, 1.0);
}
`;

const benchFragment = /* glsl */ `
precision highp float;
uniform vec2 uSize;
uniform float uDpr;
uniform float uHorizon;
uniform float uBase;
uniform float uCenterX;
uniform vec2 uEdges;
uniform float uGuide;
uniform float uDim;
uniform float uLamp;

float lineMask(float coordinate) {
  float width = fwidth(coordinate);
  float distanceToLine = abs(fract(coordinate - 0.5) - 0.5) / max(width, 1e-4);
  return 1.0 - min(distanceToLine, 1.0);
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x / uDpr, uSize.y - gl_FragCoord.y / uDpr);
  vec3 night = vec3(0.031, 0.051, 0.078);
  vec3 ice = vec3(0.957, 0.973, 0.988);
  vec3 cyan = vec3(0.0, 0.898, 1.0);
  vec3 color = night;
  float span = max(uBase - uHorizon, 1.0);
  float above = pixel.y - uHorizon;

  if (above > 0.5) {
    float depth = span / above;
    float worldX = (pixel.x - uCenterX) * depth + uCenterX;
    float worldZ = depth * span;
    float distanceFade = smoothstep(0.0, 160.0, above) * (1.0 - smoothstep(2.2, 6.5, depth));

    float grid = max(lineMask(worldX / 64.0), lineMask(worldZ / 64.0));
    vec2 crossCell = (fract(vec2(worldX, worldZ) / 512.0 + 0.5) - 0.5) * 512.0;
    float crossArms = max(
      lineMask(worldX / 512.0) * step(abs(crossCell.y), 9.0),
      lineMask(worldZ / 512.0) * step(abs(crossCell.x), 9.0)
    );
    float edgeBand = min(pixel.x / uSize.x, 1.0 - pixel.x / uSize.x);
    float cornerMask = 1.0 - smoothstep(0.04, 0.16, edgeBand);
    float diagonal = max(lineMask((worldX + worldZ) / 90.51), lineMask((worldX - worldZ) / 90.51)) * cornerMask;

    color = mix(color, ice, (grid * 0.06 + crossArms * 0.12 + diagonal * 0.04) * distanceFade);

    float halfWidth = max((uEdges.y - uEdges.x) * 0.5, 1.0);
    float lampCenter = (uEdges.x + uEdges.y) * 0.5;
    float lampShape = pow((worldX - lampCenter) / (halfWidth * 1.1), 2.0) + pow((worldZ - span - 60.0) / 150.0, 2.0);
    color += cyan * 0.08 * uLamp * (1.0 - smoothstep(0.15, 1.0, lampShape));

    vec2 shadowCenter = vec2(lampCenter, span + 18.0);
    vec2 shadowHalf = vec2(halfWidth - 12.0, 26.0);
    vec2 shadowDistance = abs(vec2(worldX, worldZ) - shadowCenter) - shadowHalf;
    float shadowField = length(max(shadowDistance, 0.0)) + min(max(shadowDistance.x, shadowDistance.y), 0.0);
    color *= 1.0 - 0.5 * (1.0 - smoothstep(-10.0, 46.0, shadowField));

    float nearBase = 1.0 - smoothstep(1.0, 4.0, depth);
    float guideLeft = 1.0 - min(abs(worldX - uEdges.x) / max(fwidth(worldX), 1e-4), 1.0);
    float guideRight = 1.0 - min(abs(worldX - uEdges.y) / max(fwidth(worldX), 1e-4), 1.0);
    float guide = max(guideLeft, guideRight) * uGuide * (0.25 + 0.55 * nearBase) * smoothstep(0.0, 120.0, above);
    color = mix(color, cyan, guide);
  }

  color = mix(night, color, smoothstep(0.0, 140.0, pixel.y));
  color = mix(color, night * 0.45, uDim);
  gl_FragColor = vec4(color, 1.0);
}
`;

const stripVertex = /* glsl */ `
uniform float uLength;
uniform float uRolled;
uniform float uRadius;
varying vec2 vUv;
varying float vShade;

void main() {
  vUv = uv;
  float along = -position.y * uLength;
  float flatLength = uLength - uRolled;
  vec3 local = vec3(position.x * ${PAGE_WIDTH.toFixed(1)}, -along, 0.0);
  vShade = 1.0;
  if (along > flatLength) {
    float arc = along - flatLength;
    float radius = max(uRadius - arc * 0.006, uRadius * 0.35);
    float angle = arc / radius;
    local.y = -flatLength - radius * sin(angle);
    local.z = radius * (1.0 - cos(angle));
    vShade = 0.7 + 0.3 * cos(angle);
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(local, 1.0);
}
`;

const stripFragment = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform vec2 uSize;
uniform float uDpr;
uniform float uClipBottom;
uniform float uOpacity;
varying vec2 vUv;
varying float vShade;

void main() {
  float pixelY = uSize.y - gl_FragCoord.y / uDpr;
  if (pixelY > uClipBottom) discard;
  vec3 paper = gl_FrontFacing ? texture2D(uMap, vUv).rgb : vec3(0.87, 0.81, 0.73);
  gl_FragColor = vec4(paper * vShade, uOpacity);
}
`;

export function createGlStage(canvas: HTMLCanvasElement): GlStage | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x080d14, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 10, 20000);
  const size = new Vector2(1, 1);

  const benchMaterial = new ShaderMaterial({
    vertexShader: benchVertex,
    fragmentShader: benchFragment,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uSize: { value: size },
      uDpr: { value: dpr },
      uHorizon: { value: 0 },
      uBase: { value: 600 },
      uCenterX: { value: 600 },
      uEdges: { value: new Vector2(0, 0) },
      uGuide: { value: 1 },
      uDim: { value: 0 },
      uLamp: { value: 1 },
    },
  });
  const bench = new Mesh(new PlaneGeometry(1, 1), benchMaterial);
  bench.frustumCulled = false;
  bench.renderOrder = -1;
  scene.add(bench);

  const stripGeometry = new PlaneGeometry(1, 1, 1, 200);
  stripGeometry.translate(0.5, -0.5, 0);
  const stripMaterial = new ShaderMaterial({
    vertexShader: stripVertex,
    fragmentShader: stripFragment,
    side: DoubleSide,
    transparent: true,
    uniforms: {
      uMap: { value: null },
      uLength: { value: 1320 },
      uRolled: { value: 0 },
      uRadius: { value: 22 },
      uSize: { value: size },
      uDpr: { value: dpr },
      uClipBottom: { value: 1e6 },
      uOpacity: { value: 1 },
    },
  });
  const strip = new Mesh(stripGeometry, stripMaterial);
  strip.frustumCulled = false;
  strip.visible = false;
  scene.add(strip);

  let hasPrint = false;

  return {
    resize(width, height) {
      size.set(width, height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.set(0, 0, height / 2 / Math.tan((FIELD_OF_VIEW * Math.PI) / 360));
      camera.updateProjectionMatrix();
    },
    setPrint(print, pageLength) {
      const texture = new CanvasTexture(print);
      texture.minFilter = LinearFilter;
      texture.generateMipmaps = false;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      stripMaterial.uniforms.uMap.value = texture;
      stripMaterial.uniforms.uLength.value = pageLength;
      hasPrint = true;
    },
    render(benchState, stripState) {
      const uniforms = benchMaterial.uniforms;
      uniforms.uHorizon.value = benchState.horizon;
      uniforms.uBase.value = benchState.base;
      uniforms.uCenterX.value = benchState.centerX;
      uniforms.uEdges.value.set(benchState.edgeLeft, benchState.edgeRight);
      uniforms.uGuide.value = benchState.guide;
      uniforms.uDim.value = benchState.dim;
      uniforms.uLamp.value = benchState.lamp;

      strip.visible = hasPrint && stripState.isVisible;
      if (strip.visible) {
        strip.position.set(stripState.x - size.x / 2, size.y / 2 - stripState.y, stripState.lift);
        strip.scale.setScalar(stripState.scale);
        strip.rotation.set(stripState.rotateX, stripState.rotateY, 0);
        const stripUniforms = stripMaterial.uniforms;
        stripUniforms.uRolled.value = stripState.rolled;
        stripUniforms.uRadius.value = stripState.radius;
        stripUniforms.uClipBottom.value = stripState.clipBottom;
        stripUniforms.uOpacity.value = stripState.opacity;
      }
      renderer.render(scene, camera);
    },
  };
}
