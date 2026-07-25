(() => {
  const config = window.SUPABASE_CONFIG || {};
  if (!window.supabase?.createClient || !config.url || !config.publishableKey) return;

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const loadInterests = async () => {
    const { data, error } = await client
      .from("site_interest_profiles")
      .select("section_key, title, description, highlight")
      .in("section_key", ["music", "reading"]);
    if (error || !data?.length) return;
    data.forEach((interest) => {
      document.querySelectorAll(`[data-interest-title="${interest.section_key}"]`).forEach((node) => {
        node.textContent = interest.title;
      });
      document.querySelectorAll(`[data-interest-description="${interest.section_key}"]`).forEach((node) => {
        node.textContent = interest.description;
      });
      document.querySelectorAll(`[data-interest-highlight="${interest.section_key}"]`).forEach((node) => {
        node.textContent = interest.highlight || "";
        node.hidden = !interest.highlight;
      });
    });
  };
  void loadInterests();
})();
