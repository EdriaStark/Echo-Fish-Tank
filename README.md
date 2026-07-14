# 写作 DNA 工作台

一个可部署在 GitHub Pages 的纯前端语料整理工具。用户在浏览器内上传 `.md` 或 `.txt` 文章，页面会显示语料数量与字数，并能导出交给 `writing-dna-skill` 分析的 JSON 包。

## 发布到 GitHub Pages

1. 将本目录推送到一个 GitHub 仓库的默认分支。
2. 在仓库 **Settings → Pages** 中选择 **Deploy from a branch**。
3. 选择默认分支与 `/(root)`，保存。
4. 等待 GitHub 生成公开链接。

这是静态网站：上传的文章不会上传到服务器，刷新页面后会被清除。导出的 `writing-dna-corpus.json` 可作为将语料交给 AI 分析的交接包。
