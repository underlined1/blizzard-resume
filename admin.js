(() => {
  const loginPanel = document.querySelector("[data-admin-login-panel]");
  const loginStatus = document.querySelector("[data-admin-login-status]");
  const loginForm = document.querySelector("[data-admin-login-form]");
  const loginEmail = document.querySelector("[data-admin-login-email]");
  const loginPassword = document.querySelector("[data-admin-login-password]");
  const loginButton = document.querySelector("[data-admin-login-button]");
  const passwordRecoveryButton = document.querySelector("[data-admin-password-recovery]");
  const dashboard = document.querySelector("[data-admin-dashboard]");
  const status = document.querySelector("[data-admin-status]");
  const adminUser = document.querySelector("[data-admin-user]");
  const setPasswordButton = document.querySelector("[data-admin-set-password]");
  const passwordForm = document.querySelector("[data-admin-password-form]");
  const newPassword = document.querySelector("[data-admin-new-password]");
  const confirmPassword = document.querySelector("[data-admin-confirm-password]");
  const savePassword = document.querySelector("[data-admin-save-password]");
  const cancelPassword = document.querySelector("[data-admin-cancel-password]");
  const signOutButton = document.querySelector("[data-admin-sign-out]");
  const entryForm = document.querySelector("[data-admin-entry-form]");
  const entryDate = document.querySelector("[data-admin-entry-date]");
  const entryNote = document.querySelector("[data-admin-entry-note]");
  const entryChecked = document.querySelector("[data-admin-entry-checked]");
  const saveEntry = document.querySelector("[data-admin-save-entry]");
  const deleteEntry = document.querySelector("[data-admin-delete-entry]");
  const newEntry = document.querySelector("[data-admin-new-entry]");
  const entryList = document.querySelector("[data-admin-entry-list]");
  const recordCount = document.querySelector("[data-admin-record-count]");
  const musicForm = document.querySelector("[data-admin-music-form]");
  const musicTitle = document.querySelector("[data-admin-music-title]");
  const musicFile = document.querySelector("[data-admin-music-file]");
  const saveMusic = document.querySelector("[data-admin-save-music]");
  const musicStatus = document.querySelector("[data-admin-music-status]");
  const musicPreview = document.querySelector("[data-admin-music-preview]");
  const config = window.SUPABASE_CONFIG || {};
  const isConfigured = typeof config.url === "string" && config.url.startsWith("https://")
    && typeof config.publishableKey === "string" && config.publishableKey.length > 20;

  if (!loginPanel || !isConfigured || !window.supabase?.createClient) {
    if (loginStatus) loginStatus.textContent = "后台尚未完成云端配置，请检查 Supabase 设置后刷新页面。";
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey);
  let activeUser = null;
  let records = [];
  let selectedDate = null;
  let selectedRecordId = null;
  let currentMusic = null;
  let sessionVersion = 0;
  let passwordRecoveryActive = false;

  const hasAdminAccess = async () => {
    const { data, error } = await client.rpc("is_site_admin");
    return { allowed: data === true && !error, error };
  };

  const isoToday = () => {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return localNow.toISOString().slice(0, 10);
  };

  const formatDate = (date) => new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date(`${date}T00:00:00`));

  const setDashboard = (user) => {
    activeUser = user || null;
    loginPanel.hidden = Boolean(activeUser);
    dashboard.hidden = !activeUser;
    passwordForm.hidden = true;
    passwordForm.reset();
    setPasswordButton?.setAttribute("aria-expanded", "false");
    if (activeUser) adminUser.textContent = "已登录：站长账户";
  };

  const createEntryCard = (record) => {
    const article = document.createElement("article");
    article.className = "admin-entry-card";

    const top = document.createElement("div");
    top.className = "admin-entry-card-top";
    const date = document.createElement("strong");
    date.textContent = formatDate(record.checkin_date);
    const badge = document.createElement("span");
    badge.className = record.checked ? "admin-entry-badge is-checked" : "admin-entry-badge";
    badge.textContent = record.checked ? "已打卡" : "仅笔记";
    top.append(date, badge);

    const note = document.createElement("p");
    note.textContent = record.note || "这一天还没有文字记录。";

    const actions = document.createElement("div");
    actions.className = "admin-entry-card-actions";
    const edit = document.createElement("button");
    edit.className = "utility-button";
    edit.type = "button";
    edit.dataset.adminEditDate = record.checkin_date;
    edit.textContent = "编辑";
    const remove = document.createElement("button");
    remove.className = "utility-button";
    remove.type = "button";
    remove.dataset.adminDeleteDate = record.checkin_date;
    remove.textContent = "删除";
    actions.append(edit, remove);
    article.append(top, note, actions);
    return article;
  };

  const renderRecords = () => {
    recordCount.textContent = `${records.length} 条`;
    entryList.replaceChildren();
    if (!records.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty-state";
      empty.textContent = "还没有云端记录。从左侧写下第一条吧。";
      entryList.append(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    records.forEach((record) => fragment.append(createEntryCard(record)));
    entryList.append(fragment);
  };

  const resetEditor = () => {
    selectedDate = null;
    selectedRecordId = null;
    entryForm.reset();
    entryDate.value = isoToday();
    entryChecked.checked = true;
    deleteEntry.hidden = true;
    saveEntry.textContent = "保存到云端";
  };

  const editRecord = (date) => {
    const record = records.find((item) => item.checkin_date === date);
    if (!record) return;
    selectedDate = record.checkin_date;
    selectedRecordId = record.id;
    entryDate.value = record.checkin_date;
    entryNote.value = record.note || "";
    entryChecked.checked = Boolean(record.checked);
    deleteEntry.hidden = false;
    saveEntry.textContent = "更新这条记录";
    entryForm.scrollIntoView({ behavior: "smooth", block: "center" });
    entryNote.focus();
  };

  const fetchRecords = async () => {
    if (!activeUser) return;
    status.textContent = "正在读取你的云端记录…";
    const { data, error } = await client
      .from("study_checkins")
      .select("id, checkin_date, note, checked, updated_at")
      .eq("user_id", activeUser.id)
      .order("checkin_date", { ascending: false });
    if (error) {
      status.textContent = `读取记录失败：${error.message}`;
      return;
    }
    records = data || [];
    renderRecords();
    status.textContent = "云端记录已加载。";
  };

  const deleteRecord = async (date) => {
    if (!activeUser || !date) return;
    const confirmed = window.confirm("确定删除这条记录吗？删除后无法恢复。");
    if (!confirmed) return;
    status.textContent = "正在删除记录…";
    const { error } = await client
      .from("study_checkins")
      .delete()
      .eq("user_id", activeUser.id)
      .eq("checkin_date", date);
    if (error) {
      status.textContent = `删除失败：${error.message}`;
      return;
    }
    if (selectedDate === date) resetEditor();
    await fetchRecords();
    status.textContent = "记录已从云端删除。";
  };

  const activateSession = async (session) => {
    const version = ++sessionVersion;
    const user = session?.user;
    if (!user) {
      passwordRecoveryActive = false;
      setDashboard(null);
      return;
    }

    const { allowed, error } = await hasAdminAccess();
    if (version !== sessionVersion) return;
    if (!allowed) {
      setDashboard(null);
      loginStatus.textContent = error
        ? "后台权限尚未配置，请先执行 Supabase 的 admin-access.sql。"
        : "此账号没有管理后台权限。";
      await client.auth.signOut({ scope: "local" });
      return;
    }

    setDashboard(user);
    resetEditor();
    if (passwordRecoveryActive) {
      passwordForm.hidden = false;
      setPasswordButton?.setAttribute("aria-expanded", "true");
      status.textContent = "请设置新密码。密码和确认密码都会以隐藏字符显示。";
      newPassword.focus();
    }
    void fetchRecords();
    void fetchMusic();
  };

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = loginEmail.value.trim();
    if (!email) return;
    const password = loginPassword.value;
    if (!password) return;
    loginButton.disabled = true;
    loginStatus.textContent = "正在登录…";
    const { error } = await client.auth.signInWithPassword({ email, password });
    loginButton.disabled = false;
    loginStatus.textContent = error
      ? "登录失败：请检查邮箱和密码；若尚未设置密码，请点击忘记密码。"
      : "登录成功，正在进入管理后台。";
  });

  passwordRecoveryButton?.addEventListener("click", async () => {
    const email = loginEmail.value.trim();
    if (!email) {
      loginStatus.textContent = "请先输入登录邮箱，再点击忘记密码。";
      loginEmail.focus();
      return;
    }
    passwordRecoveryButton.disabled = true;
    loginStatus.textContent = "正在发送密码设置邮件…";
    const redirectTo = new URL("records.html", window.location.href).href;
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    passwordRecoveryButton.disabled = false;
    loginStatus.textContent = error
      ? `发送失败：${error.message}`
      : "如该邮箱已注册，密码设置邮件已发送。打开邮件后可设置新密码。";
  });

  setPasswordButton.addEventListener("click", () => {
    if (!activeUser) return;
    const willShow = passwordForm.hidden;
    passwordForm.hidden = !willShow;
    setPasswordButton.setAttribute("aria-expanded", String(willShow));
    status.textContent = willShow
      ? "设置后可直接用邮箱和密码登录，不再发送邮件。"
      : "云端记录已加载。";
    if (willShow) newPassword.focus();
  });

  cancelPassword.addEventListener("click", () => {
    passwordForm.hidden = true;
    passwordForm.reset();
    passwordRecoveryActive = false;
    setPasswordButton.setAttribute("aria-expanded", "false");
    status.textContent = "已取消设置密码。";
  });

  passwordForm.addEventListener("submit", async (event) => {
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
    passwordRecoveryActive = false;
    passwordForm.hidden = true;
    passwordForm.reset();
    setPasswordButton.setAttribute("aria-expanded", "false");
    status.textContent = "密码已设置。以后可直接用邮箱和密码登录。";
  });

  entryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeUser) return;
    const date = entryDate.value;
    if (!date) return;
    saveEntry.disabled = true;
    status.textContent = "正在保存到云端…";
    const changes = {
      checkin_date: date,
      note: entryNote.value.trim(),
      checked: entryChecked.checked
    };
    const request = selectedRecordId
      ? client.from("study_checkins").update(changes).eq("id", selectedRecordId).eq("user_id", activeUser.id)
      : client.from("study_checkins").upsert([{ ...changes, user_id: activeUser.id }], { onConflict: "user_id,checkin_date" });
    const { error } = await request;
    saveEntry.disabled = false;
    if (error) {
      status.textContent = `保存失败：${error.message}`;
      return;
    }
    selectedDate = date;
    await fetchRecords();
    editRecord(date);
    status.textContent = "已保存到云端，日历页面会自动显示这条记录。";
  });

  entryList.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-admin-edit-date]");
    const remove = event.target.closest("[data-admin-delete-date]");
    if (edit) editRecord(edit.dataset.adminEditDate);
    if (remove) void deleteRecord(remove.dataset.adminDeleteDate);
  });

  newEntry.addEventListener("click", resetEditor);
  deleteEntry.addEventListener("click", () => void deleteRecord(selectedDate || entryDate.value));

  const applyMusic = (music) => {
    currentMusic = music || null;
    if (!music?.audio_path) {
      musicStatus.textContent = "还没有发布公开音乐。";
      musicPreview.removeAttribute("src");
      return;
    }
    const { data } = client.storage.from("site-audio").getPublicUrl(music.audio_path);
    musicPreview.src = data.publicUrl;
    musicTitle.value = music.title || "";
    musicStatus.textContent = `当前公开音乐：${music.title || "未命名"}`;
  };

  const fetchMusic = async () => {
    const { data, error } = await client.from("site_music").select("id, owner_id, title, audio_path").eq("id", 1).maybeSingle();
    if (error) {
      musicStatus.textContent = "音乐存储尚未配置，请先执行 site-music.sql。";
      return;
    }
    applyMusic(data);
  };

  musicForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeUser) return;
    const file = musicFile.files?.[0];
    if (!file && !currentMusic) {
      musicStatus.textContent = "请先选择一首音频文件。";
      return;
    }
    if (file && (!file.type.startsWith("audio/") || file.size > 20 * 1024 * 1024)) {
      musicStatus.textContent = "请上传小于 20MB 的音频文件。";
      return;
    }
    saveMusic.disabled = true;
    musicStatus.textContent = "正在上传并发布音乐…";
    let audioPath = currentMusic?.audio_path;
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      audioPath = `${activeUser.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await client.storage.from("site-audio").upload(audioPath, file, { cacheControl: "3600", contentType: file.type });
      if (uploadError) {
        saveMusic.disabled = false;
        musicStatus.textContent = `上传失败：${uploadError.message}`;
        return;
      }
    }
    const title = musicTitle.value.trim() || file?.name || currentMusic?.title || "暴风雪的歌单";
    const { error } = await client.from("site_music").upsert([{
      id: 1, owner_id: activeUser.id, title, audio_path: audioPath
    }], { onConflict: "id" });
    saveMusic.disabled = false;
    if (error) {
      if (file && audioPath) await client.storage.from("site-audio").remove([audioPath]);
      musicStatus.textContent = `发布失败：${error.message}`;
      return;
    }
    if (file && currentMusic?.audio_path && currentMusic.audio_path !== audioPath) {
      await client.storage.from("site-audio").remove([currentMusic.audio_path]);
    }
    musicFile.value = "";
    await fetchMusic();
    musicStatus.textContent = "音乐已发布，首页访客刷新后即可播放。";
  });

  signOutButton.addEventListener("click", async () => {
    signOutButton.disabled = true;
    const { error } = await client.auth.signOut();
    signOutButton.disabled = false;
    loginStatus.textContent = error ? `退出失败：${error.message}` : "已退出管理后台。";
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") passwordRecoveryActive = true;
    void activateSession(session);
  });

  client.auth.getSession().then(({ data }) => {
    void activateSession(data.session);
  });
})();
