import {assetUrl} from './asset-url.mjs';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  resolver,
  previewModel,
  textureRef,
  usedTextures,
  faceArea,
  modelParts,
} from './models.mjs';
let bundlePromise;
export function loadBundle() {
  return (bundlePromise ??= Promise.all(
    [
      '/model-source.json',
      '/vanilla-models.json',
      '/inventory.json',
      '/item-source.json',
      '/texture-index.json',
      '/json-source.json',
    ].map(async (u) => {
      const r = await fetch(assetUrl(u));
      if (!r.ok) throw Error(`${u}: ${r.status}`);
      return r.json();
    }),
  ).then(([pack, vanilla, inventory, items, textures, jsons]) => ({
    pack,
    models: { ...vanilla, ...pack },
    inventory,
    items,
    textures,
    jsons,
    resolve: resolver({ ...vanilla, ...pack }),
  })));
}
const rad = THREE.MathUtils.degToRad;
function faceVertices(e, k) {
  const [a, b, c] = e.from,
    [x, y, z] = e.to;
  return {
    north: [
      [x, y, c],
      [x, b, c],
      [a, b, c],
      [a, y, c],
    ],
    south: [
      [a, y, z],
      [a, b, z],
      [x, b, z],
      [x, y, z],
    ],
    east: [
      [x, y, z],
      [x, b, z],
      [x, b, c],
      [x, y, c],
    ],
    west: [
      [a, y, c],
      [a, b, c],
      [a, b, z],
      [a, y, z],
    ],
    up: [
      [a, y, c],
      [a, y, z],
      [x, y, z],
      [x, y, c],
    ],
    down: [
      [a, b, z],
      [a, b, c],
      [x, b, c],
      [x, b, z],
    ],
  }[k];
}
function defaultUV(e, k) {
  const [a, b, c] = e.from,
    [x, y, z] = e.to;
  return {
    down: [a, 16 - z, x, 16 - c],
    up: [a, c, x, z],
    north: [16 - x, 16 - y, 16 - a, 16 - b],
    south: [a, 16 - y, x, 16 - b],
    west: [c, 16 - y, z, 16 - b],
    east: [16 - z, 16 - y, 16 - c, 16 - b],
  }[k];
}
function rotationMatrix(e) {
  const m = new THREE.Matrix4();
  if (!e.rotation) return m;
  const r = e.rotation,
    o = r.origin || [8, 8, 8];
  if (!r.axis)
    return m
      .makeTranslation(...o)
      .multiply(
        new THREE.Matrix4().makeRotationFromEuler(
          new THREE.Euler(rad(r.x || 0), rad(r.y || 0), rad(r.z || 0), 'ZYX'),
        ),
      )
      .multiply(new THREE.Matrix4().makeTranslation(...o.map((v) => -v)));
  const scale = new THREE.Vector3(1, 1, 1);
  if (r.rescale) {
    const s = 1 / Math.cos(rad(r.angle));
    for (const k of ['x', 'y', 'z']) if (k !== r.axis) scale[k] = s;
  }
  return m
    .makeTranslation(...o)
    .multiply(
      new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(
          ...{ x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[r.axis],
        ),
        rad(r.angle),
      ),
    )
    .multiply(new THREE.Matrix4().makeScale(...scale.toArray()))
    .multiply(new THREE.Matrix4().makeTranslation(...o.map((v) => -v)));
}
export class ModelStage {
  constructor(host, { size = 512, transparent = false } = {}) {
    this.host = host;
    this.resources = [];
    this.animations = [];
    this.notes = [];
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: transparent,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x111c15, transparent ? 0 : 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10000);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 1.5;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.size = size;
    this.resize = () => {
      const w = host.clientWidth || size,
        h = host.clientHeight || size;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.resize();
    this.clock = new THREE.Clock();
    this.run = () => {
      if (this.dead) return;
      const time = this.clock.getElapsedTime();
      for (const fn of this.animations) fn(time);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(this.run);
    };
    this.run();
  }
  clear() {
    this.group.clear();
    for (const r of this.resources) r.dispose?.();
    this.resources = [];
    this.animations = [];
    this.notes = [];
    this.textureCache = new Map();
  }
  async texture(id, bundle) {
    if (this.textureCache.has(id)) return this.textureCache.get(id);
    const promise = (async () => {
      let info = bundle.textures[id];
      if (!info) throw Error('缺失纹理 ' + id);
      if (info.missing)
        this.notes.push(
          '原包缺失纹理 ' + id + '；棋盘格仅标记缺失位置，无法还原原始贴图。',
        );
      if (info.alias) {
        this.notes.push(
          `原包缺失 ${id}；预览使用 ${info.alias}（包内同结构模型纹理）`,
        );
        info = bundle.textures[info.alias];
      }
      const img = await new Promise((ok, no) => {
        const image = new Image();
        image.onload = () => ok(image);
        image.onerror = () => no(Error('纹理加载失败 ' + info.url));
        image.src = assetUrl(info.url);
      });
      if (this.dead) throw Error('预览已关闭');
      const a = info.animation;
      const w =
          a?.width || (a?.height ? img.width : Math.min(img.width, img.height)),
        h =
          a?.height ||
          (a?.width ? img.height : Math.min(img.width, img.height));
      const fw = a ? w : img.width,
        fh = a ? h : img.height,
        canvas = document.createElement('canvas');
      canvas.width = fw;
      canvas.height = fh;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const count = Math.floor(img.width / fw) * Math.floor(img.height / fh),
        frames = a
          ? (a.frames || Array.from({ length: count }, (_, i) => i)).map((f) =>
              typeof f === 'number'
                ? { index: f, time: a.frametime || 1 }
                : { index: f.index, time: f.time || a.frametime || 1 },
            )
          : [{ index: 0, time: 1 }];
      const draw = (f, alpha = 1) => {
        ctx.globalAlpha = alpha;
        ctx.drawImage(
          img,
          (f.index % (img.width / fw)) * fw,
          Math.floor(f.index / (img.width / fw)) * fh,
          fw,
          fh,
          0,
          0,
          fw,
          fh,
        );
        ctx.globalAlpha = 1;
      };
      draw(frames[0]);
      const texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      this.resources.push(texture);
      if (a && frames.length > 1) {
        const total = frames.reduce((s, f) => s + f.time, 0);
        let last = -1;
        this.animations.push((time) => {
          let ticks = (time * 20) % total,
            idx = 0;
          while (ticks >= frames[idx].time) {
            ticks -= frames[idx++].time;
          }
          if (idx !== last || a.interpolate) {
            ctx.clearRect(0, 0, fw, fh);
            draw(frames[idx]);
            if (a.interpolate)
              draw(frames[(idx + 1) % frames.length], ticks / frames[idx].time);
            texture.needsUpdate = true;
            last = idx;
          }
        });
      }
      return { texture, canvas, ctx, width: fw, height: fh };
    })();
    this.textureCache.set(id, promise);
    return promise;
  }
  async buildModel(model, bundle, tints, blockRotation = {}) {
    const group = new THREE.Group(),
      buckets = new Map();
    const texIds = usedTextures(model);
    await Promise.all(texIds.map((id) => this.texture(id, bundle)));
    if (this.dead) throw Error('预览已关闭');
    const add = (id, points, uv, shade = 1, tint = -1) => {
      const key = id + '|' + shade + '|' + tint;
      if (!buckets.has(key))
        buckets.set(key, { id, shade, tint, pos: [], uv: [] });
      const b = buckets.get(key);
      for (const i of [0, 1, 2, 0, 2, 3]) {
        b.pos.push(...points[i]);
        b.uv.push(...uv[i]);
      }
    };
    if (model.elements?.length) {
      for (const e of model.elements) {
        const rot = rotationMatrix(e);
        for (const [k, f] of Object.entries(e.faces || {})) {
          if (!faceArea(e, k)) continue;
          const id = textureRef(f.texture, model.textures),
            [u, v, s, t] = f.uv || defaultUV(e, k),
            uv = [
              [u / 16, 1 - v / 16],
              [u / 16, 1 - t / 16],
              [s / 16, 1 - t / 16],
              [s / 16, 1 - v / 16],
            ],
            n = ((f.rotation || 0) / 90) % 4;
          let rotated = uv.map((_, i) => uv[(i + n) % 4]);
          if (blockRotation.uvlock)
            rotated = lockedUV(k, rotated, blockRotation);
          const points = faceVertices(e, k).map((p) =>
            new THREE.Vector3(...p).applyMatrix4(rot).toArray(),
          );
          add(
            id,
            points,
            rotated,
            e.shade === false
              ? 1
              : {
                  up: 1,
                  down: 0.5,
                  east: 0.6,
                  west: 0.6,
                  north: 0.8,
                  south: 0.8,
                }[k],
            f.tintindex ?? -1,
          );
        }
      }
    } else {
      const layers = Object.keys(model.textures || {})
        .filter((k) => /^layer\d+$/.test(k))
        .sort();
      for (let li = 0; li < layers.length; li++) {
        const id = textureRef('#' + layers[li], model.textures),
          { ctx, width: w, height: h } = await this.texture(id, bundle),
          pixels = ctx.getImageData(0, 0, w, h).data,
          z = 8 + li * 0.015;
        add(
          id,
          [
            [0, 16, z + 0.5],
            [0, 0, z + 0.5],
            [16, 0, z + 0.5],
            [16, 16, z + 0.5],
          ],
          [
            [0, 1],
            [0, 0],
            [1, 0],
            [1, 1],
          ],
          1,
          li,
        );
        add(
          id,
          [
            [16, 16, z - 0.5],
            [16, 0, z - 0.5],
            [0, 0, z - 0.5],
            [0, 16, z - 0.5],
          ],
          [
            [1, 1],
            [1, 0],
            [0, 0],
            [0, 1],
          ],
          0.8,
          li,
        );
        const solid = (x, y) =>
          x >= 0 && y >= 0 && x < w && y < h && pixels[(y * w + x) * 4 + 3] > 0;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            if (!solid(x, y)) continue;
            const a = (x / w) * 16,
              b = ((x + 1) / w) * 16,
              c = 16 - (y / h) * 16,
              d = 16 - ((y + 1) / h) * 16,
              uv = Array(4).fill([(x + 0.5) / w, 1 - (y + 0.5) / h]);
            if (!solid(x - 1, y))
              add(
                id,
                [
                  [a, c, z - 0.5],
                  [a, d, z - 0.5],
                  [a, d, z + 0.5],
                  [a, c, z + 0.5],
                ],
                uv,
                0.7,
                li,
              );
            if (!solid(x + 1, y))
              add(
                id,
                [
                  [b, c, z + 0.5],
                  [b, d, z + 0.5],
                  [b, d, z - 0.5],
                  [b, c, z - 0.5],
                ],
                uv,
                0.7,
                li,
              );
            if (!solid(x, y - 1))
              add(
                id,
                [
                  [a, c, z - 0.5],
                  [a, c, z + 0.5],
                  [b, c, z + 0.5],
                  [b, c, z - 0.5],
                ],
                uv,
                1,
                li,
              );
            if (!solid(x, y + 1))
              add(
                id,
                [
                  [a, d, z + 0.5],
                  [a, d, z - 0.5],
                  [b, d, z - 0.5],
                  [b, d, z + 0.5],
                ],
                uv,
                0.5,
                li,
              );
          }
      }
    }
    for (const b of buckets.values()) {
      const { texture } = await this.texture(b.id, bundle);
      const color = new THREE.Color(0xffffff);
      if (b.tint >= 0) {
        const t = tints?.[b.tint];
        if (t?.default !== undefined) color.setHex(t.default);
        else if (model.elements?.length) color.setHex(0x91bd59);
      }
      color.multiplyScalar(b.shade);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        color,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.01,
        depthWrite: true,
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      geo.computeVertexNormals();
      this.resources.push(material, geo);
      group.add(new THREE.Mesh(geo, material));
    }
    return group;
  }
  async show(parts, bundle, { view = 'orbit', state = {} } = {}) {
    this.clear();
    let templates = [],
      elementCount = 0,
      renderedIds = [];
    for (const part of parts) {
      if (part.empty) continue;
      const entries = modelParts(part.id, bundle.resolve, state);
      for (const e of entries) {
        renderedIds.push(e.id);
        const preview = previewModel(e.id, bundle.resolve, bundle.pack),
          m = preview.model;
        templates.push(preview.templateExample);
        const object = await this.buildModel(m, bundle, part.tints, {
          x: (e.x || 0) + (part.x || 0),
          y: (e.y || 0) + (part.y || 0),
          uvlock: e.uvlock || part.uvlock,
        });
        if (this.dead) {
          this.clear();
          throw Error('预览已关闭');
        }
        elementCount += m.elements?.length || 0;
        object.position.set(-8, -8, -8);
        const wrapper = new THREE.Group();
        wrapper.rotation.order = 'YXZ';
        wrapper.add(object);
        if (e.x || part.x)
          wrapper.rotation.x = -rad((e.x || 0) + (part.x || 0));
        if (e.y || part.y)
          wrapper.rotation.y = -rad((e.y || 0) + (part.y || 0));
        if (view !== 'orbit' && m.display?.[view]) {
          const d = m.display[view];
          if (d.rotation) wrapper.rotation.set(...d.rotation.map(rad));
          if (d.translation) wrapper.position.fromArray(d.translation);
          if (d.scale) wrapper.scale.fromArray(d.scale);
        }
        for (const t of part.transforms || []) {
          const matrix = new THREE.Matrix4();
          if (Array.isArray(t)) matrix.fromArray(t).transpose();
          else {
            const q = new THREE.Quaternion(
                ...(t.left_rotation || [0, 0, 0, 1]),
              ),
              r = new THREE.Quaternion(...(t.right_rotation || [0, 0, 0, 1]));
            matrix
              .compose(
                new THREE.Vector3(...(t.translation || [0, 0, 0])),
                q,
                new THREE.Vector3(...(t.scale || [1, 1, 1])),
              )
              .multiply(new THREE.Matrix4().makeRotationFromQuaternion(r));
          }
          wrapper.applyMatrix4(matrix);
        }
        this.group.add(wrapper);
      }
    }
    this.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.group);
    if (box.isEmpty()) {
      box.set(new THREE.Vector3(-8, -8, -0.5), new THREE.Vector3(8, 8, 0.5));
    }
    const center = box.getCenter(new THREE.Vector3()),
      radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 1);
    this.controls.target.copy(center);
    const dist = (radius / Math.sin(rad(17.5))) * 1.12;
    this.camera.position
      .copy(center)
      .add(
        new THREE.Vector3(
          ...(view === 'orbit' && elementCount ? [1, 0.65, 1.3] : [0, 0, 1]),
        )
          .normalize()
          .multiplyScalar(dist),
      );
    this.camera.near = Math.max(0.01, dist / 1000);
    this.camera.far = dist * 100;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.controls.saveState();
    this.renderer.render(this.scene, this.camera);
    this.renderer.domElement.dataset.loaded = 'true';
    this.renderer.domElement.dataset.models = parts
      .map((p) => p.id || 'empty')
      .join('|');
    const gl = this.renderer.getContext(),
      buffer = new Uint8Array(
        gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
      );
    gl.readPixels(
      0,
      0,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      buffer,
    );
    let visiblePixels = 0;
    for (let i = 0; i < buffer.length; i += 4)
      if (buffer[i] !== 17 || buffer[i + 1] !== 28 || buffer[i + 2] !== 21)
        visiblePixels++;
    return {
      ids: [...new Set(renderedIds)],
      visiblePixels,
      elements: elementCount,
      meshes: this.resources.filter((r) => r.isBufferGeometry).length,
      templates: templates.filter(Boolean),
      notes: [...new Set(this.notes)],
      animated: this.animations.length,
    };
  }
  reset() {
    this.controls.reset();
  }
  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    this.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

function lockedUV(face, uv, r) {
  const unit = { from: [-1, -1, -1], to: [1, 1, 1] },
    matrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(-rad(r.x || 0), -rad(r.y || 0), 0, 'YXZ'),
    );
  const normals = {
    north: [0, 0, -1],
    south: [0, 0, 1],
    east: [1, 0, 0],
    west: [-1, 0, 0],
    up: [0, 1, 0],
    down: [0, -1, 0],
  };
  const normal = new THREE.Vector3(...normals[face]).applyMatrix4(matrix);
  const target = Object.keys(normals).sort(
    (a, b) =>
      normal.dot(new THREE.Vector3(...normals[b])) -
      normal.dot(new THREE.Vector3(...normals[a])),
  )[0];
  const verts = faceVertices(unit, target).map((v) => new THREE.Vector3(...v)),
    u = verts[3].clone().sub(verts[0]).normalize(),
    v = verts[1].clone().sub(verts[0]).normalize();
  return faceVertices(unit, face).map((p) => {
    const pt = new THREE.Vector3(...p).applyMatrix4(matrix),
      right = pt.dot(u) > 0,
      bottom = pt.dot(v) > 0;
    return uv[right ? (bottom ? 2 : 3) : bottom ? 1 : 0];
  });
}
