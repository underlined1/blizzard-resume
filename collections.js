(() => {
  const showcase = document.querySelector("[data-collection-showcase]");
  const config = window.SUPABASE_CONFIG || {};
  if (!showcase || !window.supabase?.createClient || !config.url || !config.publishableKey) return;

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const safeUrl = (value) => {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch {
      return null;
    }
  };
  const coverUrl = (path) => client.storage.from("site-collection-covers").getPublicUrl(path).data.publicUrl;

  const card = (entry) => {
    const article = document.createElement("article");
    article.className = `collection-entry collection-entry-${entry.collection_type}`;
    const cover = document.createElement("div");
    cover.className = "collection-cover";
    if (entry.cover_path) {
      const image = document.createElement("img");
      image.src = coverUrl(entry.cover_path);
      image.alt = `${entry.title} 的封面`;
      image.loading = "lazy";
      cover.append(image);
    } else {
      cover.textContent = entry.collection_type === "music" ? "♫" : "BOOK";
    }
    article.append(cover);

    const meta = document.createElement("p");
    meta.className = "collection-meta";
    meta.textContent = entry.category || (entry.collection_type === "music" ? "PERSONAL LISTENING" : "PERSONAL READING");
    const title = document.createElement("h4");
    title.textContent = entry.title;
    const creator = document.createElement("p");
    creator.className = "collection-creator";
    creator.textContent = entry.creator || (entry.collection_type === "music" ? "未标注音乐人" : "未标注作者");
    article.append(meta, title, creator);

    if (entry.note) {
      const note = document.createElement("p");
      note.className = "collection-note";
      note.textContent = entry.note;
      article.append(note);
    }
    if (entry.quote) {
      const quote = document.createElement("blockquote");
      quote.textContent = `“${entry.quote}”`;
      article.append(quote);
    }
    const external = safeUrl(entry.external_url);
    if (external) {
      const link = document.createElement("a");
      link.className = "text-link";
      link.href = external;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = entry.collection_type === "music" ? "打开听听 ↗" : "打开这本书 ↗";
      article.append(link);
    }
    return article;
  };

  const loadCollections = async () => {
    const { data, error } = await client
      .from("site_collections")
      .select("id, collection_type, title, creator, category, note, quote, external_url, cover_path, cover_name, updated_at")
      .order("updated_at", { ascending: false })
      .limit(12);
    if (error || !data?.length) return;
    ["music", "reading"].forEach((type) => {
      const entries = data.filter((entry) => entry.collection_type === type).slice(0, 6);
      if (!entries.length) return;
      const column = document.querySelector(`[data-collection-column="${type}"]`);
      const list = document.querySelector(`[data-collection-list="${type}"]`);
      if (!column || !list) return;
      const fragment = document.createDocumentFragment();
      entries.forEach((entry) => fragment.append(card(entry)));
      list.replaceChildren(fragment);
      column.hidden = false;
    });
    if (showcase.querySelector("[data-collection-column]:not([hidden])")) showcase.hidden = false;
  };

  void loadCollections();
})();
