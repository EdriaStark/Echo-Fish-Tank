# 双设备工作流

WriDNA 使用 GitHub 同步代码，使用浏览器本地存储保存文章。两者必须分开管理。

## 设备职责

| 设备 | 用途 | 不应保存的内容 |
| --- | --- | --- |
| A | 开发、审查、发布 | B 导入的文章、工作台备份、导出报告 |
| B | 使用产品，也可开发 | 不要把文章文件放进仓库目录 |
| GitHub | 代码、文档、发布配置 | 任何用户文章或产品导出 |

## A 上开发，B 上使用

1. 在 A 完成代码改动，提交并推送到 GitHub。
2. 在 B 的仓库目录执行 `git pull --rebase`。
3. 在 B 使用已更新的网站或本地静态预览。
4. 只在 B 的浏览器中导入文章。

文章会留在 B 当前浏览器的 IndexedDB。它不会通过 Git、iCloud 或 WriDNA 自动同步到 A。

## B 上也开发

开始修改前，先同步最新代码：

```bash
git pull --rebase
git switch -c b/<short-change-name>
```

完成后：

```bash
git add <changed-files>
git commit -m "Describe the change"
git push -u origin b/<short-change-name>
```

将分支合并到生产分支后，A 执行 `git pull --rebase`。不要在两台设备同时编辑同一文件的同一段内容。

## 私密数据规则

- 不要在 A 导入 B 的文章。
- 不要把 `.md`、`.txt`、ZIP、`writing-dna-workspace.json` 或 `writing-dna-pre-scan.md` 放入仓库。
- 产品生成的默认备份和报告文件已写入 `.gitignore`，不会被 `git add .` 自动纳入。
- 若需要在设备间转移文章，请手动导出工作台备份，并用你选择的私密传输方式传递。不要提交到 GitHub。
- 若 A 曾导入文章，请在产品内清空工作台，并从浏览器设置中清除该站点数据。

## 发布前检查

```bash
git status
git diff --staged
npm run build
```

确认暂存区只包含应用代码、配置和文档。确认没有文章内容、报告或工作台备份后再推送。
