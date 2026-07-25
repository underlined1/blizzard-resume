(() => {
  const section = document.querySelector("[data-public-projects-section]");
  const list = document.querySelector("[data-public-project-list]");
  const config = window.SUPABASE_CONFIG || {};

  if (!section || !list || !window.supabase?.createClient || !config.url || !config.publishableKey) return;

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const imageExtension = /\.(png|jpe?g|webp|gif)$/i;

  const safeLink = (value) => {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch {
      return null;
    }
  };

  const fileUrl = (path) => client.storage.from("site-project-files").getPublicUrl(path).data.publicUrl;

  const createCard = (project) => {
    const card = document.createElement("article");
    card.className = "published-project-card";

    if (project.file_path && imageExtension.test(project.file_name || project.file_path)) {
      const image = document.createElement("img");
      image.src = fileUrl(project.file_path);
      image.alt = `${project.title} 的作品预览`;
      image.loading = "lazy";
      card.append(image);
    } else {
      const fileMark = document.createElement("span");
      fileMark.className = "published-project-mark";
      fileMark.textContent = project.file_path ? "PDF / FILE" : "WORK / NOTE";
      card.append(fileMark);
    }

    const title = document.createElement("h3");
    title.textContent = project.title;
    card.append(title);

    if (project.summary) {
      const summary = document.createElement("p");
      summary.textContent = project.summary;
      card.append(summary);
    }

    const actions = document.createElement("div");
    actions.className = "published-project-actions";
    const externalUrl = safeLink(project.project_url);
    if (externalUrl) {
      const link = document.createElement("a");
      link.className = "text-link";
      link.href = externalUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "打开作品 ↗";
      actions.append(link);
    }
    if (project.file_path) {
      const file = document.createElement("a");
      file.className = "text-link";
      file.href = fileUrl(project.file_path);
      file.target = "_blank";
      file.rel = "noreferrer";
      file.textContent = imageExtension.test(project.file_name || project.file_path) ? "查看原图 ↗" : "查看文件 ↗";
      actions.append(file);
    }
    if (actions.childElementCount) card.append(actions);
    return card;
  };

  const loadProjects = async () => {
    const { data, error } = await client
      .from("site_projects")
      .select("id, title, summary, project_url, file_path, file_name, created_at")
      .order("created_at", { ascending: false });
    if (error || !data?.length) return;
    const fragment = document.createDocumentFragment();
    data.forEach((project) => fragment.append(createCard(project)));
    list.replaceChildren(fragment);
    section.hidden = false;
  };

  void loadProjects();
})();
