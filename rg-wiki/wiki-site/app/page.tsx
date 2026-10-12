'use client';
import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import {
  Search,
  Box,
  Layers,
  Image as ImageIcon,
  Music,
  FileText,
  ChevronRight,
  ArrowLeft,
  ChevronLeft,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
} from 'lucide-react';
import { assetUrl } from '../lib/asset-url.mjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
const Viewer = lazy(() => import('../components/model-viewer'));
type Entry = {
  path: string;
  name: string;
  section: string;
  namespace: string;
  group: string;
  size: number;
  ext: string;
  sha256: string;
};
const labels: Record<string, string> = {
  all: '全部资源',
  models: '模型图鉴',
  items: '物品定义',
  textures: '纹理图库',
  sounds: '声音档案',
  lang: '语言文本',
  equipment: '装备配置',
  blockstates: '方块状态',
  font: '字体',
  shaders: '着色器',
  atlases: '纹理图集',
  metadata: '声音映射',
  root: '资源包文件',
};
const icons: Record<string, any> = {
  models: Box,
  items: Layers,
  textures: ImageIcon,
  sounds: Music,
};
const url = (p: string) =>
  assetUrl('/pack/' + p.split('/').map(encodeURIComponent).join('/'));
export default function Wiki() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [section, setSection] = useState('models'),
    [q, setQ] = useState(''),
    [ns, setNs] = useState('all'),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<Entry | null>(null),
    [source, setSource] = useState(''),
    [report, setReport] = useState<any>(null);
  useEffect(() => {
    fetch(assetUrl('/inventory.json'))
      .then((r) => {
        if (!r.ok) throw Error('无法读取资源索引');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
    fetch(assetUrl('/model-report.json'))
      .then((r) => (r.ok ? r.json() : null))
      .then(setReport)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!data) return;
    function sync() {
      const p = new URLSearchParams(location.hash.slice(1)).get('file');
      setSelected(data.files.find((e: Entry) => e.path === p) || null);
    }
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [data]);
  useEffect(() => {
    setSource('');
    if (selected && !['png', 'ogg'].includes(selected.ext)) {
      let live = true;
      fetch(url(selected.path))
        .then((r) => r.text())
        .then((t) => {
          if (live) {
            try {
              setSource(JSON.stringify(JSON.parse(t), null, 2));
            } catch {
              setSource(t);
            }
          }
        })
        .catch((e) => live && setSource(String(e)));
      return () => {
        live = false;
      };
    }
  }, [selected]);
  const filtered = useMemo(
    () =>
      data?.files.filter(
        (e: Entry) =>
          (section === 'all' || e.section === section) &&
          (ns === 'all' || e.namespace === ns) &&
          e.path.toLowerCase().includes(q.toLowerCase()),
      ) || [],
    [data, section, ns, q],
  );
  const open = (e: Entry) => {
    location.hash = new URLSearchParams({ file: e.path }).toString();
  };
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setSelected(null)}>
          <img src={assetUrl('/pack/pack.png')} alt="" />
          <span>
            RAVENGARD<small>资源百科 / 8.29</small>
          </span>
        </a>
        <div className="nav-title">资源目录</div>
        <nav>
          {['all', ...Object.keys(labels).filter((k) => k !== 'all')].map(
            (k) => {
              const Icon = icons[k] || FileText;
              return (
                <button
                  key={k}
                  className={section === k ? 'nav-item active' : 'nav-item'}
                  onClick={() => {
                    setSection(k);
                    setPage(0);
                    location.hash = '';
                    setSelected(null);
                  }}
                >
                  <Icon size={18} />
                  <span>{labels[k]}</span>
                  <small>
                    {data
                      ? (k === 'all'
                          ? data.total
                          : data.counts[k] || 0
                        ).toLocaleString()
                      : '—'}
                  </small>
                </button>
              );
            },
          )}
        </nav>
        <div className="sidebar-foot">
          <BookOpen size={17} />
          <p>
            非官方资料站
            <br />
            <span>资源版权归 Hypixel Inc. 所有</span>
          </p>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            RAVENGARD <b>/</b> 资源档案
          </span>
          <span className="version">PLAYTEST 0.2.0 · 26.2</span>
        </header>
        {error ? (
          <p role="alert">{error}</p>
        ) : !data ? (
          <p className="loading">正在读取完整资源索引…</p>
        ) : selected ? (
          <article className="detail">
            <Button
              variant="outline"
              onClick={() => {
                location.hash = '';
                setSelected(null);
              }}
            >
              <ArrowLeft size={16} /> 返回目录
            </Button>
            <div className="eyebrow">
              {labels[selected.section]} / {selected.namespace}
            </div>
            <h1>{selected.name.replace(/\.json$/, '').replaceAll('_', ' ')}</h1>
            <p className="filepath">{selected.path}</p>
            {['models', 'items', 'blockstates'].includes(selected.section) ? (
              <Suspense
                fallback={<div className="stage">正在启动模型预览…</div>}
              >
                <Viewer path={selected.path} section={selected.section} />
              </Suspense>
            ) : selected.ext === 'png' ? (
              <div className="image-stage">
                <img src={url(selected.path)} alt={selected.name} />
              </div>
            ) : selected.ext === 'ogg' ? (
              <div className="audio-stage">
                <Music size={52} />
                <audio controls src={url(selected.path)} />
              </div>
            ) : null}
            <div className="filebar">
              <span>
                {selected.size.toLocaleString()} 字节 ·{' '}
                {selected.ext.toUpperCase() || 'TEXT'}
              </span>
              <a href={url(selected.path)} download>
                <Download size={16} /> 下载原文件
              </a>
              <a href={url(selected.path)} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> 打开原文件
              </a>
            </div>
            <details
              className="source"
              open={
                !['models', 'items', 'png', 'ogg', 'blockstates'].includes(
                  selected.section,
                ) && !['png', 'ogg'].includes(selected.ext)
              }
            >
              <summary>文件内容与来源</summary>
              <p className="hash">SHA-256 {selected.sha256}</p>
              {source && <pre>{source}</pre>}
            </details>
          </article>
        ) : (
          <>
            <section className="heading">
              <div>
                <div className="eyebrow">THE RAVENGARD ARCHIVE</div>
                <h1>{labels[section]}</h1>
                <p>探索 8.29 资源包，从每一件物品到每一处细节。</p>
              </div>
              <div className="coverage">
                <CheckCircle2 size={19} />
                <span>
                  完整收录
                  <strong>
                    {data.total.toLocaleString()} /{' '}
                    {data.total.toLocaleString()}
                  </strong>
                </span>
              </div>
            </section>
            <div className="stats">
              <div>
                <Box />
                <strong>{data.counts.models.toLocaleString()}</strong>
                <span>模型文件</span>
              </div>
              <div>
                <Layers />
                <strong>{data.counts.items.toLocaleString()}</strong>
                <span>物品定义</span>
              </div>
              <div>
                <ImageIcon />
                <strong>{data.counts.textures.toLocaleString()}</strong>
                <span>纹理文件</span>
              </div>
              <div>
                <Music />
                <strong>{data.counts.sounds.toLocaleString()}</strong>
                <span>声音文件</span>
              </div>
            </div>
            <section className="catalog">
              {report?.sourceMissing > 0 && (
                <p className="info-note">
                  原包说明：10 个树叶模板以实例纹理展示；1
                  个模型的原始贴图缺失，预览中已标明。
                  <a href={assetUrl('/model-report.json')} target="_blank">
                    {' '}
                    查看详情 ↗
                  </a>
                </p>
              )}
              <div className="filters">
                <div className="search">
                  <Search size={18} />
                  <Input
                    aria-label="搜索资源"
                    placeholder="搜索名称、路径，例如 sword、boss、leaves…"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>
                <select
                  aria-label="命名空间"
                  value={ns}
                  onChange={(e) => {
                    setNs(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="all">全部命名空间</option>
                  <option value="hypixel_ravengard">Ravengard</option>
                  <option value="minecraft">Minecraft</option>
                  <option value="pack">资源包根目录</option>
                </select>
              </div>
              <div className="resultline">
                <span>{filtered.length.toLocaleString()} 个条目</span>
                <span>原始名称 · 完整路径可检索</span>
              </div>
              <div className="grid">
                {filtered.slice(page * 48, (page + 1) * 48).map((e: Entry) => {
                  const Icon = icons[e.section] || FileText;
                  const thumb =
                    e.ext === 'png'
                      ? url(e.path)
                      : e.section === 'models'
                        ? assetUrl('/thumbnails/' + e.path + '.png')
                        : null;
                  return (
                    <button
                      className="card"
                      key={e.path}
                      onClick={() => open(e)}
                    >
                      <div className={'card-art ' + e.section}>
                        {thumb ? (
                          <img
                            loading="lazy"
                            src={thumb}
                            alt=""
                            onError={(ev) => {
                              ev.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Icon size={38} />
                        )}
                        <span className="typebadge">
                          {e.section === 'models'
                            ? '3D / 模型'
                            : e.ext.toUpperCase() || 'TEXT'}
                        </span>
                      </div>
                      <div className="card-info">
                        <strong>
                          {e.name
                            .replace(/\.(json|png|ogg)$/, '')
                            .replaceAll('_', ' ')}
                        </strong>
                        <span title={e.group}>{e.group}</span>
                        <div>
                          <small>
                            {e.namespace === 'hypixel_ravengard'
                              ? 'RAVENGARD'
                              : e.namespace.toUpperCase()}
                          </small>
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {!filtered.length && (
                <div className="empty">
                  没有符合条件的资源。尝试其他名称或命名空间。
                </div>
              )}
              <div className="pagination">
                <Button
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} /> 上一页
                </Button>
                <span>
                  {page + 1} / {Math.max(1, Math.ceil(filtered.length / 48))}
                </span>
                <Button
                  variant="outline"
                  disabled={(page + 1) * 48 >= filtered.length}
                  onClick={() => setPage(page + 1)}
                >
                  下一页 <ChevronRight size={16} />
                </Button>
              </div>
            </section>
            <footer>
              <span>
                8.29 · {data.totalBytes.toLocaleString()} 字节 ·
                保留全部原始文件
              </span>
              <a href={assetUrl('/coverage-report.json')} target="_blank">
                覆盖校验
              </a>
              <a href={assetUrl('/browser-report.json')} target="_blank">
                逐模型渲染报告
              </a>
              <a href={assetUrl('/branch-report.json')} target="_blank">
                物品与方块状态校验
              </a>
              <a href={assetUrl('/model-report.json')} target="_blank">
                模型校验{report ? ` · ${report.total} 项` : ''}
              </a>
              <button
                onClick={() =>
                  open(data.files.find((e: Entry) => e.path === 'LICENSE'))
                }
              >
                资源许可证
              </button>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
