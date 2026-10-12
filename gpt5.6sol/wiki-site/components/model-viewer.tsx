'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Box, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { siteAssetUrl } from '@/lib/asset-url.mjs';

type Vec3 = [number, number, number];
type FaceName = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
type ModelFace = { uv?: [number, number, number, number]; texture?: string; rotation?: number; tintindex?: number };
type ModelElement = {
  from: Vec3;
  to: Vec3;
  shade?: boolean;
  light_emission?: number;
  rotation?: { angle?: number; axis?: 'x' | 'y' | 'z'; origin?: Vec3; rescale?: boolean };
  faces?: Partial<Record<FaceName, ModelFace>>;
};
type ModelJson = {
  parent?: string;
  texture_size?: [number, number];
  textures?: Record<string, string>;
  elements?: ModelElement[];
  display?: Record<string, unknown>;
  multipart?: Array<{ apply?: { model?: string; x?: number; y?: number } }>;
  variants?: Record<string, { model?: string } | Array<{ model?: string }>>;
};

type LoadStats = { elements: number; faces: number; textures: number; fallbackTextures: number; inherited: number; mode: '3D 元素' | '2D 精灵' | '组合模型' };

const faceNames: FaceName[] = ['north', 'south', 'east', 'west', 'up', 'down'];
const fallbackColors: Record<string, number> = { leaves: 0x4d7f45, glass: 0xd37aa8, light: 0x8ce6e0, fire: 0xe17b3b, default: 0xb1557d };

function qualify(value: string) { return value.includes(':') ? value : `minecraft:${value}`; }
function modelUrl(key: string) {
  const [namespace, resourcePath] = qualify(key).split(':');
  return siteAssetUrl(`/pack/assets/${namespace}/models/${resourcePath}.json`);
}
function textureUrl(key: string) {
  const [namespace, resourcePath] = qualify(key).split(':');
  return siteAssetUrl(`/pack/assets/${namespace}/textures/${resourcePath}.png`);
}
function mergeModels(parent: ModelJson, child: ModelJson): ModelJson {
  return {
    ...parent,
    ...child,
    textures: { ...(parent.textures ?? {}), ...(child.textures ?? {}) },
    display: { ...(parent.display ?? {}), ...(child.display ?? {}) },
    elements: child.elements ?? parent.elements,
  };
}
function resolveTexture(ref: string | undefined, textures: Record<string, string>, seen: string[] = []): string | null {
  if (!ref) return null;
  if (!ref.startsWith('#')) return qualify(ref);
  const name = ref.slice(1);
  if (seen.includes(name)) return null;
  return resolveTexture(textures[name], textures, [...seen, name]);
}
function fallbackColor(texture: string | null) {
  const key = Object.keys(fallbackColors).find((part) => texture?.includes(part)) ?? 'default';
  return fallbackColors[key];
}

async function fetchJson(url: string): Promise<ModelJson | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json() as Promise<ModelJson>;
}

async function resolveModel(key: string, directUrl?: string, chain: string[] = []): Promise<{ model: ModelJson; inherited: number }> {
  if (chain.includes(key)) throw new Error(`检测到父模型循环：${[...chain, key].join(' → ')}`);
  const model = await fetchJson(directUrl ?? modelUrl(key));
  if (!model) throw new Error(`无法读取模型：${key}`);
  if (!model.parent) return { model, inherited: 0 };
  const parentKey = qualify(model.parent);
  const parent = await fetchJson(modelUrl(parentKey));
  if (!parent) return { model, inherited: 1 };
  const resolvedParent = await resolveModel(parentKey, undefined, [...chain, key]);
  return { model: mergeModels(resolvedParent.model, model), inherited: resolvedParent.inherited + 1 };
}

function defaultUv(face: FaceName, from: Vec3, to: Vec3): [number, number, number, number] {
  if (face === 'up' || face === 'down') return [from[0], from[2], to[0], to[2]];
  if (face === 'east' || face === 'west') return [from[2], 16 - to[1], to[2], 16 - from[1]];
  return [from[0], 16 - to[1], to[0], 16 - from[1]];
}

function faceVertices(face: FaceName, from: Vec3, to: Vec3): Vec3[] {
  const [x1, y1, z1] = from;
  const [x2, y2, z2] = to;
  const map: Record<FaceName, Vec3[]> = {
    north: [[x2,y1,z1],[x1,y1,z1],[x1,y2,z1],[x2,y2,z1]],
    south: [[x1,y1,z2],[x2,y1,z2],[x2,y2,z2],[x1,y2,z2]],
    east: [[x2,y1,z2],[x2,y1,z1],[x2,y2,z1],[x2,y2,z2]],
    west: [[x1,y1,z1],[x1,y1,z2],[x1,y2,z2],[x1,y2,z1]],
    up: [[x1,y2,z2],[x2,y2,z2],[x2,y2,z1],[x1,y2,z1]],
    down: [[x1,y1,z1],[x2,y1,z1],[x2,y1,z2],[x1,y1,z2]],
  };
  return map[face];
}

function transformVertex(vertex: Vec3, rotation?: ModelElement['rotation']): Vec3 {
  if (!rotation?.angle || !rotation.axis) return vertex;
  const origin = rotation.origin ?? [8, 8, 8];
  const point = new THREE.Vector3(vertex[0] - origin[0], vertex[1] - origin[1], vertex[2] - origin[2]);
  const radians = THREE.MathUtils.degToRad(rotation.angle);
  if (rotation.axis === 'x') point.applyAxisAngle(new THREE.Vector3(1,0,0), radians);
  if (rotation.axis === 'y') point.applyAxisAngle(new THREE.Vector3(0,1,0), radians);
  if (rotation.axis === 'z') point.applyAxisAngle(new THREE.Vector3(0,0,1), radians);
  if (rotation.rescale) {
    const scale = 1 / Math.max(Math.cos(Math.abs(radians)), 0.01);
    if (rotation.axis !== 'x') point.x *= scale;
    if (rotation.axis !== 'y') point.y *= scale;
    if (rotation.axis !== 'z') point.z *= scale;
  }
  return [point.x + origin[0], point.y + origin[1], point.z + origin[2]];
}

function createFaceGeometry(faceName: FaceName, face: ModelFace, element: ModelElement, textureSize: [number, number]) {
  const vertices = faceVertices(faceName, element.from, element.to).map((vertex) => transformVertex(vertex, element.rotation));
  const positions = vertices.flatMap((vertex) => [vertex[0] - 8, vertex[1] - 8, vertex[2] - 8]);
  const uv = face.uv ?? defaultUv(faceName, element.from, element.to);
  const [tw, th] = textureSize;
  let corners: Array<[number, number]> = [[uv[0]/tw,1-uv[3]/th],[uv[2]/tw,1-uv[3]/th],[uv[2]/tw,1-uv[1]/th],[uv[0]/tw,1-uv[1]/th]];
  const turns = (((face.rotation ?? 0) / 90) % 4 + 4) % 4;
  for (let index = 0; index < turns; index += 1) corners = [corners[3], corners[0], corners[1], corners[2]];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(corners.flat(), 2));
  geometry.setIndex([0,1,2,0,2,3]);
  geometry.computeVertexNormals();
  return geometry;
}

async function loadTexture(key: string, declaredHeight: number) {
  const loader = new THREE.TextureLoader();
  const candidates = [key];
  if (key.includes('/market_stall_fish')) candidates.push(key.replace('/market_stall_fish', '/market_table_fish'));
  for (const candidate of candidates) {
    const urls = [textureUrl(candidate)];
    const [namespace, resourcePath] = qualify(candidate).split(':');
    if (namespace === 'minecraft') urls.push(siteAssetUrl(`/vanilla/assets/minecraft/textures/${resourcePath}.png`));
    for (const url of urls) {
      try {
        const texture = await loader.loadAsync(url);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        const image = texture.image as HTMLImageElement;
        if (image?.height > declaredHeight) {
          const frameRatio = declaredHeight / image.height;
          texture.repeat.y = frameRatio;
          texture.offset.y = 1 - frameRatio;
        }
        texture.needsUpdate = true;
        return { texture, fallback: false };
      } catch { /* try the packaged vanilla dependency or an intentional alias */ }
    }
  }
  return { texture: null, fallback: true };
}

function compositeFallback(path: string): ModelJson {
  const texture = path.includes('glass') ? 'minecraft:block/pink_stained_glass' : '';
  const faces = Object.fromEntries(faceNames.map((face) => [face, { texture: '#all' }])) as Partial<Record<FaceName, ModelFace>>;
  return { textures: { all: texture }, elements: [{ from: [7,0,7], to: [9,16,9], faces }] };
}

export default function ModelViewer({ modelPath }: { modelPath: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<LoadStats | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let animation = 0;
    const disposables: Array<{ dispose: () => void }> = [];
    setLoading(true); setError(''); setStats(null);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07100c);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.25;
    controlsRef.current = controls;
    scene.add(new THREE.HemisphereLight(0xfff0cf, 0x173427, 2.25));
    const keyLight = new THREE.DirectionalLight(0xffd98a, 2.5); keyLight.position.set(20, 30, 25); scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8ad2ff, 1.15); fillLight.position.set(-18, 8, -20); scene.add(fillLight);
    const root = new THREE.Group(); scene.add(root);

    const resize = () => {
      const width = Math.max(container.clientWidth, 1), height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const render = () => { controls.update(); renderer.render(scene, camera); animation = requestAnimationFrame(render); };
    render();

    (async () => {
      try {
        const parts = modelPath.split('/');
        const namespace = parts[1];
        const resourcePath = parts.slice(3).join('/').replace(/\.json$/, '');
        const key = `${namespace}:${resourcePath}`;
        let resolved = await resolveModel(key, siteAssetUrl(`/pack/${modelPath}`));
        let model = resolved.model;
        let mode: LoadStats['mode'] = '3D 元素';
        if (!model.elements?.length && (model.multipart || model.variants)) {
          model = compositeFallback(modelPath);
          mode = '组合模型';
        }
        const textures = model.textures ?? {};
        const textureSize = model.texture_size ?? [16, 16];
        const materialCache = new Map<string, THREE.Material>();
        let fallbackTextures = 0, faceCount = 0;

        const getMaterial = async (textureKey: string | null, shade = true) => {
          const cacheKey = `${textureKey ?? 'missing'}:${shade}`;
          if (materialCache.has(cacheKey)) return materialCache.get(cacheKey)!;
          const loaded = textureKey ? await loadTexture(textureKey, textureSize[1]) : { texture: null, fallback: true };
          if (loaded.fallback) fallbackTextures += 1;
          const options = { map: loaded.texture, color: loaded.texture ? 0xffffff : fallbackColor(textureKey), transparent: true, alphaTest: 0.02, side: THREE.DoubleSide };
          const material = shade ? new THREE.MeshLambertMaterial(options) : new THREE.MeshBasicMaterial(options);
          materialCache.set(cacheKey, material); disposables.push(material); if (loaded.texture) disposables.push(loaded.texture);
          return material;
        };

        if (model.elements?.length) {
          for (const element of model.elements) {
            for (const faceName of faceNames) {
              const face = element.faces?.[faceName];
              if (!face) continue;
              const textureKey = resolveTexture(face.texture, textures);
              const geometry = createFaceGeometry(faceName, face, element, textureSize);
              const material = await getMaterial(textureKey, element.shade !== false && !element.light_emission);
              const mesh = new THREE.Mesh(geometry, material); root.add(mesh); disposables.push(geometry); faceCount += 1;
            }
          }
        } else {
          mode = '2D 精灵';
          const names = ['layer0', ...Object.keys(textures).filter((name) => name !== 'particle')];
          const textureKey = names.map((name) => resolveTexture(`#${name}`, textures)).find(Boolean) ?? null;
          const material = await getMaterial(textureKey, false);
          const geometry = new THREE.PlaneGeometry(16, 16);
          const front = new THREE.Mesh(geometry, material); root.add(front); disposables.push(geometry); faceCount = 1;
        }

        if (disposed) return;
        const box = new THREE.Box3().setFromObject(root);
        if (box.isEmpty()) throw new Error('模型没有可显示的几何体');
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        root.position.sub(center);
        const radius = Math.max(size.length() * 0.5, 4);
        camera.position.set(radius * 1.35, radius * 0.95, radius * 1.55);
        camera.near = Math.max(radius / 200, 0.05); camera.far = radius * 20; camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0); controls.minDistance = radius * 0.55; controls.maxDistance = radius * 5; controls.update();
        setStats({ elements: model.elements?.length ?? 0, faces: faceCount, textures: materialCache.size, fallbackTextures, inherited: resolved.inherited, mode });
        setLoading(false);
      } catch (reason) {
        if (!disposed) { setError(reason instanceof Error ? reason.message : String(reason)); setLoading(false); }
      }
    })();

    return () => {
      disposed = true; cancelAnimationFrame(animation); observer.disconnect(); controls.dispose(); renderer.dispose();
      for (const item of disposables) item.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
      controlsRef.current = null;
    };
  }, [modelPath]);

  return (
    <div className="overflow-hidden rounded-xl border border-[#d9a84e]/20 bg-[#07100c]">
      <div ref={containerRef} className="relative h-72 w-full">
        {loading && <div className="absolute inset-0 z-10 grid place-items-center bg-[#07100c]/90 text-xs text-[#8fa398]"><span className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin text-[#d9a84e]" />解析模型与纹理…</span></div>}
        {error && <div className="absolute inset-0 z-10 grid place-items-center bg-[#07100c] p-6 text-center"><div><TriangleAlert className="mx-auto mb-2 size-6 text-[#d87558]" /><p className="text-xs leading-5 text-[#c4a296]">{error}</p></div></div>}
      </div>
      <div className="border-t border-white/8 p-3">
        <div className="flex items-center gap-2"><Box className="size-3.5 text-[#d9a84e]" /><strong className="text-xs font-medium text-[#dce5df]">Minecraft 模型查看器</strong><Button size="icon-xs" variant="ghost" className="ml-auto text-[#82968c]" aria-label="重置模型视角" onClick={() => controlsRef.current?.reset()}><RotateCcw /></Button></div>
        {stats && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] text-[#778b80]"><span>{stats.mode}</span><span>{stats.elements} 元素</span><span>{stats.faces} 面</span><span>{stats.textures} 材质</span>{stats.inherited > 0 && <span>继承 {stats.inherited} 层</span>}{stats.fallbackTextures > 0 && <span className="text-[#d99d62]">{stats.fallbackTextures} 个源纹理缺失</span>}</div>}
      </div>
    </div>
  );
}
