(() => {
  const player = document.querySelector("[data-public-music-player]");
  const title = document.querySelector("[data-public-music-title]");
  const status = document.querySelector("[data-public-music-status]");
  const config = window.SUPABASE_CONFIG || {};
  if (!player || !title || !status || !window.supabase?.createClient || !config.url || !config.publishableKey) return;

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const loadMusic = async () => {
    const { data, error } = await client.from("site_music").select("title, audio_path").eq("id", 1).maybeSingle();
    if (error || !data?.audio_path) {
      status.textContent = "站长暂未发布公开音乐。";
      return;
    }
    const { data: urlData } = client.storage.from("site-audio").getPublicUrl(data.audio_path);
    player.src = urlData.publicUrl;
    title.textContent = `NOW PLAYING / ${data.title || "暴风雪的歌单"}`;
    status.textContent = "已加载公开音乐，点击播放键开始聆听。";
  };
  player.addEventListener("play", () => { status.textContent = "音乐正在播放。"; });
  player.addEventListener("error", () => { status.textContent = "音乐暂时无法播放，请稍后刷新重试。"; });
  void loadMusic();
})();
