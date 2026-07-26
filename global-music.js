(() => {
  if (window.__blizzardGlobalMusic) return;
  window.__blizzardGlobalMusic = true;

  const config = window.SUPABASE_CONFIG || {};
  const stateKey = "blizzard-public-playlist-v2";
  const canUseCloud = window.supabase?.createClient
    && typeof config.url === "string"
    && config.url.startsWith("https://")
    && typeof config.publishableKey === "string"
    && config.publishableKey.length > 20;

  if (!canUseCloud) return;

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const initialPlayer = document.querySelector("[data-public-music-player]");
  const player = initialPlayer || new Audio();
  const state = readState();
  let homeTitle = null;
  let homeStatus = null;
  let homePrevious = null;
  let homeNext = null;
  let tracks = [];
  let currentIndex = -1;
  let isLeaving = false;
  let isNavigating = false;
  let lastStoredAt = 0;
  let resumeRequested = false;

  player.preload = "metadata";
  player.loop = false;
  if (Number.isFinite(state.volume)) player.volume = Math.min(1, Math.max(0, state.volume));

  const dock = buildDock();
  const dockTitle = dock.querySelector("[data-global-music-title]");
  const dockStatus = dock.querySelector("[data-global-music-status]");
  const dockPeek = dock.querySelector("[data-global-music-peek]");
  const dockToggle = dock.querySelector("[data-global-music-toggle]");
  const dockPrevious = dock.querySelector("[data-global-music-previous]");
  const dockNext = dock.querySelector("[data-global-music-next]");
  const dockMute = dock.querySelector("[data-global-music-mute]");

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
      // Playback still works when browser storage is unavailable.
    }
  }

  function buildDock() {
    const element = document.createElement("aside");
    element.className = "global-music-dock";
    element.hidden = true;
    element.setAttribute("aria-label", "全站音乐播放器");

    const peek = document.createElement("button");
    peek.type = "button";
    peek.className = "global-music-peek";
    peek.dataset.globalMusicPeek = "";
    peek.setAttribute("aria-label", "展开音乐播放器");
    peek.setAttribute("aria-expanded", "false");
    peek.textContent = "♫";

    const panel = document.createElement("div");
    panel.className = "global-music-panel";

    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "global-music-action";
    previous.dataset.globalMusicPrevious = "";
    previous.setAttribute("aria-label", "上一首");
    previous.textContent = "上一首";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "global-music-toggle";
    toggle.dataset.globalMusicToggle = "";
    toggle.setAttribute("aria-label", "播放音乐");
    toggle.textContent = "播放";

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

    panel.append(previous, toggle, copy, next, mute);
    element.append(peek, panel);
    document.body.append(element);
    return element;
  }

  function bindPageControls() {
    const pagePlayer = document.querySelector("[data-public-music-player]");
    if (pagePlayer && pagePlayer !== player) {
      player.className = pagePlayer.className;
      player.setAttribute("controls", "");
      player.setAttribute("aria-label", pagePlayer.getAttribute("aria-label") || "公开音乐播放器");
      pagePlayer.replaceWith(player);
    }
    homeTitle = document.querySelector("[data-public-music-title]");
    homeStatus = document.querySelector("[data-public-music-status]");
    homePrevious = document.querySelector("[data-public-music-previous]");
    homeNext = document.querySelector("[data-public-music-next]");
    homePrevious?.addEventListener("click", () => chooseTrack(currentIndex - 1, { play: !player.paused, notice: "已切换到上一首。" }));
    homeNext?.addEventListener("click", () => chooseTrack(currentIndex + 1, { play: !player.paused, notice: "已切换到下一首。" }));
    if (tracks.length) renderTrack();
  }

  function setMessage(message) {
    dockStatus.textContent = message;
    if (homeStatus) homeStatus.textContent = message;
  }

  function updateMediaSession(track) {
    if (!("mediaSession" in navigator) || !("MediaMetadata" in window)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || "暴风雪的歌单",
        artist: "暴风雪 · 个人网站",
        album: "Snowfall playlist"
      });
      navigator.mediaSession.setActionHandler("play", () => requestPlay("音乐正在播放。"));
      navigator.mediaSession.setActionHandler("pause", () => player.pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => chooseTrack(currentIndex - 1, { play: true, notice: "已切换到上一首。" }));
      navigator.mediaSession.setActionHandler("nexttrack", () => chooseTrack(currentIndex + 1, { play: true, notice: "已切换到下一首。" }));
    } catch {
      // Media Session is optional and does not affect regular page controls.
    }
  }

  function renderTrack() {
    const track = tracks[currentIndex];
    if (!track) return;
    const title = track.title || "暴风雪的歌单";
    const counter = `${currentIndex + 1} / ${tracks.length}`;
    if (homeTitle) homeTitle.textContent = `NOW PLAYING / ${title} · ${counter}`;
    dockTitle.textContent = title;
    dockToggle.textContent = player.paused ? "播放" : "暂停";
    dockToggle.setAttribute("aria-label", player.paused ? "播放音乐" : "暂停音乐");
    dockMute.textContent = player.muted || player.volume === 0 ? "取消静音" : "静音";
    dockMute.setAttribute("aria-label", dockMute.textContent);
    dock.hidden = false;
    updateMediaSession(track);
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
    const shouldPlay = options.play === true;
    currentIndex = (index + tracks.length) % tracks.length;
    const track = tracks[currentIndex];
    setSource(track, options.resumeAt || 0);
    renderTrack();
    if (shouldPlay) requestPlay(options.notice || "音乐正在播放。");
    else setMessage(options.notice || `已选择第 ${currentIndex + 1} 首，点击播放开始聆听。`);
    storeState(shouldPlay);
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

  async function loadPageModules(nextDocument, destination) {
    const protectedScripts = new Set(["supabase-config.js", "security.js", "global-music.js"]);
    const sources = [...nextDocument.querySelectorAll("script[src]")]
      .map((script) => script.getAttribute("src"))
      .filter(Boolean)
      .filter((source) => !source.startsWith("https://cdn.jsdelivr.net"))
      .filter((source) => !protectedScripts.has(source.split("?")[0]));

    for (const source of sources) {
      const moduleUrl = new URL(source, destination);
      moduleUrl.searchParams.set("blizzard-route", String(Date.now()));
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.type = "module";
        script.src = moduleUrl.href;
        script.onload = resolve;
        script.onerror = reject;
        document.body.append(script);
      });
    }
  }

  function shouldUseSoftNavigation(event, link) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.target || link.hasAttribute("download")) return false;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin) return false;
    if (!destination.pathname.endsWith(".html")) return false;
    if (destination.pathname === location.pathname && destination.hash) return false;
    return true;
  }

  async function navigateWithoutStoppingMusic(url, historyMode = "push") {
    if (isNavigating) return;
    const destination = new URL(url, location.href);
    if (destination.href === location.href) return;
    isNavigating = true;
    storeState();

    try {
      const response = await fetch(destination.href, { headers: { "X-Requested-With": "BlizzardMusicRouter" } });
      if (!response.ok) throw new Error("Navigation request failed");
      const markup = await response.text();
      const nextDocument = new DOMParser().parseFromString(markup, "text/html");
      const nextMain = nextDocument.querySelector("main");
      const nextHeader = nextDocument.querySelector(".site-header");
      const nextFooter = nextDocument.querySelector(".site-footer");
      const currentMain = document.querySelector("main");
      const currentHeader = document.querySelector(".site-header");
      const currentFooter = document.querySelector(".site-footer");
      if (!nextMain || !nextHeader || !nextFooter || !currentMain || !currentHeader || !currentFooter) throw new Error("Navigation shell is incomplete");

      currentHeader.replaceWith(document.importNode(nextHeader, true));
      currentMain.replaceWith(document.importNode(nextMain, true));
      currentFooter.replaceWith(document.importNode(nextFooter, true));
      document.body.className = nextDocument.body.className;
      document.title = nextDocument.title;
      const nextDescription = nextDocument.querySelector('meta[name="description"]')?.getAttribute("content");
      const currentDescription = document.querySelector('meta[name="description"]');
      if (nextDescription && currentDescription) currentDescription.setAttribute("content", nextDescription);
      if (historyMode === "push") history.pushState({ blizzardMusicRoute: true }, "", destination.href);
      bindPageControls();
      await loadPageModules(nextDocument, destination);
      window.scrollTo(0, 0);
      document.dispatchEvent(new CustomEvent("blizzard:page-ready", { detail: { url: destination.href } }));
      if (!player.paused) setMessage("音乐正在播放。");
    } catch {
      window.location.assign(destination.href);
    } finally {
      isNavigating = false;
    }
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
    chooseTrack(currentIndex + 1, { play: true, notice: "当前歌曲结束，正在播放下一首。" });
  });
  player.addEventListener("error", () => {
    setMessage("这首歌暂时无法播放，请切换下一首或稍后重试。");
  });

  dockPeek.addEventListener("click", () => {
    const willOpen = !dock.classList.contains("is-open");
    dock.classList.toggle("is-open", willOpen);
    dockPeek.setAttribute("aria-expanded", String(willOpen));
    dockPeek.setAttribute("aria-label", willOpen ? "收起音乐播放器" : "展开音乐播放器");
  });
  dock.addEventListener("mouseleave", () => {
    if (!dock.matches(":focus-within")) {
      dock.classList.remove("is-open");
      dockPeek.setAttribute("aria-expanded", "false");
      dockPeek.setAttribute("aria-label", "展开音乐播放器");
    }
  });
  dockToggle.addEventListener("click", togglePlayback);
  dockPrevious.addEventListener("click", () => chooseTrack(currentIndex - 1, { play: !player.paused, notice: "已切换到上一首。" }));
  dockNext.addEventListener("click", () => chooseTrack(currentIndex + 1, { play: !player.paused, notice: "已切换到下一首。" }));
  dockMute.addEventListener("click", () => { player.muted = !player.muted; });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !shouldUseSoftNavigation(event, link)) return;
    event.preventDefault();
    void navigateWithoutStoppingMusic(link.href);
  });
  window.addEventListener("popstate", () => { void navigateWithoutStoppingMusic(location.href, "pop"); });
  window.addEventListener("pagehide", () => {
    isLeaving = true;
    storeState(!player.paused);
  });
  window.addEventListener("pageshow", () => { isLeaving = false; });

  bindPageControls();
  void loadPlaylist();
})();
