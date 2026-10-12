import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const assetsRoot = path.join(projectRoot, 'public', 'pack', 'assets');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  }))).flat();
}

const files = await walk(assetsRoot);
const modelFiles = new Map();
const textureFiles = new Set();
for (const file of files) {
  const relative = path.relative(assetsRoot, file).split(path.sep).join('/');
  const [namespace, section, ...rest] = relative.split('/');
  if (section === 'models' && relative.endsWith('.json')) {
    modelFiles.set(`${namespace}:${rest.join('/').slice(0, -5)}`, file);
  }
  if (section === 'textures' && relative.endsWith('.png')) {
    textureFiles.add(`${namespace}:${rest.join('/').slice(0, -4)}`);
  }
}

const vanillaRoot = path.join(projectRoot, 'public', 'vanilla', 'assets');
try {
  for (const file of await walk(vanillaRoot)) {
    const relative = path.relative(vanillaRoot, file).split(path.sep).join('/');
    const [namespace, section, ...rest] = relative.split('/');
    if (section === 'textures' && relative.endsWith('.png')) textureFiles.add(`${namespace}:${rest.join('/').slice(0, -4)}`);
  }
} catch { /* Vanilla dependencies are optional until the model validation step. */ }

const parsed = new Map();
const parseErrors = [];
for (const [key, file] of modelFiles) {
  try {
    parsed.set(key, JSON.parse(await readFile(file, 'utf8')));
  } catch (error) {
    parseErrors.push({ model: key, error: String(error) });
  }
}

const qualify = (value) => value.includes(':') ? value : `minecraft:${value}`;
const modelPathFromParent = (parent) => qualify(parent);
const mergeModel = (parent, child) => ({
  ...parent,
  ...child,
  textures: { ...(parent?.textures ?? {}), ...(child?.textures ?? {}) },
  display: { ...(parent?.display ?? {}), ...(child?.display ?? {}) },
  elements: child?.elements ?? parent?.elements,
});

const resolvedCache = new Map();
const cycles = [];
function resolveModel(key, chain = []) {
  if (resolvedCache.has(key)) return resolvedCache.get(key);
  if (chain.includes(key)) {
    cycles.push([...chain, key]);
    return parsed.get(key) ?? {};
  }
  const model = parsed.get(key) ?? {};
  const parentKey = model.parent ? modelPathFromParent(model.parent) : null;
  const resolved = parentKey && parsed.has(parentKey)
    ? mergeModel(resolveModel(parentKey, [...chain, key]), model)
    : model;
  resolvedCache.set(key, resolved);
  return resolved;
}

function resolveTexture(ref, textures, seen = []) {
  if (typeof ref !== 'string') return null;
  if (!ref.startsWith('#')) return qualify(ref);
  const name = ref.slice(1);
  if (seen.includes(name)) return null;
  return resolveTexture(textures?.[name], textures, [...seen, name]);
}

function hasTexture(texture) {
  if (textureFiles.has(texture)) return true;
  if (texture.includes('/market_stall_fish')) return textureFiles.has(texture.replace('/market_stall_fish', '/market_table_fish'));
  return false;
}

const unresolvedParents = new Map();
const missingTextures = new Map();
const unresolvedTextureRefs = [];
const unrenderable = [];
let elementModels = 0;
let spriteModels = 0;
let compositeModels = 0;
let totalElements = 0;
let totalFaces = 0;

for (const [key, raw] of parsed) {
  if (raw.parent) {
    const parentKey = modelPathFromParent(raw.parent);
    if (!parsed.has(parentKey)) unresolvedParents.set(parentKey, 1 + (unresolvedParents.get(parentKey) ?? 0));
  }
  const model = resolveModel(key);
  const elements = model.elements ?? [];
  const textures = model.textures ?? {};
  if (elements.length) {
    elementModels += 1;
    totalElements += elements.length;
    for (const element of elements) {
      for (const [faceName, face] of Object.entries(element.faces ?? {})) {
        const size = element.to.map((value, index) => Math.abs(value - element.from[index]));
        const area = faceName === 'up' || faceName === 'down' ? size[0] * size[2]
          : faceName === 'east' || faceName === 'west' ? size[1] * size[2]
            : size[0] * size[1];
        if (area === 0) continue;
        totalFaces += 1;
        const texture = resolveTexture(face.texture, textures);
        if (!texture) unresolvedTextureRefs.push({ model: key, ref: face.texture });
        else if (!hasTexture(texture)) missingTextures.set(texture, 1 + (missingTextures.get(texture) ?? 0));
      }
    }
  } else if (model.multipart || model.variants) {
    compositeModels += 1;
  } else {
    const candidates = ['layer0', ...Object.keys(textures).filter((name) => name !== 'particle')];
    const texture = candidates.map((name) => resolveTexture(`#${name}`, textures)).find(Boolean);
    if (texture) {
      spriteModels += 1;
      if (!hasTexture(texture)) missingTextures.set(texture, 1 + (missingTextures.get(texture) ?? 0));
    } else {
      unrenderable.push(key);
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  totalModels: parsed.size,
  parseErrors,
  cycles,
  elementModels,
  spriteModels,
  compositeModels,
  unrenderable,
  totalElements,
  totalFaces,
  unresolvedParents: [...unresolvedParents.entries()].sort((a, b) => b[1] - a[1]).map(([parent, count]) => ({ parent, count })),
  unresolvedTextureRefs,
  missingTextures: [...missingTextures.entries()].sort((a, b) => b[1] - a[1]).map(([texture, count]) => ({ texture, count })),
};

await writeFile(path.join(projectRoot, 'public', 'model-report.json'), JSON.stringify(report));
console.log(JSON.stringify({
  totalModels: report.totalModels,
  parseErrors: report.parseErrors.length,
  cycles: report.cycles.length,
  elementModels,
  spriteModels,
  compositeModels,
  unrenderable: report.unrenderable.length,
  totalElements,
  totalFaces,
  unresolvedParents: report.unresolvedParents.length,
  unresolvedTextureRefs: report.unresolvedTextureRefs.length,
  missingTextures: report.missingTextures.length,
}, null, 2));
