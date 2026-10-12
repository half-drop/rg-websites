export const norm = (id) => (id.includes(':') ? id : 'minecraft:' + id);
export function resolver(models) {
  const cache = new Map();
  function resolve(id, stack = []) {
    id = norm(id);
    if (cache.has(id)) return cache.get(id);
    if (stack.includes(id))
      throw Error('父模型循环: ' + [...stack, id].join(' → '));
    if (id === 'minecraft:builtin/generated')
      return { generated: true, textures: {} };
    if (id === 'minecraft:builtin/entity')
      return { builtin: true, textures: {} };
    const j = models[id];
    if (!j) throw Error('找不到父模型 ' + id);
    const p = j.parent ? resolve(j.parent, [...stack, id]) : {};
    const r = {
      ...p,
      ...j,
      textures: { ...p.textures, ...j.textures },
      display: { ...p.display, ...j.display },
      chain: [id, ...(p.chain || [])],
    };
    cache.set(id, r);
    return r;
  }
  return resolve;
}
export function textureRef(ref, textures) {
  const seen = new Set();
  while (typeof ref === 'string' && ref.startsWith('#')) {
    if (seen.has(ref)) throw Error('纹理别名循环 ' + ref);
    seen.add(ref);
    ref = textures[ref.slice(1)];
  }
  if (ref && typeof ref === 'object') ref = ref.sprite;
  if (!ref) throw Error('纹理引用为空');
  return norm(ref);
}
export function usedTextures(m) {
  const refs = m.elements?.length
    ? m.elements.flatMap((e) =>
        Object.entries(e.faces || {})
          .filter(([k]) => faceArea(e, k) > 0)
          .map(([, f]) => f.texture),
      )
    : Object.keys(m.textures || {})
        .filter((k) => /^layer\d+$/.test(k))
        .map((k) => '#' + k);
  return [...new Set(refs.map((r) => textureRef(r, m.textures)))];
}
export function matches(when, state) {
  if (!when) return true;
  if (when.OR) return when.OR.some((w) => matches(w, state));
  if (when.AND) return when.AND.every((w) => matches(w, state));
  return Object.entries(when).every(([k, v]) =>
    String(v)
      .split('|')
      .includes(String(state[k] ?? 'false')),
  );
}
export function modelParts(id, resolve, state = {}, trail = []) {
  id = norm(id);
  if (trail.includes(id)) throw Error('组合模型循环 ' + id);
  const m = resolve(id);
  if (!m.multipart && !m.variants) return [{ id, model: m }];
  let applied = m.multipart
    ? m.multipart
        .filter((p) => matches(p.when, state))
        .flatMap((p) => [
          Array.isArray(p.apply)
            ? p.apply[Number(state.weighted || 0) % p.apply.length]
            : p.apply,
        ])
    : [];
  if (m.variants) {
    const keys = Object.keys(m.variants);
    const k = state.variant ?? keys[0];
    const v = m.variants[k];
    applied = [
      Array.isArray(v) ? v[Number(state.weighted || 0) % v.length] : v,
    ];
  }
  return applied
    .filter(Boolean)
    .flatMap((p) =>
      modelParts(p.model, resolve, state, [...trail, id]).map((child) => ({
        ...child,
        x: (child.x || 0) + (p.x || 0),
        y: (child.y || 0) + (p.y || 0),
        uvlock: p.uvlock,
      })),
    );
}
export function collectItemRefs(node, label = '默认', out = []) {
  if (!node || typeof node !== 'object') return out;
  const type = (node.type || '').replace('minecraft:', '');
  if (type === 'model')
    out.push({
      id: norm(node.model),
      label,
      tints: node.tints,
      transformation: node.transformation,
    });
  if (type === 'empty') out.push({ empty: true, label });
  if (type === 'composite')
    node.models.forEach((n, i) =>
      collectItemRefs(n, `${label} / 组合 ${i + 1}`, out),
    );
  if (type === 'condition') {
    collectItemRefs(node.on_true, `${label} / ${node.property}=true`, out);
    collectItemRefs(node.on_false, `${label} / ${node.property}=false`, out);
  }
  if (type === 'select')
    node.cases.forEach((c) =>
      collectItemRefs(c.model, `${label} / ${node.property}=${c.when}`, out),
    );
  if (type === 'range_dispatch')
    node.entries.forEach((c) =>
      collectItemRefs(
        c.model,
        `${label} / ${node.property}≥${c.threshold}`,
        out,
      ),
    );
  if (node.fallback) collectItemRefs(node.fallback, `${label} / fallback`, out);
  return out;
}
export function evaluateItem(node, values = {}) {
  if (!node) return [];
  const type = (node.type || '').replace('minecraft:', '');
  let result = [];
  const prop = node.property,
    key = prop + ':' + (node.index || 0),
    value = values[key] ?? values[prop];
  switch (type) {
    case 'empty':
      return [];
    case 'model':
      result = [{ id: norm(node.model), tints: node.tints }];
      break;
    case 'composite':
      result = node.models.flatMap((n) => evaluateItem(n, values));
      break;
    case 'condition':
      result = evaluateItem(
        value === true || value === 'true' ? node.on_true : node.on_false,
        values,
      );
      break;
    case 'select': {
      const c = node.cases.find((c) =>
        (Array.isArray(c.when) ? c.when : [c.when]).includes(value),
      );
      result = evaluateItem(c?.model || node.fallback, values);
      break;
    }
    case 'range_dispatch': {
      const n = Number(value || 0) * (node.scale ?? 1);
      const c = node.entries
        .filter((c) => c.threshold <= n)
        .sort((a, b) => b.threshold - a.threshold)[0];
      result = evaluateItem(c?.model || node.fallback, values);
      break;
    }
    default:
      throw Error('未支持的物品定义 ' + type);
  }
  return result.map((r) => ({
    ...r,
    transforms: [
      ...(r.transforms || []),
      ...(node.transformation ? [node.transformation] : []),
    ],
  }));
}
export function itemProperties(node, out = {}) {
  if (!node || typeof node !== 'object') return out;
  if (node.property) {
    const key = node.property + ':' + (node.index || 0),
      type = (node.type || '').replace('minecraft:', '');
    out[key] ??= { type, options: [] };
    if (type === 'select')
      out[key].options = [
        ...new Set([...out[key].options, ...node.cases.flatMap((c) => c.when)]),
      ];
    if (type === 'condition') out[key].options = ['false', 'true'];
  }
  for (const v of Object.values(node)) {
    if (Array.isArray(v)) v.forEach((n) => itemProperties(n, out));
    else if (v && typeof v === 'object') itemProperties(v, out);
  }
  return out;
}
export function faceArea(e, face) {
  const d = e.to.map((v, i) => Math.abs(v - e.from[i]));
  return ['up', 'down'].includes(face)
    ? d[0] * d[2]
    : ['east', 'west'].includes(face)
      ? d[1] * d[2]
      : d[0] * d[1];
}
export function previewModel(id, resolve, models) {
  let model = resolve(id);
  try {
    usedTextures(model);
    return { model };
  } catch (error) {
    const descendant = Object.keys(models).find(
      (k) =>
        k !== norm(id) &&
        (resolve(k).chain?.includes(norm(id)) ||
          resolve(k).chain?.includes(norm(id).replace('_notint', ''))) &&
        (() => {
          try {
            usedTextures(resolve(k));
            return true;
          } catch {
            return false;
          }
        })(),
    );
    if (!descendant) throw error;
    return {
      model: { ...model, textures: resolve(descendant).textures },
      templateExample: descendant,
    };
  }
}
