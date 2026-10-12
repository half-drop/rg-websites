# Ravengard Wiki — 两个网站

此仓库保存两个独立的 Ravengard 资源 Wiki，分别构建并发布到 GitHub Pages。

| 网站 | 在线地址 | 源码 |
| --- | --- | --- |
| rg-wiki | https://half-drop.github.io/rg-websites/rg-wiki/ | `rg-wiki/wiki-site` |
| gpt5.6sol | https://half-drop.github.io/rg-websites/gpt5.6sol/ | `gpt5.6sol/wiki-site` |

总入口：https://half-drop.github.io/rg-websites/

## 本地构建

需要 Node.js 22.13 或更高版本。

```sh
npm --prefix rg-wiki/wiki-site ci
npm --prefix gpt5.6sol/wiki-site ci
npm run build:pages
```

结果保存在 `_site/`。两个网站各占一个子目录，可以用静态 HTTP 服务预览。
如需改变部署目录，设置 `PAGES_BASE_PATH` 后运行构建；默认是 `/rg-websites`。

## 自动发布

推送到 `main` 后，`.github/workflows/pages.yml` 会检查类型、构建两个网站并统一部署。
仓库的 **Settings → Pages → Source** 使用 **GitHub Actions**。

资源包、图片和音效保留原始目录与名称，相关权利归原作者所有。
依赖、构建缓存、运行日志和本地环境变量不纳入仓库。
