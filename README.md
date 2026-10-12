# 暴风雪的个人网站

一个不依赖构建工具的静态个人网站，适合直接用 GitHub Pages 托管。

## 页面

- `index.html`：首页和总入口
- `projects.html`：项目档案
- `records.html`：使用独立访问密码查看的只读学习与工作记录，含每日古诗
- `about.html`：个人介绍与成长轨迹
- `contact.html`：GitHub 和邮件联系入口

## 首次个性化

1. 在 HTML 文件中，将「暴风雪」改成你的显示名称（如需要）。
2. 在 `contact.html` 中将两处 `your-email@example.com` 改成真实邮箱。
3. 在 `projects.html` 中，用你的真实项目名称、背景、链接和截图替换“下一个项目”等示例内容。
4. 首页的「我的声音角落」可直接上传本地音频播放；音频不会上传到网站。
5. `records.html` 使用独立访问用户名和密码，验证通过后只读查看记录；编辑仍在 `admin.html` 完成。
6. 需要添加社交主页时，可在页脚或 `contact.html` 的联系卡片中追加链接。

## 本地预览

直接双击 `index.html` 即可预览。也可在项目目录运行：

```powershell
python -m http.server 4173
```

然后打开 `http://localhost:4173`。

## 发布到 GitHub Pages

将所有 HTML 文件、`styles.css` 和 `script.js` 上传或提交到 GitHub Pages 仓库的根目录。GitHub 仓库中依次进入 **Settings → Pages**，将发布来源设为 `Deploy from a branch`，再选择 `main` 分支和 `/(root)` 目录并保存。

已启用 GitHub Pages 后，每次更新这些文件并推送到仓库，网页会在短时间内自动更新。

## 将记录设为私密

前端磨砂密码锁只负责界面遮挡，真正的数据返回由 Supabase 函数校验。发布新版网页前，请先在 Supabase Dashboard 的 SQL Editor 执行 `supabase/private-records-migration.sql`。网页 HTML/JavaScript 中不保存明文密码，记录页仅提供只读查看，后台编辑继续使用站长账号。
