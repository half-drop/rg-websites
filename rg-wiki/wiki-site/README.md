# Ravengard 8.29 资源百科

在线入口：https://half-drop.github.io/rg-websites/rg-wiki/

GitHub Pages 由仓库根目录的 `.github/workflows/pages.yml` 自动构建发布，推送 main 后更新。`npm run build:pages` 默认使用 `/rg-websites/rg-wiki/` 作为资源路径前缀，可用 `WIKI_BASE_PATH` 指定其他仓库或子目录；`npm run build` 生成根目录版本。静态输出位于 `dist/client`，其中模型、贴图、声音、报告与脚本均随仓库保存，运行时不依赖外部模型网站。

从 GitHub 下载项目后，也可双击项目内的 `启动Wiki.bat`。

双击上级目录的 `Wiki一键启动关闭.bat` 开启本地网站，再次双击关闭。地址为 http://127.0.0.1:3000 。首次缺少构建产物时自动安装依赖并构建。原始资源包保持不变。

完整收录 8,974 个文件，逐文件校验 SHA-256；模型、物品、纹理、声音、语言、装备、字体、方块状态、着色器、纹理图集和包根目录均可检索。条目链接保存在网址的 file 参数中。

模型支持父级继承、纹理别名与 26.2 纹理对象、单轴和多轴旋转、rescale、UV 旋转、方块旋转与 UV 锁定、像素挤出、动画纹理、模板实例、multipart、加权方块状态、物品 condition/select/range_dispatch/composite 和显示变换。光照与树叶环境颜色是 Wiki 预览值；游戏运行状态通过页面控件指定。资源包着色器可查看源文件，不执行 Minecraft 游戏渲染管线。

## 原包已知限制

- 10 个树叶模型是未绑定纹理参数的模板，使用包内树叶实例的纹理展示模板几何，并显示实例来源。
- `hypixel_ravengard:item/decoration/carts/stalls/market_stall_vegetables` 引用 `hypixel_ravengard:item/decoration/carts/stalls/market_stall_fish`，该纹理不在原包内。保留原始几何，以棋盘格标记缺失位置，不能宣称恢复了原始外观。补入正确 PNG 后重跑索引、模型校验及构建即可恢复。
- 透明资源与退化面保留原定义，不伪造可见物体。

## 检查与维护

- `npm run inventory`：重建完整清单并复制原包。
- `npm run models:validate`：文件哈希覆盖、模型继承、纹理和物品分支依赖检查。
- `npm run browser:audit`：开发服务器启动后，以浏览器 WebGL 渲染全部模型并生成缩略图和报告。
- `npm run verify`：静态与类型校验。
- `npm run build`：导出静态网站。
- `npm start`：仅在 127.0.0.1 启动生产静态网站。

浏览器检查脚本使用本机 Codex 随附 Playwright 与 Edge，原版同步脚本使用随附 JSZip。其他机器可替换检查脚本中的 require 路径。普通网站运行不依赖这些检查工具。

`public/coverage-report.json` 保存覆盖校验，`public/model-report.json` 保存源数据依赖与例外，`public/browser-report.json` 保存逐模型 WebGL 渲染结果。原版依赖取自 Mojang 官方 26.2 客户端，来源、SHA-1 和清单保存在 `public/vanilla-source.json`。

这是非官方 Hypixel 相关 Wiki。资源版权归 Hypixel Inc.；完整许可证位于原包 LICENSE。网站不提供未由资源包文本证实的玩法、掉落或数值说明。
