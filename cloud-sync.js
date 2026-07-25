(() => {
  const status = document.querySelector("[data-cloud-status]");
  const loginForm = document.querySelector("[data-cloud-login-form]");
  const loginEmail = document.querySelector("[data-cloud-login-email]");
  const loginPassword = document.querySelector("[data-cloud-login-password]");
  const loginButton = document.querySelector("[data-cloud-login-button]");
  const account = document.querySelector("[data-cloud-account]");
  const cloudUser = document.querySelector("[data-cloud-user]");
  const changeEmailButton = document.querySelector("[data-cloud-change-email]");
  const changeEmailForm = document.querySelector("[data-cloud-email-change-form]");
  const newEmail = document.querySelector("[data-cloud-new-email]");
  const changeEmailSubmit = document.querySelector("[data-cloud-change-email-submit]");
  const cancelEmailChange = document.querySelector("[data-cloud-cancel-email-change]");
  const setPasswordButton = document.querySelector("[data-cloud-set-password]");
  const passwordForm = document.querySelector("[data-cloud-password-form]");
  const newPassword = document.querySelector("[data-cloud-new-password]");
  const confirmPassword = document.querySelector("[data-cloud-confirm-password]");
  const savePassword = document.querySelector("[data-cloud-save-password]");
  const cancelPassword = document.querySelector("[data-cloud-cancel-password]");
  const signOutButton = document.querySelector("[data-cloud-sign-out]");
  const storageKey = "blizzard-calendar-checkins-v1";
  const config = window.SUPABASE_CONFIG || {};
  const isConfigured = typeof config.url === "string" && config.url.startsWith("https://")
    && typeof config.publishableKey === "string" && config.publishableKey.length > 20;

  if (!status) return;

  const setEditingAccess = (canEdit) => {
    document.documentElement.dataset.cloudEditing = canEdit ? "enabled" : "locked";
    window.dispatchEvent(new Event("blizzard:cloud-access-change"));
  };

  const showAccount = (user) => {
    if (user) {
      loginForm.hidden = true;
      account.hidden = false;
      changeEmailForm.hidden = true;
      changeEmailForm.reset();
      passwordForm.hidden = true;
      passwordForm.reset();
      changeEmailButton?.setAttribute("aria-expanded", "false");
      setPasswordButton?.setAttribute("aria-expanded", "false");
      cloudUser.textContent = "已登录：私有账户";
      return;
    }
    loginForm.hidden = false;
    account.hidden = true;
    changeEmailForm.hidden = true;
    changeEmailForm.reset();
    passwordForm.hidden = true;
    passwordForm.reset();
    changeEmailButton?.setAttribute("aria-expanded", "false");
    setPasswordButton?.setAttribute("aria-expanded", "false");
  };

  if (!isConfigured) {
    document.documentElement.dataset.cloudEditing = "local";
    status.textContent = "云端尚未配置：填写 Supabase 项目地址和公开密钥后即可开启同步。";
    return;
  }

  if (!window.supabase?.createClient) {
    setEditingAccess(false);
    status.textContent = "云端同步组件未能加载，请刷新页面后重试。";
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey);
  let activeUser = null;
  let syncing = false;

  const readLocalRecords = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}") || {};
    } catch {
      return {};
    }
  };

  const writeLocalRecords = (records) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(records));
      return true;
    } catch {
      return false;
    }
  };

  const timestamp = (value) => {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const toCloudRow = (date, record) => ({
    user_id: activeUser.id,
    checkin_date: date,
    note: record.note || "",
    checked: Boolean(record.checked)
  });

  const syncInitialRecords = async () => {
    if (!activeUser || syncing) return;
    syncing = true;
    setEditingAccess(false);
    status.textContent = "正在读取你的云端打卡…";

    try {
      const localRecords = readLocalRecords();
      const { data: cloudRows, error: readError } = await client
        .from("study_checkins")
        .select("checkin_date, note, checked, updated_at")
        .eq("user_id", activeUser.id);
      if (readError) throw readError;

      const mergedRecords = { ...localRecords };
      const rowsToUpload = [];
      (cloudRows || []).forEach((row) => {
        const localRecord = localRecords[row.checkin_date];
        if (!localRecord || timestamp(localRecord.updatedAt) <= timestamp(row.updated_at)) {
          mergedRecords[row.checkin_date] = {
            note: row.note || "",
            checked: Boolean(row.checked),
            updatedAt: row.updated_at
          };
        } else {
          rowsToUpload.push(toCloudRow(row.checkin_date, localRecord));
        }
      });

      Object.entries(localRecords).forEach(([date, record]) => {
        if (!(cloudRows || []).some((row) => row.checkin_date === date)) {
          rowsToUpload.push(toCloudRow(date, record));
        }
      });

      if (rowsToUpload.length) {
        const { error: writeError } = await client
          .from("study_checkins")
          .upsert(rowsToUpload, { onConflict: "user_id,checkin_date" });
        if (writeError) throw writeError;
      }

      const before = JSON.stringify(localRecords);
      const after = JSON.stringify(mergedRecords);
      if (before !== after && writeLocalRecords(mergedRecords)) {
        window.location.reload();
        return;
      }

      setEditingAccess(true);
      status.textContent = rowsToUpload.length ? "已把本机记录同步到云端。" : "云端同步已开启，打卡会自动保存。";
    } catch (error) {
      setEditingAccess(false);
      status.textContent = `云端同步失败：${error.message || "请检查 Supabase 配置和权限规则。"}`;
    } finally {
      syncing = false;
    }
  };

  const handleSession = async (session) => {
    activeUser = session?.user || null;
    showAccount(activeUser);
    if (!activeUser) {
      setEditingAccess(false);
      status.textContent = "请用自己的邮箱和密码登录后，再查看和编辑云端学习记录。";
      return;
    }
    await syncInitialRecords();
  };

  const syncOneRecord = async ({ date, record }) => {
    if (!activeUser) return;
    status.textContent = "正在保存到云端…";
    try {
      const request = record
        ? client.from("study_checkins").upsert([toCloudRow(date, record)], { onConflict: "user_id,checkin_date" })
        : client.from("study_checkins").delete().eq("user_id", activeUser.id).eq("checkin_date", date);
      const { error } = await request;
      if (error) throw error;
      status.textContent = "已同步到云端。";
    } catch (error) {
      status.textContent = `本机已保存，但云端同步失败：${error.message || "请稍后重试。"}`;
    }
  };

  window.addEventListener("blizzard:checkin-change", (event) => {
    void syncOneRecord(event.detail);
  });

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = loginEmail.value.trim();
    if (!email) return;
    const password = loginPassword.value;
    if (!password) return;
    loginButton.disabled = true;
    status.textContent = "正在登录…";
    const { error } = await client.auth.signInWithPassword({ email, password });
    loginButton.disabled = false;
    status.textContent = error
      ? "登录失败：请检查邮箱和密码。"
      : "登录成功，正在读取你的云端记录。";
  });

  setPasswordButton?.addEventListener("click", () => {
    if (!activeUser) return;
    const willShow = passwordForm.hidden;
    passwordForm.hidden = !willShow;
    setPasswordButton.setAttribute("aria-expanded", String(willShow));
    status.textContent = willShow
      ? "设置后可直接用邮箱和密码登录，不再发送邮件。"
      : "云端同步已开启，打卡会自动保存。";
    if (willShow) newPassword?.focus();
  });

  cancelPassword?.addEventListener("click", () => {
    passwordForm.hidden = true;
    passwordForm.reset();
    setPasswordButton?.setAttribute("aria-expanded", "false");
    status.textContent = "已取消设置密码。";
  });

  passwordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = newPassword.value;
    if (!activeUser || password.length < 8) return;
    if (password !== confirmPassword.value) {
      status.textContent = "两次输入的密码不一致。";
      return;
    }
    savePassword.disabled = true;
    status.textContent = "正在保存密码…";
    const { error } = await client.auth.updateUser({ password });
    savePassword.disabled = false;
    if (error) {
      status.textContent = `设置密码失败：${error.message}`;
      return;
    }
    passwordForm.hidden = true;
    passwordForm.reset();
    setPasswordButton?.setAttribute("aria-expanded", "false");
    status.textContent = "密码已设置。以后可直接用邮箱和密码登录。";
  });

  changeEmailButton?.addEventListener("click", () => {
    if (!activeUser) return;
    const willShow = changeEmailForm.hidden;
    changeEmailForm.hidden = !willShow;
    changeEmailButton.setAttribute("aria-expanded", String(willShow));
    status.textContent = willShow
      ? "输入新邮箱后，会向新旧邮箱发送确认邮件。"
      : "云端同步已开启，打卡会自动保存。";
    if (willShow) newEmail?.focus();
  });

  cancelEmailChange?.addEventListener("click", () => {
    changeEmailForm.hidden = true;
    changeEmailForm.reset();
    changeEmailButton?.setAttribute("aria-expanded", "false");
    status.textContent = "已取消更换邮箱。";
  });

  changeEmailForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = newEmail.value.trim();
    if (!activeUser || !email) return;
    if (email.toLowerCase() === (activeUser.email || "").toLowerCase()) {
      status.textContent = "新邮箱与当前登录邮箱相同。";
      return;
    }

    changeEmailSubmit.disabled = true;
    status.textContent = "正在发送邮箱更换确认邮件…";
    const { error } = await client.auth.updateUser(
      { email },
      { emailRedirectTo: window.location.href }
    );
    changeEmailSubmit.disabled = false;

    if (error) {
      status.textContent = `更换邮箱失败：${error.message}`;
      return;
    }

    changeEmailForm.hidden = true;
    changeEmailForm.reset();
    changeEmailButton?.setAttribute("aria-expanded", "false");
    status.textContent = "确认邮件已发送到新旧邮箱；请依次打开两封邮件完成更换。";
  });

  signOutButton?.addEventListener("click", async () => {
    signOutButton.disabled = true;
    const { error } = await client.auth.signOut();
    signOutButton.disabled = false;
    status.textContent = error ? `退出失败：${error.message}` : "已退出云端账户。";
  });

  client.auth.onAuthStateChange((_event, session) => {
    void handleSession(session);
  });

  client.auth.getSession().then(({ data }) => {
    void handleSession(data.session);
  });
})();
