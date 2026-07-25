# Supabase 设置说明

1. 在 Supabase Dashboard 的 **SQL Editor** 依次执行：
   - `schema.sql`：学习/工作打卡表；
   - `admin-access.sql`：将你已登录的网站账户设为唯一后台管理员；
   - `site-music.sql`：后台上传全站音乐（需要时执行）；
   - `site-projects.sql`：后台发布图片、PDF 或链接作品（需要时执行）。
   - `site-interests.sql`：后台设置“关于”页的音乐、阅读介绍（需要时执行）。
   - `site-collections.sql`：后台维护音乐档案、专辑封面与阅读书架（需要时执行）。
2. 执行 `admin-access.sql` 时，只在 Supabase SQL Editor 中把占位邮箱替换为自己的登录邮箱。不要把邮箱写回网站代码或提交到 GitHub。
3. 在 **Authentication > URL Configuration** 中设置：
   - Site URL：`https://用户名.github.io/仓库名/`
   - Redirect URLs：加入 `https://用户名.github.io/仓库名/records.html`
4. 在 **Authentication > Providers > Email** 关闭新用户注册，只保留你已有的账户。
5. 在 **Connect / API Keys** 复制 Project URL 和 **Publishable key** 到 `../supabase-config.js`。绝不使用或提交 `secret` / `service_role` key。
6. 首次设置密码或忘记密码时，在“记录”或“后台”页输入自己的邮箱，点击“忘记密码”，再通过邮件设置密码；之后可直接使用邮箱和密码登录。

`admin-access.sql` 和各功能脚本都使用 RLS：只有站长账号可读写私有打卡、上传音乐或发布作品。作品图片/PDF 被标为公开，是为了让访客能在项目页查看你主动发布的内容。
