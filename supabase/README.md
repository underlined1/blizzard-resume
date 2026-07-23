# Supabase 云端打卡设置

1. 在 Supabase 创建一个新项目。
2. 打开 **SQL Editor**，执行同目录的 `schema.sql`。
3. 在 **Authentication > URL Configuration** 中设置：
   - Site URL：你的 GitHub Pages 首页，例如 `https://用户名.github.io/仓库名/`
   - Redirect URLs：加入 `https://用户名.github.io/仓库名/records.html`
4. 在 **Connect / API Keys** 复制 Project URL 和 **Publishable key**（或旧版 anon key）。不要复制 secret / service_role key。
5. 填入 `../supabase-config.js` 的 `url` 与 `publishableKey` 后提交到 GitHub。
6. 部署后，打开“记录”页面，输入自己的邮箱并点击邮件中的登录链接。登录成功后，数据会同步到云端。

`schema.sql` 的 RLS 规则确保：登录用户只能读取和修改自己 `user_id` 下的记录。即使公开密钥被看到，也无法越权读取其他用户的数据。
