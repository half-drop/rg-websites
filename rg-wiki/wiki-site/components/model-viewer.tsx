'use client';
import {assetUrl} from '../lib/asset-url.mjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ModelStage, loadBundle } from '../lib/render-model.mjs';
import {
  collectItemRefs,
  evaluateItem,
  itemProperties,
  norm,
} from '../lib/models.mjs';
import { Button } from './ui/button';
export default function ModelViewer({
  path,
  section,
}: {
  path: string;
  section: string;
}) {
  const host = useRef<HTMLDivElement>(null),
    stage = useRef<any>(null),
    [bundle, setBundle] = useState<any>(null),
    [failure, setFailure] = useState(''),
    [result, setResult] = useState<any>(null),
    [view, setView] = useState('orbit'),
    [spin, setSpin] = useState(false),
    [values, setValues] = useState<Record<string, any>>({
      'minecraft:display_context:0': 'gui',
    }),
    [branch, setBranch] = useState(-1),
    [block, setBlock] = useState<Record<string, any>>({
      north: 'true',
      east: 'false',
      south: 'true',
      west: 'false',
    }),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    loadBundle()
      .then(setBundle)
      .catch((e: Error) => setFailure(e.message));
  }, []);
  useEffect(() => {
    setBranch(-1);
    setResult(null);
    setValues({ 'minecraft:display_context:0': 'gui' });
    setBlock({ north: 'true', east: 'false', south: 'true', west: 'false' });
  }, [path]);
  const item = bundle?.items[path]?.model,
    blockDefinition = bundle?.jsons[path],
    refs = useMemo(() => (item ? collectItemRefs(item) : []), [item]),
    props = useMemo(() => (item ? itemProperties(item) : {}), [item]);
  const parts = useMemo(() => {
    if (!bundle) return [];
    if (section === 'items')
      return branch < 0 ? evaluateItem(item, values) : [refs[branch]];
    if (section === 'blockstates') {
      const d = blockDefinition;
      if (d?.variants) {
        const k = block.variant ?? Object.keys(d.variants)[0],
          v = d.variants[k],
          apply = Array.isArray(v)
            ? v[Number(block.weighted || 0) % v.length]
            : v;
        return [
          {
            id: norm(apply.model),
            x: apply.x,
            y: apply.y,
            uvlock: apply.uvlock,
          },
        ];
      }
      if (d?.multipart) return [{ id: 'wiki:current-blockstate' }];
    }
    const seg = path.split('/');
    return [
      {
        id:
          seg[1] +
          ':' +
          seg
            .slice(3)
            .join('/')
            .replace(/\.json$/, ''),
      },
    ];
  }, [
    bundle,
    path,
    section,
    item,
    values,
    branch,
    refs,
    blockDefinition,
    block,
  ]);
  useEffect(() => {
    if (!host.current || !bundle) return;
    let active = true;
    setLoading(true);
    setFailure('');
    setResult(null);
    let s: any;
    try {
      s = new ModelStage(host.current);
      stage.current = s;
      s.controls.autoRotate = spin;
      let currentBundle = bundle;
      if (section === 'blockstates' && blockDefinition?.multipart) {
        const old = bundle.resolve;
        currentBundle = {
          ...bundle,
          resolve: (id: string) =>
            id === 'wiki:current-blockstate'
              ? { ...blockDefinition, textures: {} }
              : old(id),
        };
      }
      s.show(parts, currentBundle, { view, state: block })
        .then((r: any) => {
          if (active) {
            setResult(r);
            setLoading(false);
          }
        })
        .catch((e: Error) => {
          if (active) {
            setFailure(e.message);
            setLoading(false);
          }
        });
    } catch (e) {
      setFailure(String(e));
      setLoading(false);
    }
    return () => {
      active = false;
      s?.dispose();
      if (stage.current === s) stage.current = null;
    };
  }, [bundle, parts, view, block, section, blockDefinition]);
  useEffect(() => {
    if (stage.current) stage.current.controls.autoRotate = spin;
  }, [spin]);
  const model = parts[0]?.id && bundle?.models[parts[0].id];
  const variants = blockDefinition?.variants || model?.variants;
  const multipart = blockDefinition?.multipart || model?.multipart;
  return (
    <section className="model-viewer">
      <div className="viewer-controls">
        <label>
          视角{' '}
          <select
            aria-label="模型视角"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            {[
              ['orbit', '自由观察'],
              ['gui', '物品栏'],
              ['ground', '地面'],
              ['fixed', '展示框'],
              ['firstperson_righthand', '第一人称右手'],
              ['thirdperson_righthand', '第三人称右手'],
              ['firstperson_lefthand', '第一人称左手'],
              ['thirdperson_lefthand', '第三人称左手'],
              ['head', '头部'],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" onClick={() => setSpin(!spin)}>
          {spin ? '停止旋转' : '自动旋转'}
        </Button>
        <Button variant="outline" onClick={() => stage.current?.reset()}>
          重置视角
        </Button>
      </div>
      {item && (
        <details className="source" open>
          <summary>物品显示状态与分支</summary>
          <div className="viewer-controls">
            {Object.entries(props).map(([key, p]: [string, any]) => (
              <label key={key}>
                {key.replaceAll('minecraft:', '')}{' '}
                {p.type === 'range_dispatch' ? (
                  <input
                    type="number"
                    aria-label={key}
                    value={values[key] || 0}
                    onChange={(e) => {
                      setBranch(-1);
                      setValues({ ...values, [key]: Number(e.target.value) });
                    }}
                  />
                ) : (
                  <select
                    aria-label={key}
                    value={values[key] || ''}
                    onChange={(e) => {
                      setBranch(-1);
                      setValues({ ...values, [key]: e.target.value });
                    }}
                  >
                    <option value="">默认 / fallback</option>
                    {p.options.map((v: string) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                )}
              </label>
            ))}
          </div>
          <label>
            单独查看分支{' '}
            <select
              aria-label="物品分支"
              value={branch}
              onChange={(e) => setBranch(Number(e.target.value))}
            >
              <option value={-1}>按上方状态组合显示</option>
              {refs.map((r: any, i: number) => (
                <option value={i} key={i}>
                  {r.label} → {r.empty ? '空模型' : r.id}
                </option>
              ))}
            </select>
          </label>
          <p className="info-note">
            所有条件、范围及组合分支均保留；空分支按原定义不绘制。
          </p>
        </details>
      )}
      {variants && (
        <div className="viewer-controls">
          <label>
            方块状态{' '}
            <select
              aria-label="方块状态"
              value={block.variant ?? Object.keys(variants)[0]}
              onChange={(e) => setBlock({ ...block, variant: e.target.value })}
            >
              {Object.keys(variants).map((v) => (
                <option key={v} value={v}>
                  {v || '默认'}
                </option>
              ))}
            </select>
          </label>
          <label>
            加权变体序号{' '}
            <input
              type="number"
              min="0"
              value={block.weighted || 0}
              onChange={(e) =>
                setBlock({
                  ...block,
                  weighted: Math.max(0, Number(e.target.value)),
                })
              }
            />
          </label>
        </div>
      )}
      {multipart && (
        <div className="viewer-controls">
          <label>
            加权变体序号{' '}
            <input
              aria-label="组合模型变体"
              type="number"
              min="0"
              value={block.weighted || 0}
              onChange={(e) =>
                setBlock({
                  ...block,
                  weighted: Math.max(0, Number(e.target.value)),
                })
              }
            />
          </label>
          {[
            ...new Set(
              multipart
                .flatMap((p: any) => Object.keys(p.when || {}))
                .filter((k: string) => !['OR', 'AND'].includes(k)),
            ),
          ].map((k: any) => (
            <label key={k}>
              {k}{' '}
              <select
                value={block[k] || 'false'}
                onChange={(e) => setBlock({ ...block, [k]: e.target.value })}
              >
                <option>true</option>
                <option>false</option>
              </select>
            </label>
          ))}
        </div>
      )}
      <div className="stage" ref={host}>
        {loading && !failure && <p className="loading">正在加载几何与纹理…</p>}
        {failure && (
          <p role="alert" className="alert">
            模型加载失败：{failure}
          </p>
        )}
        <div className="model-status" role="status">
          {result
            ? `${result.elements ? `${result.elements} 个元素` : '像素挤出模型'} · ${result.meshes} 个绘制批次${result.animated ? ` · ${result.animated} 个动画纹理` : ''}`
            : ''}
        </div>
      </div>
      <p className="info-note">拖动旋转 · 滚轮缩放 · 右键平移</p>
      {result?.meshes > 0 && result?.visiblePixels === 0 && (
        <p className="info-note">
          当前视角没有可见像素；原模型可能使用透明纹理或退化面，可旋转观察并核对原始定义。
        </p>
      )}
      {result?.meshes === 0 && (
        <p className="alert">此显示状态是空模型；可切换状态或分支。</p>
      )}
      {result?.templates?.length > 0 && (
        <p className="alert">
          这是父模型模板，原文件不指定完整纹理。此处使用实例{' '}
          {result.templates.join('、')} 的纹理展示模板几何。
        </p>
      )}
      {result?.notes?.map((note: string) => (
        <p className="alert" key={note}>
          {note}
        </p>
      ))}
      {parts.length > 0 && (
        <div className="dependencies">
          模型来源：
          {parts
            .filter((p: any) => p.id)
            .map((p: any, i: number) => {
              const [ns, id] = p.id.split(':');
              return (
                <a
                  key={i}
                  href={
                    '#' +
                    new URLSearchParams({
                      file: `assets/${ns}/models/${id}.json`,
                    })
                  }
                >
                  {p.id}
                </a>
              );
            })}
        </div>
      )}
    </section>
  );
}
