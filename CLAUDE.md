# AzureWare（Komari 主题）

Minecraft 客户端 ClickGUI 风格的 Komari 监控主题，只有深色外观。

- 数据层（`src/stores`、`src/utils`、`InstanceDetail`、图表）沿用 LiquidBounce 主题；界面在 `src/App.vue`、`src/views/HomeView.vue`、`src/components/azure/`，样式集中在 `src/styles/main.css` 的 `.az-*`。
- 主题设置项在 `komari-theme.json`，读取在 `src/stores/app.ts`（AzureWare 段）。
- 发布：工作区的 `tools/release-theme.sh azureware X.Y.Z`（改版本号 → 构建 → GitHub Release → 安装到线上主题目录）。每个 Release 只能有一个 zip。
