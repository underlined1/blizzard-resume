(() => {
  const config = window.SUPABASE_CONFIG || {};
  const stateKey = "blizzard-public-playlist-v1";
  const canUseCloud = window.supabase?.createClient
    && typeof config.url === "string"
    && config.url.startsWith("https://")
    && typeof config.publishableKey === "string"
    && config.publishableKey.length > 20;

  if (!canUseCloud) return;

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const homePlayer = document.querySelector("[data-public-music-player]");
  const homeTitle = document.querySelector("[data-public-music-title]");
  const homeStatus = document.querySelector("[data-public-music-status]");
  const homeNext = document.querySelector("[data-public-music-next]");
  const player = homePlayer || new Audio();
  const state = readState();
  let tracks = [];
  let currentIndex = -1;
  let isLeaving = false;
  let lastStoredAt = 0;
  let resumeRequested = false;

  const dock = buildDock();
  const dockTitle = dock.querySelector("[data-global-music-title]");
  const dockStatus = dock.querySelector("[data-global-music-status]");
  const dockToggle = dock.querySelector("[data-global-music-toggle]");
  const dockNext = dock.querySelector("[data-global-music-next]");
  const dockMute = dock.querySelector("[data-global-music-mute]");

  player.preload = "metadata";
  if (Number.isFinite(state.volume)) player.volume = Math.min(1, Math.max(0, state.volume));

  function readState() {
    try {
      const value = JSON.parse(sessionStorage.getItem(stateKey) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  }

  function storeState(forcePlaying) {
    const track = tracks[currentIndex];
    if (!track) return;
    try {
      sessionStorage.setItem(stateKey, JSON.stringify({
        trackId: track.id,
        time: Number.isFinite(player.currentTime) ? player.currentTime : 0,
        wasPlaying: typeof forcePlaying === "boolean" ? forcePlaying : !player.paused,
        volume: player.volume
      }));
    } catch {
      // Storage may be disabled by the visitor. Playback still works on this page.
    }
  }

  function buildDock() {
    const element = document.createElement("aside");
    element.className = "global-music-dock";
    element.hidden = true;
    element.setAttribute("aria-label", "全站音乐播放器");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "global-music-toggle";
    toggle.dataset.globalMusicToggle = "";
    toggle.setAttribute("aria-label", "播放音乐");
    toggle.textContent = "▶";

    const copy = document.createElement("div");
    copy.className = "global-music-copy";
    const title = document.createElement("strong");
    title.dataset.globalMusicTitle = "";
    const status = document.createElement("span");
    status.dataset.globalMusicStatus = "";
    status.setAttribute("aria-live", "polite");
    copy.append(title, status);

    const next = document.createElement("button");
    next.type = "button";
    next.className = "global-music-action";
    next.dataset.globalMusicNext = "";
    next.setAttribute("aria-label", "下一首");
    next.textContent = "下一首";

    const mute = document.createElement("button");
    mute.type = "button";
    mute.className = "global-music-action";
    mute.dataset.globalMusicMute = "";
    mute.setAttribute("aria-label", "静音");
    mute.textContent = "静音";

    element.append(toggle, copy, next, mute);
    document.body.append(element);
    return element;
  }

  function setMessage(message) {
    if (dockStatus) dockStatus.textContent = message;
    if (homeStatus) homeStatus.textContent = message;
  }

  function renderTrack() {
    const track = tracks[currentIndex];
    if (!track) return;
    const title = track.title || "暴风雪的歌单";
    const counter = `${currentIndex + 1} / ${tracks.length}`;
    if (homeTitle) homeTitle.textContent = `NOW PLAYING / ${title} · ${counter}`;
    dockTitle.textContent = title;
    dockToggle.textContent = player.paused ? "▶" : "Ⅱ";
    dockToggle.setAttribute("aria-label", player.paused ? "播放音乐" : "暂停音乐");
    dockMute.textContent = player.muted || player.volume === 0 ? "取消静音" : "静音";
    dockMute.setAttribute("aria-label", dockMute.textContent);
    if (!homePlayer) dock.hidden = false;
  }

  function setSource(track, resumeAt = 0) {
    const { data } = client.storage.from("site-audio").getPublicUrl(track.audio_path);
    player.src = data.publicUrl;
    player.load();
    const restorePosition = () => {
      if (resumeAt > 0 && Number.isFinite(player.duration)) {
        player.currentTime = Math.min(resumeAt, Math.max(0, player.duration - 0.25));
      }
    };
    player.addEventListener("loadedmetadata", restorePosition, { once: true });
  }

  function chooseTrack(index, options = {}) {
    if (!tracks.length) return;
    currentIndex = (index + tracks.length) % tracks.length;
    const track = tracks[currentIndex];
    setSource(track, options.resumeAt || 0);
    renderTrack();
    if (options.play) requestPlay(options.notice || "音乐正在播放。");
    else setMessage(options.notice || `已选择第 ${currentIndex + 1} 首，点击播放开始聆听。`);
    storeState(Boolean(options.play));
  }

  function requestPlay(notice) {
    player.play().then(() => {
      resumeRequested = false;
      setMessage(notice || "音乐正在播放。");
    }).catch(() => {
      resumeRequested = true;
      setMessage("浏览器需要你点一下播放按钮，音乐会从上次进度继续。");
      renderTrack();
    });
  }

  function togglePlayback() {
    if (!tracks.length) return;
    if (player.paused) requestPlay(resumeRequested ? "已继续播放。" : "音乐正在播放。");
    else player.pause();
  }

  async function loadPlaylist() {
    const { data, error } = await client
      .from("site_music")
      .select("id, title, audio_path, sort_order")
      .order("sort_order", { ascending: true })
      .limit(10);

    if (error) {
      if (homeStatus) homeStatus.textContent = "音乐歌单尚未升级，请站长执行音乐数据库迁移。";
      return;
    }
    tracks = (data || []).filter((track) => track.audio_path);
    if (!tracks.length) {
      if (homeStatus) homeStatus.textContent = "站长暂未发布公开音乐。";
      return;
    }

    const savedIndex = tracks.findIndex((track) => String(track.id) === String(state.trackId));
    const useSaved = savedIndex >= 0;
    chooseTrack(useSaved ? savedIndex : 0, {
      resumeAt: useSaved ? Number(state.time) || 0 : 0,
      play: useSaved && state.wasPlaying === true,
      notice: useSaved && state.wasPlaying ? "正在恢复上一页的播放进度…" : "歌单已加载，点击播放键开始聆听。"
    });
  }

  player.addEventListener("play", () => {
    renderTrack();
    setMessage("音乐正在播放。");
    storeState(true);
  });
  player.addEventListener("pause", () => {
    renderTrack();
    if (!isLeaving && !player.ended) {
      setMessage("已暂停播放。");
      storeState(false);
    }
  });
  player.addEventListener("timeupdate", () => {
    if (Date.now() - lastStoredAt > 2000) {
      lastStoredAt = Date.now();
      storeState();
    }
  });
  player.addEventListener("volumechange", () => {
    renderTrack();
    storeState();
  });
  player.addEventListener("ended", () => {
    if (tracks.length > 1) chooseTrack(currentIndex + 1, { play: true, notice: "正在播放下一首。" });
    else {
      player.currentTime = 0;
      storeState(false);
      setMessage("这一首播放完了。点击播放键可再听一次。");
    }
  });
  player.addEventListener("error", () => {
    setMessage("这首歌暂时无法播放，请切换下一首或稍后重试。");
  });

  dockToggle.addEventListener("click", togglePlayback);
  dockNext.addEventListener("click", () => chooseTrack(currentIndex + 1, { play: !player.paused, notice: "已切换到下一首。" }));
  dockMute.addEventListener("click", () => { player.muted = !player.muted; });
  if (homeNext) homeNext.addEventListener("click", () => chooseTrack(currentIndex + 1, { play: !player.paused, notice: "已切换到下一首。" }));

  window.addEventListener("pagehide", () => {
    isLeaving = true;
    storeState(!player.paused);
  });
  window.addEventListener("pageshow", () => { isLeaving = false; });

  void loadPlaylist();
})();
