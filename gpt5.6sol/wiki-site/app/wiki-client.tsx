'use client';

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Boxes, Check, CheckCircle2, ChevronLeft, ChevronRight, Clipboard,
  Code2, Database, ExternalLink, File, FileCode2, FileText, Filter, FolderTree,
  ImageIcon, Languages, Music2, Search, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { siteAssetUrl } from '@/lib/asset-url.mjs';

const ModelViewer = lazy(() => import('@/components/model-viewer'));

type FileRecord = { path: string; name: string; size: number; extension: string; namespace: string; section: string; group: string; hash: string };
type Inventory = { title: string; release: string; sourceFolder: string; packFormat: number; totalFiles: number; totalBytes: number; counts: { namespace: Record<string, number>; section: Record<string, number>; extension: Record<string, number> }; files: FileRecord[] };

const sections = [
  { key: 'items', name: '物品定义', count: 2730, icon: Boxes, note: 'entity · gui · item · ui' },
  { key: 'models', name: '模型', count: 2965, icon: FileCode2, note: '全部支持 3D / 精灵模型加载' },
  { key: 'textures', name: '纹理', count: 2812, icon: ImageIcon, note: '像素纹理、动画帧与界面图集' },
  { key: 'sounds', name: '声音', count: 125, icon: Music2, note: '环境、战斗、音乐与交互音效' },
  { key: 'lang', name: '语言', count: 258, icon: Languages, note: 'Minecraft 与 Ravengard 本地化' },
  { key: 'shaders', name: '着色器', count: 17, icon: Sparkles, note: '核心管线与共享 GLSL' },
];

const pageSize = 50;
const assetUrl = (path: string) => siteAssetUrl(`/pack/${path.split('/').map(encodeURIComponent).join('/')}`);
const formatBytes = (size: number) => size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(2)} MB`;
const fileIcon = (ext: string) => ext === 'png' ? ImageIcon : ext === 'ogg' ? Music2 : ['json', 'mcmeta'].includes(ext) ? Code2 : ext === 'text' ? FileText : File;

export default function WikiClient() {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [query, setQuery] = useState('');
  const [namespace, setNamespace] = useState('all');
  const [section, setSection] = useState('all');
  const [extension, setExtension] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FileRecord | null>(null);
  const [textPreview, setTextPreview] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetch(siteAssetUrl('/inventory.json')).then((res) => res.json() as Promise<Inventory>).then(setInventory); }, []);
  useEffect(() => {
    setTextPreview(''); setCopied(false);
    if (!selected || !['json', 'mcmeta', 'glsl', 'vsh', 'fsh', 'text'].includes(selected.extension)) return;
    fetch(assetUrl(selected.path)).then((res) => res.text()).then((value) => setTextPreview(value.slice(0, 12000))).catch(() => setTextPreview('无法加载文本预览。'));
  }, [selected]);

  const filtered = useMemo(() => {
    if (!inventory) return [];
    const needle = query.trim().toLocaleLowerCase();
    return inventory.files.filter((file) => (!needle || file.path.toLocaleLowerCase().includes(needle)) && (namespace === 'all' || file.namespace === namespace) && (section === 'all' || file.section === section) && (extension === 'all' || file.extension === extension));
  }, [inventory, query, namespace, section, extension]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageFiles = filtered.slice((page - 1) * pageSize, page * pageSize);
  const updateFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };
  const chooseSection = (value: string) => { updateFilter(setSection, value); document.querySelector('#explorer')?.scrollIntoView({ behavior: 'smooth' }); };
  const clearFilters = () => { setQuery(''); setNamespace('all'); setSection('all'); setExtension('all'); setPage(1); };
  const copyPath = async () => { if (!selected) return; await navigator.clipboard.writeText(selected.path); setCopied(true); setTimeout(() => setCopied(false), 1400); };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#08130f]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <a href="#overview" className="flex min-w-0 items-center gap-3"><img src={siteAssetUrl('/pack/pack.png')} alt="Ravengard 资源包图标" className="size-9 [image-rendering:pixelated]" /><div className="min-w-0 leading-tight"><p className="truncate font-semibold tracking-wide text-[#f3e7c1]">RAVENGARD WIKI</p><p className="text-[10px] uppercase tracking-[.18em] text-[#8ba598]">8.29 资源包档案</p></div></a>
          <div className="relative ml-auto hidden w-full max-w-md md:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#809489]" /><Input value={query} onChange={(e) => updateFilter(setQuery, e.target.value)} aria-label="搜索资源" placeholder="搜索 8,974 个资源…" className="h-10 border-white/10 bg-white/5 pl-9 text-[#eaf3ee] placeholder:text-[#71867b]" /></div>
          <Badge variant="outline" className="border-[#d9a84e]/35 bg-[#d9a84e]/10 text-[#f1cb78]">PLAYTEST 0.2.0</Badge>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block"><nav className="sticky top-24 space-y-1 text-sm"><a className="nav-active" href="#overview"><BookOpen />总览</a><a className="nav-link" href="#catalog"><Boxes />内容地图</a><a className="nav-link" href="#explorer"><Search />全量目录</a><a className="nav-link" href="#coverage"><CheckCircle2 />完整性</a><a className="nav-link" href="#structure"><FolderTree />目录结构</a><a className="nav-link" href="#license"><ShieldCheck />许可说明</a></nav></aside>

        <div className="min-w-0 space-y-8">
          <section id="overview" className="hero-panel relative overflow-hidden rounded-2xl border border-[#d9a84e]/20 p-6 sm:p-9">
            <div className="relative z-10 max-w-3xl"><div className="mb-4 flex flex-wrap items-center gap-2"><Badge className="bg-[#d9a84e] text-[#172017]">PACK FORMAT 88</Badge><Badge variant="outline" className="border-white/15 bg-black/10 text-[#b6c7bd]">Hypixel Ravengard</Badge></div><h1 className="text-balance text-3xl font-semibold tracking-tight text-[#fff6da] sm:text-5xl">8.29 资源包全量档案</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[#b8c9bf] sm:text-base">以源目录为唯一依据建立的可检索 Wiki。每一份定义、模型、纹理、声音、语言和着色器文件都进入索引，并保留原始路径与校验摘要。</p><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => document.querySelector('#explorer')?.scrollIntoView({ behavior: 'smooth' })} className="h-10 bg-[#d9a84e] px-4 text-[#132018] hover:bg-[#edc66e]"><Search />浏览全量目录</Button><Button nativeButton={false} render={<a href={siteAssetUrl('/pack/LICENSE')} target="_blank" rel="noreferrer" />} variant="outline" className="h-10 border-white/12 bg-white/4 text-[#d5e0d9]"><FileText />查看许可原文</Button></div></div>
            <img src={siteAssetUrl('/pack/pack.png')} alt="" className="absolute -bottom-8 right-4 size-48 opacity-[.07] [image-rendering:pixelated] sm:right-12 sm:size-64" />
          </section>

          <section id="coverage" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="stat-card"><span>已收录文件</span><strong>{inventory ? inventory.totalFiles.toLocaleString() : '8,974'}</strong><small><CheckCircle2 />与源资源包一致</small></div><div className="stat-card"><span>总容量</span><strong>{inventory ? formatBytes(inventory.totalBytes) : '33.21 MB'}</strong><small>原始资产可直接预览</small></div><div className="stat-card"><span>命名空间</span><strong>2 + root</strong><small>minecraft + hypixel_ravengard</small></div><div className="stat-card"><span>逐文件校验</span><strong>SHA-256</strong><small>每项保留 12 位摘要</small></div></section>

          <section id="catalog" className="rounded-2xl border border-white/8 bg-[#0d1914] p-5 sm:p-7"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow">CONTENT MAP</p><h2 className="mt-1 text-xl font-semibold text-[#f7edcf]">核心资源分区</h2></div><span className="text-xs text-[#758b80]">点击进入筛选</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{sections.map(({ key, name, count, icon: Icon, note }) => <button type="button" onClick={() => chooseSection(key)} key={key} className="group rounded-xl border border-white/7 bg-white/[.025] p-4 text-left transition hover:border-[#d9a84e]/25 hover:bg-white/[.04]"><div className="flex items-center gap-3"><span className="icon-well"><Icon /></span><div className="min-w-0"><h3 className="font-medium text-[#e9e3d1]">{name}</h3><p className="truncate text-xs text-[#82968c]">{note}</p></div><strong className="ml-auto font-mono text-sm text-[#e8bd63]">{count.toLocaleString()}</strong></div></button>)}</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 xl:grid-cols-6">{[['equipment','装备',31],['blockstates','方块状态',27],['font','字体',4],['atlases','图集',1],['sounds.json','声音清单',1],['metadata','根元数据',3]].map(([key,label,count]) => <button type="button" key={key} onClick={() => chooseSection(String(key))} className="rounded-lg border border-white/6 bg-black/10 px-3 py-2 text-left text-[#8fa298] hover:text-[#dfc887]">{label}<b className="float-right font-mono text-[#b7a269]">{count}</b></button>)}</div></section>

          <section id="explorer" className="scroll-mt-24 rounded-2xl border border-white/8 bg-[#0b1611]">
            <div className="border-b border-white/8 p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">COMPLETE INVENTORY</p><h2 className="mt-1 text-xl font-semibold text-[#f7edcf]">全量资产目录</h2><p className="mt-1 text-sm text-[#83978c]">所有 8,974 个源文件均可搜索、筛选、预览与核验。</p></div><Badge variant="outline" className="border-[#65b783]/25 bg-[#65b783]/8 text-[#85c99e]"><CheckCircle2 /> 0 项遗漏</Badge></div><div className="mt-5 grid gap-2 md:grid-cols-[minmax(220px,1fr)_180px_150px_130px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#789084]" /><Input value={query} onChange={(e) => updateFilter(setQuery, e.target.value)} placeholder="按名称或完整路径搜索" className="h-10 border-white/10 bg-white/[.035] pl-9" /></div><label className="sr-only" htmlFor="namespace">命名空间</label><select id="namespace" value={namespace} onChange={(e) => updateFilter(setNamespace, e.target.value)} className="filter-select"><option value="all">全部命名空间</option>{inventory && Object.keys(inventory.counts.namespace).map((value) => <option key={value}>{value}</option>)}</select><label className="sr-only" htmlFor="section">分区</label><select id="section" value={section} onChange={(e) => updateFilter(setSection, e.target.value)} className="filter-select"><option value="all">全部分区</option>{inventory && Object.keys(inventory.counts.section).map((value) => <option key={value}>{value}</option>)}</select><label className="sr-only" htmlFor="extension">格式</label><select id="extension" value={extension} onChange={(e) => updateFilter(setExtension, e.target.value)} className="filter-select"><option value="all">全部格式</option>{inventory && Object.keys(inventory.counts.extension).map((value) => <option key={value}>{value}</option>)}</select><Button variant="ghost" onClick={clearFilters} className="h-10 text-[#83978c]"><X />重置</Button></div></div>

            <div className="grid min-h-[620px] xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 border-white/8 xl:border-r"><div className="flex h-11 items-center border-b border-white/7 px-4 text-xs text-[#7f9388]"><Filter className="mr-2 size-3.5" />匹配 <b className="mx-1 font-mono text-[#d8c084]">{inventory ? filtered.length.toLocaleString() : '…'}</b> 项<span className="ml-auto">第 {page} / {totalPages} 页</span></div><div className="divide-y divide-white/[.055]">{!inventory && <div className="grid h-64 place-items-center text-sm text-[#71867b]">正在读取完整索引…</div>}{inventory && pageFiles.length === 0 && <div className="grid h-64 place-items-center text-center text-sm text-[#71867b]"><div><Search className="mx-auto mb-3 size-6" />没有匹配项<br /><button className="mt-2 text-[#d8ae58]" onClick={clearFilters}>清除筛选</button></div></div>}{pageFiles.map((file) => { const Icon = fileIcon(file.extension); return <button type="button" onClick={() => setSelected(file)} key={file.path} className={`grid w-full grid-cols-[32px_minmax(0,1fr)_70px] items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[.035] ${selected?.path === file.path ? 'bg-[#d9a84e]/7' : ''}`}><span className="file-icon"><Icon /></span><span className="min-w-0"><span className="block truncate text-sm text-[#d8dfda]">{file.name}</span><span className="block truncate font-mono text-[10px] text-[#6f8378]">{file.path}</span></span><span className="text-right"><Badge variant="outline" className="border-white/8 bg-white/[.025] font-mono text-[9px] uppercase text-[#87988f]">{file.extension}</Badge><small className="mt-1 block text-[9px] text-[#687b71]">{formatBytes(file.size)}</small></span></button>; })}</div><div className="flex h-14 items-center justify-between border-t border-white/7 px-4"><span className="text-[11px] text-[#71867b]">每页 {pageSize} 项</span><div className="flex items-center gap-1"><Button size="icon-sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="上一页"><ChevronLeft /></Button><span className="min-w-16 text-center font-mono text-xs text-[#9daf9f]">{page} / {totalPages}</span><Button size="icon-sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} aria-label="下一页"><ChevronRight /></Button></div></div></div>

              <aside className="min-w-0 bg-black/10 p-5">{!selected ? <div className="grid h-full min-h-72 place-items-center text-center"><div><File className="mx-auto mb-3 size-8 text-[#475c51]" /><h3 className="text-sm font-medium text-[#9aac9f]">选择一个文件</h3><p className="mt-1 max-w-52 text-xs leading-5 text-[#66796f]">查看路径、命名空间、大小、摘要以及支持的原始内容预览。</p></div></div> : <div className="sticky top-24 space-y-5"><div><div className="mb-2 flex items-center justify-between"><Badge className="bg-[#d9a84e]/12 text-[#e5bd68]">{selected.section}</Badge><button onClick={() => setSelected(null)} aria-label="关闭详情" className="text-[#6e8277] hover:text-white"><X className="size-4" /></button></div><h3 className="break-all text-base font-medium text-[#eee7d5]">{selected.name}</h3><p className="mt-2 break-all font-mono text-[10px] leading-5 text-[#72867b]">{selected.path}</p></div>{selected.section === 'models' && selected.extension === 'json' && <Suspense fallback={<div className="grid h-72 place-items-center rounded-xl border border-white/8 text-xs text-[#81958a]">载入模型查看器…</div>}><ModelViewer modelPath={selected.path} /></Suspense>}{selected.extension === 'png' && <div className="preview-checker grid min-h-44 place-items-center overflow-hidden rounded-xl border border-white/8 p-4"><img src={assetUrl(selected.path)} alt={selected.name} className="max-h-64 max-w-full object-contain [image-rendering:pixelated]" /></div>}{selected.extension === 'ogg' && <div className="rounded-xl border border-white/8 bg-white/[.025] p-4"><Music2 className="mb-4 size-7 text-[#d9a84e]" /><audio controls src={assetUrl(selected.path)} className="h-9 w-full" /></div>}{textPreview && <details className="rounded-xl border border-white/8 bg-[#06100b]"><summary className="cursor-pointer px-3 py-2 text-[10px] text-[#8fa398]">查看 JSON / 文本源码</summary><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all border-t border-white/7 p-3 font-mono text-[10px] leading-5 text-[#9eb2a6]">{textPreview}</pre></details>}<dl className="grid grid-cols-[90px_1fr] gap-y-2 text-xs"><dt>命名空间</dt><dd>{selected.namespace}</dd><dt>分区 / 组</dt><dd>{selected.section} / {selected.group}</dd><dt>大小</dt><dd>{formatBytes(selected.size)}</dd><dt>SHA-256</dt><dd className="font-mono text-[#d0ae65]">{selected.hash}…</dd></dl><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={copyPath} className="border-white/10 bg-white/[.025]"><Clipboard />{copied ? '已复制' : '复制路径'}</Button><Button nativeButton={false} render={<a href={assetUrl(selected.path)} target="_blank" rel="noreferrer" />} variant="outline" className="border-white/10 bg-white/[.025]"><ExternalLink />打开原文件</Button></div></div>}</aside>
            </div>
          </section>

          <section id="structure" className="grid scroll-mt-24 gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-white/8 bg-[#0d1914] p-5 sm:p-7"><p className="eyebrow">SOURCE STRUCTURE</p><h2 className="mt-1 text-xl font-semibold text-[#f7edcf]">命名空间与目录</h2><div className="mt-5 space-y-3"><div className="namespace-row"><Database /><div><b>hypixel_ravengard</b><span>自定义物品、模型、纹理、声音、字体与语言</span></div><strong>8,469</strong></div><div className="namespace-row"><Database /><div><b>minecraft</b><span>原版覆盖：方块状态、模型、语言、着色器与纹理</span></div><strong>502</strong></div><div className="namespace-row"><FolderTree /><div><b>pack root</b><span>pack.mcmeta、pack.png 与 LICENSE</span></div><strong>3</strong></div></div></div><div className="rounded-2xl border border-white/8 bg-[#0d1914] p-5 sm:p-7"><p className="eyebrow">FORMAT LEDGER</p><h2 className="mt-1 text-xl font-semibold text-[#f7edcf]">文件格式账本</h2><div className="mt-5 grid grid-cols-2 gap-2">{Object.entries(inventory?.counts.extension ?? { json: 6017, png: 2641, mcmeta: 173, ogg: 125, glsl: 11, vsh: 4, fsh: 2, text: 1 }).map(([ext,count]) => <button type="button" onClick={() => { updateFilter(setExtension, ext); document.querySelector('#explorer')?.scrollIntoView({ behavior: 'smooth' }); }} key={ext} className="format-row"><span>.{ext}</span><strong>{count.toLocaleString()}</strong></button>)}</div></div></section>

          <section id="license" className="scroll-mt-24 rounded-2xl border border-[#67a983]/20 bg-[#67a983]/5 p-5 sm:p-7"><div className="flex gap-4"><ShieldCheck className="mt-1 size-6 shrink-0 text-[#74bd91]" /><div><p className="eyebrow !text-[#63a77f]">LICENSE · VERSION 1.0</p><h2 className="mt-1 text-xl font-semibold text-[#e2eee7]">许可与使用边界</h2><p className="mt-3 text-sm leading-7 text-[#abc0b4]">资源包版权归 Hypixel Inc. 所有。许可允许在 Hypixel、其他服务器或单人世界中使用，允许个人修改，也允许制作与分享视频、直播、截图、缩略图、指南、Wiki、评测及粉丝创作，并可通过常见创作者收入方式变现。</p><p className="mt-3 text-sm leading-7 text-[#abc0b4]">不得出售资源包或资产、不得收费提供访问、不得用于自己的商业产品或服务，也不得宣称资源包归自己所有或暗示 Hypixel 为项目背书。本站是非官方资料档案。</p><Button nativeButton={false} render={<a href={siteAssetUrl('/pack/LICENSE')} target="_blank" rel="noreferrer" />} variant="outline" className="mt-5 border-[#67a983]/25 bg-[#67a983]/8 text-[#b7d3c2]"><FileText />阅读完整英文许可原文<ExternalLink /></Button></div></div></section>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/7 py-6 text-[11px] text-[#667a70]"><p>基于本地 8.29 源目录生成 · 非 Hypixel 官方网站</p><p className="flex items-center gap-1.5"><Check className="size-3 text-[#65b783]" />8,974 / 8,974 文件已建档</p></footer>
        </div>
      </div>
    </main>
  );
}
