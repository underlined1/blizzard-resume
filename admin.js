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
  const entryNoteCount = document.querySelector("[data-admin-entry-note-count]");
  const recordSearch = document.querySelector("[data-admin-record-search]");
  const recordMonth = document.querySelector("[data-admin-record-month]");
  const recordReset = document.querySelector("[data-admin-record-reset]");
  const recordSummary = document.querySelector("[data-admin-record-summary]");
  const recordLoadMore = document.querySelector("[data-admin-record-load-more]");
  const musicForm = document.querySelector("[data-admin-music-form]");
  const musicTitle = document.querySelector("[data-admin-music-title]");
  const musicFile = document.querySelector("[data-admin-music-file]");
  const saveMusic = document.querySelector("[data-admin-save-music]");
  const newMusic = document.querySelector("[data-admin-new-music]");
  const deleteMusic = document.querySelector("[data-admin-delete-music]");
  const musicStatus = document.querySelector("[data-admin-music-status]");
  const musicPreview = document.querySelector("[data-admin-music-preview]");
  const musicList = document.querySelector("[data-admin-music-list]");
  const projectForm = document.querySelector("[data-admin-project-form]");
  const projectName = document.querySelector("[data-admin-project-name]");
  const projectUrl = document.querySelector("[data-admin-project-url]");
  const projectSummary = document.querySelector("[data-admin-project-summary]");
  const projectFile = document.querySelector("[data-admin-project-file]");
  const projectCurrentFile = document.querySelector("[data-admin-project-current-file]");
  const saveProject = document.querySelector("[data-admin-save-project]");
  const newProject = document.querySelector("[data-admin-new-project]");
  const deleteProjectButton = document.querySelector("[data-admin-delete-project]");
  const projectStatus = document.querySelector("[data-admin-project-status]");
  const projectList = document.querySelector("[data-admin-project-list]");
  const projectCount = document.querySelector("[data-admin-project-count]");
  const interestForm = document.querySelector("[data-admin-interest-form]");
  const interestKey = document.querySelector("[data-admin-interest-key]");
  const interestTitle = document.querySelector("[data-admin-interest-title-input]");
  const interestDescription = document.querySelector("[data-admin-interest-description]");
  const interestHighlight = document.querySelector("[data-admin-interest-highlight]");
  const saveInterest = document.querySelector("[data-admin-save-interest]");
  const interestStatus = document.querySelector("[data-admin-interest-status]");
  const collectionPanels = ["music", "reading"].map((type) => ({
    type,
    element: document.querySelector(`[data-admin-collection-panel="${type}"]`),
    form: document.querySelector(`[data-admin-collection-form="${type}"]`),
    title: document.querySelector(`[data-admin-collection-title="${type}"]`),
    creator: document.querySelector(`[data-admin-collection-creator="${type}"]`),
    category: document.querySelector(`[data-admin-collection-category="${type}"]`),
    link: document.querySelector(`[data-admin-collection-link="${type}"]`),
    note: document.querySelector(`[data-admin-collection-note="${type}"]`),
    quote: document.querySelector(`[data-admin-collection-quote="${type}"]`),
    cover: document.querySelector(`[data-admin-collection-cover="${type}"]`),
    currentCover: document.querySelector(`[data-admin-collection-current-cover="${type}"]`),
    save: document.querySelector(`[data-admin-save-collection="${type}"]`),
    create: document.querySelector(`[data-admin-new-collection="${type}"]`),
    remove: document.querySelector(`[data-admin-delete-collection="${type}"]`),
    status: document.querySelector(`[data-admin-collection-status="${type}"]`),
    list: document.querySelector(`[data-admin-collection-list="${type}"]`),
    count: document.querySelector(`[data-admin-collection-count="${type}"]`),
    selected: null
  }));
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
  let musicTracks = [];
  let selectedMusic = null;
  let projects = [];
  let selectedProject = null;
  let interests = new Map();
  let collections = [];
  let sessionVersion = 0;
  let passwordRecoveryActive = false;
  const archivePageSize = 12;
  let archiveVisibleCount = archivePageSize;

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

  const updateEntryNoteCount = () => {
    if (entryNoteCount && entryNote) entryNoteCount.textContent = `${entryNote.value.length} / 4000 字`;
  };

  const filteredRecords = () => {
    const query = recordSearch?.value.trim().toLocaleLowerCase("zh-CN") || "";
    const month = recordMonth?.value || "";
    return records.filter((record) => {
      const matchesMonth = !month || record.checkin_date.startsWith(month);
      const text = `${record.checkin_date} ${record.note || ""}`.toLocaleLowerCase("zh-CN");
      return matchesMonth && (!query || text.includes(query));
    });
  };

  const updateArchiveControls = (filtered) => {
    if (recordSummary) {
      const shown = Math.min(archiveVisibleCount, filtered.length);
      recordSummary.textContent = filtered.length
        ? `正在显示 ${shown} / ${filtered.length} 条；云端共保存 ${records.length} 条记录。`
        : records.length ? "没有符合当前筛选条件的记录。" : "还没有云端记录，从左侧写下第一条吧。";
    }
    if (recordLoadMore) recordLoadMore.hidden = archiveVisibleCount >= filtered.length;
    if (recordReset) recordReset.hidden = !(recordSearch?.value || recordMonth?.value);
  };

  const validExternalUrl = (value) => {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch {
      return null;
    }
  };

  const projectFileUrl = (path) => client.storage.from("site-project-files").getPublicUrl(path).data.publicUrl;
  const projectMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]);
  const collectionCoverMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
  const defaultInterests = {
    music: {
      title: "音乐",
      description: "给此刻选一首歌，让页面也有自己的节奏。它不需要很响，却能陪着一次次专注、行走与重新出发。",
      highlight: "把耳机戴上，也把世界稍微调低一点。"
    },
    reading: {
      title: "阅读",
      description: "把好奇心放进书页，慢慢认识更大的世界。读完不必急着下结论，重要的是留下自己的问题。",
      highlight: "愿每一次翻页，都带来一小块新的地图。"
    }
  };

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
    remove.dataset.adminDeleteId = record.id;
    remove.textContent = "删除";
    actions.append(edit, remove);
    article.append(top, note, actions);
    return article;
  };

  const renderRecords = () => {
    recordCount.textContent = `${records.length} 条`;
    entryList.replaceChildren();
    const matchingRecords = filteredRecords();
    updateArchiveControls(matchingRecords);
    if (records.length && !matchingRecords.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty-state";
      empty.textContent = "没有找到匹配的记录。试试更换关键词或清除月份筛选。";
      entryList.append(empty);
      return;
    }
    if (!records.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty-state";
      empty.textContent = "还没有云端记录。从左侧写下第一条吧。";
      entryList.append(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    matchingRecords.slice(0, archiveVisibleCount).forEach((record) => fragment.append(createEntryCard(record)));
    entryList.append(fragment);
  };

  const resetEditor = () => {
    selectedDate = null;
    selectedRecordId = null;
    entryForm.reset();
    entryDate.max = isoToday();
    entryDate.value = isoToday();
    entryChecked.checked = true;
    updateEntryNoteCount();
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
    updateEntryNoteCount();
    deleteEntry.hidden = false;
    saveEntry.textContent = "更新这条记录";
    entryForm.scrollIntoView({ behavior: "smooth", block: "center" });
    entryNote.focus();
  };

  const startEntryForDate = () => {
    const date = entryDate.value;
    if (!date || date === selectedDate) return;
    const existing = records.find((item) => item.checkin_date === date);
    if (existing) {
      editRecord(date);
      status.textContent = "已打开这一天已有的记录；保存会更新该日期的内容。";
      return;
    }
    selectedDate = null;
    selectedRecordId = null;
    entryNote.value = "";
    entryChecked.checked = true;
    deleteEntry.hidden = true;
    saveEntry.textContent = "保存为新的云端记录";
    updateEntryNoteCount();
    status.textContent = `正在为 ${formatDate(date)} 新建记录；保存后会写入云端。`;
    entryNote.focus();
  };

  const showCurrentProjectFile = (project) => {
    projectCurrentFile.replaceChildren();
    if (!project?.file_path) {
      projectCurrentFile.hidden = true;
      return;
    }
    const link = document.createElement("a");
    link.href = projectFileUrl(project.file_path);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `当前文件：${project.file_name || "打开查看"} ↗`;
    projectCurrentFile.append(link);
    projectCurrentFile.hidden = false;
  };

  const resetProjectEditor = () => {
    selectedProject = null;
    projectForm.reset();
    saveProject.textContent = "发布作品";
    deleteProjectButton.hidden = true;
    showCurrentProjectFile(null);
  };

  const createProjectCard = (project) => {
    const article = document.createElement("article");
    article.className = "admin-project-entry";
    const top = document.createElement("div");
    top.className = "admin-entry-card-top";
    const title = document.createElement("strong");
    title.textContent = project.title;
    const created = document.createElement("span");
    created.className = "admin-entry-badge";
    created.textContent = new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(project.created_at));
    top.append(title, created);
    article.append(top);

    if (project.summary) {
      const summary = document.createElement("p");
      summary.textContent = project.summary;
      article.append(summary);
    }

    const links = document.createElement("div");
    links.className = "admin-project-links";
    const externalUrl = validExternalUrl(project.project_url);
    if (externalUrl) {
      const link = document.createElement("a");
      link.href = externalUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "作品链接 ↗";
      links.append(link);
    }
    if (project.file_path) {
      const file = document.createElement("a");
      file.href = projectFileUrl(project.file_path);
      file.target = "_blank";
      file.rel = "noreferrer";
      file.textContent = "上传文件 ↗";
      links.append(file);
    }
    if (links.childElementCount) article.append(links);

    const actions = document.createElement("div");
    actions.className = "admin-entry-card-actions";
    const edit = document.createElement("button");
    edit.className = "utility-button";
    edit.type = "button";
    edit.dataset.adminEditProject = project.id;
    edit.textContent = "编辑";
    const remove = document.createElement("button");
    remove.className = "utility-button";
    remove.type = "button";
    remove.dataset.adminDeleteProject = project.id;
    remove.textContent = "删除";
    actions.append(edit, remove);
    article.append(actions);
    return article;
  };

  const renderProjects = () => {
    projectCount.textContent = `${projects.length} 件`;
    projectList.replaceChildren();
    if (!projects.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty-state";
      empty.textContent = "还没有发布作品。用上方表单发布第一个吧。";
      projectList.append(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    projects.forEach((project) => fragment.append(createProjectCard(project)));
    projectList.append(fragment);
  };

  const fetchProjects = async () => {
    if (!activeUser) return;
    const { data, error } = await client
      .from("site_projects")
      .select("id, owner_id, title, summary, project_url, file_path, file_name, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) {
      projectStatus.textContent = "作品功能尚未配置，请先执行 supabase/site-projects.sql。";
      return;
    }
    projects = data || [];
    renderProjects();
    projectStatus.textContent = projects.length ? "已加载已发布的作品。" : "可以发布第一件作品了。";
  };

  const editProject = (id) => {
    const project = projects.find((item) => item.id === id);
    if (!project) return;
    selectedProject = project;
    projectName.value = project.title;
    projectUrl.value = project.project_url || "";
    projectSummary.value = project.summary || "";
    projectFile.value = "";
    saveProject.textContent = "更新作品";
    deleteProjectButton.hidden = false;
    showCurrentProjectFile(project);
    projectForm.scrollIntoView({ behavior: "smooth", block: "center" });
    projectName.focus();
  };

  const renderInterestForm = (key) => {
    const interest = interests.get(key) || defaultInterests[key];
    interestKey.value = key;
    interestTitle.value = interest.title;
    interestDescription.value = interest.description;
    interestHighlight.value = interest.highlight || "";
  };

  const fetchInterests = async () => {
    if (!activeUser) return;
    const { data, error } = await client
      .from("site_interest_profiles")
      .select("section_key, owner_id, title, description, highlight");
    if (error) {
      interestStatus.textContent = "兴趣介绍功能尚未配置，请先执行 supabase/site-interests.sql。";
      return;
    }
    interests = new Map((data || []).map((interest) => [interest.section_key, interest]));
    renderInterestForm(interestKey.value || "music");
    interestStatus.textContent = "已加载关于页的音乐与阅读介绍。";
  };

  const collectionCoverUrl = (path) => client.storage.from("site-collection-covers").getPublicUrl(path).data.publicUrl;

  const showCurrentCollectionCover = (panel, entry) => {
    panel.currentCover.replaceChildren();
    if (!entry?.cover_path) {
      panel.currentCover.hidden = true;
      return;
    }
    const link = document.createElement("a");
    link.href = collectionCoverUrl(entry.cover_path);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `当前封面：${entry.cover_name || "打开查看"} ↗`;
    panel.currentCover.append(link);
    panel.currentCover.hidden = false;
  };

  const resetCollectionEditor = (panel, message) => {
    panel.selected = null;
    panel.form.reset();
    panel.save.textContent = panel.type === "music" ? "保存音乐档案" : "保存阅读档案";
    panel.remove.hidden = true;
    showCurrentCollectionCover(panel, null);
    if (message) panel.status.textContent = message;
  };

  const createCollectionCard = (entry) => {
    const article = document.createElement("article");
    article.className = "admin-collection-entry";
    const top = document.createElement("div");
    top.className = "admin-entry-card-top";
    const title = document.createElement("strong");
    title.textContent = entry.title;
    const badge = document.createElement("span");
    badge.className = `admin-entry-badge ${entry.collection_type === "music" ? "is-checked" : ""}`;
    badge.textContent = entry.collection_type === "music" ? "音乐" : "阅读";
    top.append(title, badge);
    article.append(top);
    const detail = document.createElement("p");
    detail.textContent = [entry.creator, entry.category].filter(Boolean).join(" · ") || "未添加创作者或类型";
    article.append(detail);
    if (entry.note) {
      const note = document.createElement("p");
      note.className = "admin-collection-note";
      note.textContent = entry.note;
      article.append(note);
    }
    const actions = document.createElement("div");
    actions.className = "admin-entry-card-actions";
    const edit = document.createElement("button");
    edit.className = "utility-button";
    edit.type = "button";
    edit.dataset.adminEditCollection = entry.id;
    edit.textContent = "编辑";
    const remove = document.createElement("button");
    remove.className = "utility-button";
    remove.type = "button";
    remove.dataset.adminDeleteCollection = entry.id;
    remove.textContent = "删除";
    actions.append(edit, remove);
    article.append(actions);
    return article;
  };

  const renderCollections = () => {
    collectionPanels.forEach((panel) => {
      const entries = collections.filter((entry) => entry.collection_type === panel.type);
      panel.count.textContent = `${entries.length} 条`;
      panel.list.replaceChildren();
      if (!entries.length) {
        const empty = document.createElement("p");
        empty.className = "admin-empty-state";
        empty.textContent = panel.type === "music"
          ? "还没有音乐档案。把正在循环播放的一首歌放进来吧。"
          : "还没有阅读档案。把正在读或想读的一本书放进来吧。";
        panel.list.append(empty);
        return;
      }
      const fragment = document.createDocumentFragment();
      entries.forEach((entry) => fragment.append(createCollectionCard(entry)));
      panel.list.append(fragment);
    });
  };

  const fetchCollections = async () => {
    if (!activeUser) return;
    const { data, error } = await client
      .from("site_collections")
      .select("id, owner_id, collection_type, title, creator, category, note, quote, external_url, cover_path, cover_name, updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      collectionPanels.forEach((panel) => {
        panel.status.textContent = "收藏档案尚未配置，请先执行 supabase/site-collections.sql。";
      });
      return;
    }
    collections = data || [];
    renderCollections();
    collectionPanels.forEach((panel) => {
      const amount = collections.filter((entry) => entry.collection_type === panel.type).length;
      panel.status.textContent = amount
        ? `已加载 ${amount} 条${panel.type === "music" ? "音乐" : "阅读"}档案。`
        : panel.type === "music" ? "从一首喜欢的歌或一张专辑开始吧。" : "从一本想读的书开始吧。";
    });
  };

  const editCollection = (panel, id) => {
    const entry = collections.find((item) => item.id === id && item.collection_type === panel.type);
    if (!entry) return;
    panel.selected = entry;
    panel.title.value = entry.title;
    panel.creator.value = entry.creator || "";
    panel.category.value = entry.category || "";
    panel.link.value = entry.external_url || "";
    panel.note.value = entry.note || "";
    panel.quote.value = entry.quote || "";
    panel.cover.value = "";
    panel.save.textContent = "更新这条档案";
    panel.remove.hidden = false;
    showCurrentCollectionCover(panel, entry);
    panel.status.textContent = `正在编辑：${entry.title}`;
    panel.form.scrollIntoView({ behavior: "smooth", block: "center" });
    panel.title.focus();
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
    archiveVisibleCount = archivePageSize;
    renderRecords();
    status.textContent = "云端记录已加载。";
  };

  const deleteRecord = async (recordId) => {
    const record = records.find((item) => item.id === recordId);
    if (!activeUser || !record) {
      status.textContent = "找不到要删除的记录，请刷新后重试。";
      return;
    }
    const confirmed = window.confirm(`确定删除 ${formatDate(record.checkin_date)} 的记录吗？删除后无法恢复。`);
    if (!confirmed) return;
    status.textContent = "正在删除记录…";
    const { data, error } = await client
      .from("study_checkins")
      .delete()
      .eq("user_id", activeUser.id)
      .eq("id", record.id)
      .select("id");
    if (error) {
      status.textContent = `删除失败：${error.message}`;
      return;
    }
    if (!data?.some((item) => item.id === record.id)) {
      status.textContent = "这条记录没有被删除。它可能已被修改、没有删除权限，或不属于当前账号；已重新读取云端记录。";
      await fetchRecords();
      return;
    }
    if (selectedRecordId === record.id) resetEditor();
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
    void fetchProjects();
    void fetchInterests();
    void fetchCollections();
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
    if (selectedRecordId && selectedDate !== date && records.some((item) => item.checkin_date === date && item.id !== selectedRecordId)) {
      status.textContent = "该日期已有一条记录；请先在右侧找到它并编辑，避免覆盖原内容。";
      return;
    }
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
    const remove = event.target.closest("[data-admin-delete-id]");
    if (edit) editRecord(edit.dataset.adminEditDate);
    if (remove) void deleteRecord(remove.dataset.adminDeleteId);
  });

  entryNote?.addEventListener("input", updateEntryNoteCount);
  entryDate?.addEventListener("change", startEntryForDate);
  const applyArchiveFilter = () => {
    archiveVisibleCount = archivePageSize;
    renderRecords();
  };
  recordSearch?.addEventListener("input", applyArchiveFilter);
  recordMonth?.addEventListener("change", applyArchiveFilter);
  recordReset?.addEventListener("click", () => {
    if (recordSearch) recordSearch.value = "";
    if (recordMonth) recordMonth.value = "";
    applyArchiveFilter();
  });
  recordLoadMore?.addEventListener("click", () => {
    archiveVisibleCount += archivePageSize;
    renderRecords();
  });

  newEntry.addEventListener("click", resetEditor);
  deleteEntry.addEventListener("click", () => {
    if (!selectedRecordId) {
      status.textContent = "请先从右侧打开一条已有记录，再执行删除。";
      return;
    }
    void deleteRecord(selectedRecordId);
  });

  projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeUser) return;
    const title = projectName.value.trim();
    const summary = projectSummary.value.trim();
    const requestedUrl = projectUrl.value.trim();
    const externalUrl = validExternalUrl(requestedUrl);
    const file = projectFile.files?.[0];
    if (!title) return;
    if (requestedUrl && !externalUrl) {
      projectStatus.textContent = "作品链接需要以 http:// 或 https:// 开头。";
      projectUrl.focus();
      return;
    }
    if (file && (!projectMimeTypes.has(file.type) || file.size > 8 * 1024 * 1024)) {
      projectStatus.textContent = "仅支持 PNG、JPG、WEBP、GIF 或 PDF，文件请小于 8MB。";
      return;
    }

    saveProject.disabled = true;
    projectStatus.textContent = "正在发布作品…";
    const previousFilePath = selectedProject?.file_path || null;
    let filePath = previousFilePath;
    let fileName = selectedProject?.file_name || null;
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      filePath = `${activeUser.id}/works/${Date.now()}-${safeName}`;
      fileName = file.name;
      const { error: uploadError } = await client.storage
        .from("site-project-files")
        .upload(filePath, file, { cacheControl: "3600", contentType: file.type });
      if (uploadError) {
        saveProject.disabled = false;
        projectStatus.textContent = `上传失败：${uploadError.message}`;
        return;
      }
    }

    const details = { title, summary, project_url: externalUrl, file_path: filePath, file_name: fileName };
    const request = selectedProject
      ? client.from("site_projects").update(details).eq("id", selectedProject.id).eq("owner_id", activeUser.id)
      : client.from("site_projects").insert([{ ...details, owner_id: activeUser.id }]);
    const { error } = await request;
    saveProject.disabled = false;
    if (error) {
      if (file && filePath) await client.storage.from("site-project-files").remove([filePath]);
      projectStatus.textContent = error.code === "42P01"
        ? "作品功能尚未配置，请先执行 supabase/site-projects.sql。"
        : `发布失败：${error.message}`;
      return;
    }
    if (file && previousFilePath && previousFilePath !== filePath) {
      await client.storage.from("site-project-files").remove([previousFilePath]);
    }
    resetProjectEditor();
    await fetchProjects();
    projectStatus.textContent = "作品已发布，项目页刷新后即可看到。";
  });

  const deleteProject = async (id) => {
    const project = projects.find((item) => item.id === id);
    if (!project || !activeUser) return;
    if (!window.confirm(`确定删除作品“${project.title}”吗？删除后无法恢复。`)) return;
    projectStatus.textContent = "正在删除作品…";
    const { error } = await client
      .from("site_projects")
      .delete()
      .eq("id", project.id)
      .eq("owner_id", activeUser.id);
    if (error) {
      projectStatus.textContent = `删除失败：${error.message}`;
      return;
    }
    if (project.file_path) await client.storage.from("site-project-files").remove([project.file_path]);
    if (selectedProject?.id === project.id) resetProjectEditor();
    await fetchProjects();
    projectStatus.textContent = "作品已删除。";
  };

  projectList.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-admin-edit-project]");
    const remove = event.target.closest("[data-admin-delete-project]");
    if (edit) editProject(edit.dataset.adminEditProject);
    if (remove) void deleteProject(remove.dataset.adminDeleteProject);
  });
  newProject.addEventListener("click", resetProjectEditor);
  deleteProjectButton.addEventListener("click", () => void deleteProject(selectedProject?.id));

  interestKey.addEventListener("change", () => renderInterestForm(interestKey.value));
  interestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeUser) return;
    const sectionKey = interestKey.value;
    const title = interestTitle.value.trim();
    const description = interestDescription.value.trim();
    const highlight = interestHighlight.value.trim();
    if (!title || !description) return;
    saveInterest.disabled = true;
    interestStatus.textContent = "正在保存介绍…";
    const { error } = await client.from("site_interest_profiles").upsert([{
      section_key: sectionKey,
      owner_id: activeUser.id,
      title,
      description,
      highlight
    }], { onConflict: "section_key" });
    saveInterest.disabled = false;
    if (error) {
      interestStatus.textContent = error.code === "42P01"
        ? "兴趣介绍功能尚未配置，请先执行 supabase/site-interests.sql。"
        : `保存失败：${error.message}`;
      return;
    }
    interests.set(sectionKey, { section_key: sectionKey, owner_id: activeUser.id, title, description, highlight });
    interestStatus.textContent = "已保存；关于页刷新后会显示新内容。";
  });

  const saveCollection = async (panel, event) => {
    event.preventDefault();
    if (!activeUser) return;
    const title = panel.title.value.trim();
    const creator = panel.creator.value.trim();
    const category = panel.category.value.trim();
    const note = panel.note.value.trim();
    const quote = panel.quote.value.trim();
    const requestedUrl = panel.link.value.trim();
    const externalUrl = validExternalUrl(requestedUrl);
    const file = panel.cover.files?.[0];
    if (!title) return;
    if (requestedUrl && !externalUrl) {
      panel.status.textContent = "外部链接需要以 http:// 或 https:// 开头。";
      panel.link.focus();
      return;
    }
    if (file && (!collectionCoverMimeTypes.has(file.type) || file.size > 5 * 1024 * 1024)) {
      panel.status.textContent = "封面仅支持 PNG、JPG、WEBP 或 GIF，文件请小于 5MB。";
      return;
    }
    panel.save.disabled = true;
    panel.status.textContent = `正在保存${panel.type === "music" ? "音乐" : "阅读"}档案…`;
    const previousCoverPath = panel.selected?.cover_path || null;
    let coverPath = previousCoverPath;
    let coverName = panel.selected?.cover_name || null;
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
      coverPath = `${activeUser.id}/covers/${Date.now()}-${safeName || "cover-image"}`;
      coverName = file.name;
      const { error: uploadError } = await client.storage
        .from("site-collection-covers")
        .upload(coverPath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      if (uploadError) {
        panel.save.disabled = false;
        panel.status.textContent = `封面上传失败：${uploadError.message}`;
        return;
      }
    }

    const details = {
      collection_type: panel.type,
      title,
      creator,
      category,
      note,
      quote,
      external_url: externalUrl,
      cover_path: coverPath,
      cover_name: coverName
    };
    const request = panel.selected
      ? client.from("site_collections").update(details).eq("id", panel.selected.id).eq("owner_id", activeUser.id)
      : client.from("site_collections").insert([{ ...details, owner_id: activeUser.id }]);
    const { error } = await request;
    panel.save.disabled = false;
    if (error) {
      if (file && coverPath) await client.storage.from("site-collection-covers").remove([coverPath]);
      panel.status.textContent = error.code === "42P01"
        ? "收藏档案尚未配置，请先执行 supabase/site-collections.sql。"
        : `保存失败：${error.message}`;
      return;
    }
    if (file && previousCoverPath && previousCoverPath !== coverPath) {
      await client.storage.from("site-collection-covers").remove([previousCoverPath]);
    }
    resetCollectionEditor(panel);
    await fetchCollections();
    panel.status.textContent = `已保存，关于页刷新后会显示在你的${panel.type === "music" ? "音乐档案" : "阅读书架"}中。`;
  };

  const deleteCollection = async (panel, id) => {
    const entry = collections.find((item) => item.id === id && item.collection_type === panel.type);
    if (!entry || !activeUser) return;
    if (!window.confirm(`确定删除“${entry.title}”吗？删除后无法恢复。`)) return;
    panel.status.textContent = "正在删除这条档案…";
    const { error } = await client
      .from("site_collections")
      .delete()
      .eq("id", entry.id)
      .eq("owner_id", activeUser.id);
    if (error) {
      panel.status.textContent = `删除失败：${error.message}`;
      return;
    }
    if (entry.cover_path) await client.storage.from("site-collection-covers").remove([entry.cover_path]);
    if (panel.selected?.id === entry.id) resetCollectionEditor(panel);
    await fetchCollections();
    panel.status.textContent = "档案已删除。";
  };

  collectionPanels.forEach((panel) => {
    panel.form.addEventListener("submit", (event) => void saveCollection(panel, event));
    panel.list.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-admin-edit-collection]");
      const remove = event.target.closest("[data-admin-delete-collection]");
      if (edit) editCollection(panel, edit.dataset.adminEditCollection);
      if (remove) void deleteCollection(panel, remove.dataset.adminDeleteCollection);
    });
    panel.create.addEventListener("click", () => resetCollectionEditor(panel, panel.type === "music" ? "正在新建音乐档案。" : "正在新建阅读档案。"));
    panel.remove.addEventListener("click", () => void deleteCollection(panel, panel.selected?.id));
  });

  const firstOpenMusicSlot = () => {
    const used = new Set(musicTracks.map((track) => track.sort_order));
    return Array.from({ length: 10 }, (_, index) => index + 1).find((slot) => !used.has(slot)) || null;
  };

  const resetMusicEditor = (message = "选择一首歌曲即可修改；也可以新建歌曲。") => {
    selectedMusic = null;
    musicTitle.value = "";
    musicFile.value = "";
    musicPreview.removeAttribute("src");
    musicPreview.load();
    deleteMusic.hidden = true;
    musicStatus.textContent = message;
  };

  const renderMusicList = () => {
    musicList.textContent = "";
    if (!musicTracks.length) {
      const empty = document.createElement("p");
      empty.className = "admin-project-status";
      empty.textContent = "还没有歌曲。上传第一首后，它会出现在全站公开播放器中。";
      musicList.append(empty);
      return;
    }
    musicTracks.forEach((track) => {
      const entry = document.createElement("article");
      entry.className = "admin-music-entry";
      const order = document.createElement("span");
      order.className = "admin-music-order";
      order.textContent = String(track.sort_order);
      const name = document.createElement("strong");
      name.textContent = track.title || "未命名歌曲";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "utility-button";
      edit.dataset.adminEditMusic = String(track.id);
      edit.textContent = "修改";
      entry.append(order, name, edit);
      musicList.append(entry);
    });
  };

  const selectMusic = (id, message) => {
    const track = musicTracks.find((item) => String(item.id) === String(id));
    if (!track) {
      resetMusicEditor(message);
      return;
    }
    selectedMusic = track;
    musicTitle.value = track.title || "";
    musicFile.value = "";
    const { data } = client.storage.from("site-audio").getPublicUrl(track.audio_path);
    musicPreview.src = data.publicUrl;
    deleteMusic.hidden = false;
    musicStatus.textContent = message || `正在修改第 ${track.sort_order} 首：${track.title || "未命名歌曲"}`;
  };

  const fetchMusic = async (selectId = selectedMusic?.id) => {
    const { data, error } = await client
      .from("site_music")
      .select("id, owner_id, title, audio_path, sort_order")
      .order("sort_order", { ascending: true })
      .limit(10);
    if (error) {
      musicStatus.textContent = "歌单数据库尚未升级，请在 Supabase 执行 music-playlist-migration.sql。";
      return;
    }
    musicTracks = data || [];
    renderMusicList();
    if (selectId) selectMusic(selectId);
    else resetMusicEditor(musicTracks.length ? `当前已有 ${musicTracks.length} / 10 首歌曲。` : "还没有歌曲，可以从这里上传第一首。");
  };

  const isAudioFile = (file) => {
    if (file.type?.startsWith("audio/")) return true;
    return /\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(file.name || "");
  };

  musicForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeUser) return;
    const file = musicFile.files?.[0];
    if (!selectedMusic && musicTracks.length >= 10) {
      musicStatus.textContent = "歌单已满 10 首。请先删除或修改其中一首。";
      return;
    }
    if (!file && !selectedMusic) {
      musicStatus.textContent = "新建歌曲时，请先选择一个音频文件。";
      return;
    }
    if (file && (!isAudioFile(file) || file.size > 20 * 1024 * 1024)) {
      musicStatus.textContent = "请上传音频文件，且单个文件不能超过 20MB。";
      return;
    }

    saveMusic.disabled = true;
    musicStatus.textContent = "正在安全上传并保存歌曲…";
    const oldPath = selectedMusic?.audio_path;
    let audioPath = oldPath;
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "track-audio";
      audioPath = `${activeUser.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await client.storage.from("site-audio").upload(audioPath, file, {
        cacheControl: "3600",
        contentType: file.type || "audio/mpeg",
        upsert: false
      });
      if (uploadError) {
        saveMusic.disabled = false;
        musicStatus.textContent = `上传失败：${uploadError.message}`;
        return;
      }
    }

    const title = musicTitle.value.trim() || file?.name || selectedMusic?.title || "暴风雪的歌单";
    const payload = {
      owner_id: activeUser.id,
      title,
      audio_path: audioPath,
      sort_order: selectedMusic?.sort_order || firstOpenMusicSlot(),
      updated_at: new Date().toISOString()
    };
    const request = selectedMusic
      ? client.from("site_music").update(payload).eq("id", selectedMusic.id).eq("owner_id", activeUser.id)
      : client.from("site_music").insert(payload);
    const { error } = await request;
    saveMusic.disabled = false;
    if (error) {
      if (file && audioPath) await client.storage.from("site-audio").remove([audioPath]);
      musicStatus.textContent = `保存失败：${error.message}`;
      return;
    }
    if (file && oldPath && oldPath !== audioPath) await client.storage.from("site-audio").remove([oldPath]);
    musicFile.value = "";
    await fetchMusic(selectedMusic?.id);
    musicStatus.textContent = "歌曲已保存，访客刷新后会看到更新后的歌单。";
  });

  musicList.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-admin-edit-music]");
    if (edit) selectMusic(edit.dataset.adminEditMusic);
  });
  newMusic.addEventListener("click", () => {
    if (musicTracks.length >= 10) {
      musicStatus.textContent = "歌单已满 10 首。请先删除或修改其中一首。";
      return;
    }
    resetMusicEditor(`正在新建第 ${firstOpenMusicSlot()} 首歌曲。`);
  });
  deleteMusic.addEventListener("click", async () => {
    if (!selectedMusic || !activeUser) return;
    if (!window.confirm(`确定删除“${selectedMusic.title || "未命名歌曲"}”吗？删除后无法恢复。`)) return;
    deleteMusic.disabled = true;
    musicStatus.textContent = "正在删除歌曲…";
    const track = selectedMusic;
    const { error } = await client.from("site_music").delete().eq("id", track.id).eq("owner_id", activeUser.id);
    deleteMusic.disabled = false;
    if (error) {
      musicStatus.textContent = `删除失败：${error.message}`;
      return;
    }
    await client.storage.from("site-audio").remove([track.audio_path]);
    resetMusicEditor();
    await fetchMusic();
    musicStatus.textContent = "歌曲已删除。";
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
