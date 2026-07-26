document.querySelectorAll("[data-year]").forEach((year) => {
  year.textContent = new Date().getFullYear();
});

const liveClock = document.querySelector("[data-live-clock]");
const liveDate = document.querySelector("[data-live-date]");

if (liveClock && liveDate) {
  const renderClock = () => {
    const now = new Date();
    liveClock.textContent = new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(now);
    liveClock.dateTime = now.toISOString();
    liveDate.textContent = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    }).format(now);
  };

  renderClock();
  window.setInterval(renderClock, 1000);
}

const revealItems = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

if (!("IntersectionObserver" in window) || prefersReducedMotion) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  revealItems.forEach((item) => observer.observe(item));
}

document.querySelectorAll(".mobile-menu").forEach((menu) => {
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => menu.removeAttribute("open"));
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      menu.removeAttribute("open");
      menu.querySelector("summary")?.focus();
    }
  });
});

document.querySelectorAll("[data-copy-email]").forEach((button) => {
  button.addEventListener("click", async () => {
    const email = button.dataset.copyEmail;
    try {
      await navigator.clipboard.writeText(email);
      button.textContent = "已复制邮箱";
      window.setTimeout(() => { button.textContent = "复制邮箱"; }, 1800);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  });
});

const calendarGrid = document.querySelector("[data-calendar-grid]");
const calendarMonth = document.querySelector("[data-calendar-month]");
const calendarPrevious = document.querySelector("[data-calendar-prev]");
const calendarNext = document.querySelector("[data-calendar-next]");
const selectedDateLabel = document.querySelector("[data-selected-date]");
const dailyNote = document.querySelector("[data-daily-note]");
const saveDailyNoteButton = document.querySelector("[data-save-daily-note]");
const checkinButton = document.querySelector("[data-checkin-button]");
const dailyStatus = document.querySelector("[data-daily-status]");
const checkinStreak = document.querySelector("[data-checkin-streak]");
const checkinTotal = document.querySelector("[data-checkin-total]");
const monthCheckinCount = document.querySelector("[data-month-checkin-count]");
const calendarStorageKey = "blizzard-calendar-checkins-v1";
const publicReadOnly = document.body?.dataset.checkinsMode === "public";

if (calendarGrid && calendarMonth && selectedDateLabel && dailyNote && checkinButton && dailyStatus) {
  const getToday = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const dateKey = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  const fromDateKey = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  const sameDay = (first, second) => dateKey(first) === dateKey(second);
  const isFuture = (date) => date > getToday();
  const displayDate = (date) => new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(date);

  let checkins = {};
  if (!publicReadOnly) {
    try {
      checkins = JSON.parse(localStorage.getItem(calendarStorageKey) || "{}") || {};
    } catch {
      checkins = {};
    }
  }

  let selectedDate = getToday();
  let visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

  const saveCheckins = (change = null) => {
    try {
      localStorage.setItem(calendarStorageKey, JSON.stringify(checkins));
      if (change) {
        window.dispatchEvent(new CustomEvent("blizzard:checkin-change", { detail: change }));
      }
      return true;
    } catch {
      dailyStatus.textContent = "浏览器无法保存这次修改，请检查本地存储权限。";
      return false;
    }
  };

  const countStreak = () => {
    let streak = 0;
    const cursor = getToday();
    while (checkins[dateKey(cursor)]?.checked) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  };

  const renderMetrics = () => {
    const checkedDays = Object.values(checkins).filter((entry) => entry?.checked);
    checkinStreak.textContent = countStreak();
    checkinTotal.textContent = checkedDays.length;
    const monthPrefix = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}-`;
    monthCheckinCount.textContent = `本月 ${Object.entries(checkins).filter(([key, entry]) => key.startsWith(monthPrefix) && entry?.checked).length} 天`;
  };

  const renderSelectedDay = () => {
    const key = dateKey(selectedDate);
    const record = checkins[key] || {};
    const future = isFuture(selectedDate);
    const cloudLocked = publicReadOnly || document.documentElement.dataset.cloudEditing === "locked";
    selectedDateLabel.textContent = displayDate(selectedDate);
    dailyNote.value = record.note || "";
    dailyNote.disabled = cloudLocked;
    saveDailyNoteButton.disabled = cloudLocked;
    checkinButton.disabled = future || cloudLocked;
    checkinButton.textContent = cloudLocked ? "登录后同步并打卡" : future ? "未来日期暂不能打卡" : record.checked ? "撤销打卡 ↺" : sameDay(selectedDate, getToday()) ? "今日打卡 ✓" : "为这天打卡 ✓";
    dailyStatus.textContent = publicReadOnly
      ? (record.note || record.checked
        ? "这是公开只读记录：你可以浏览日期与内容，但无法修改。"
        : "这一天没有公开记录；点击其他日期查看。")
      : cloudLocked
      ? "登录后即可查看和编辑自己的云端学习记录。"
      : future
      ? "未来日期可以先写计划，到了当天再打卡。"
      : record.checked
        ? "这一天已经打卡，继续写下收获吧。"
        : "每天的积累，都会留在这张日历上。";
  };

  const renderCalendar = () => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    calendarMonth.textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(visibleMonth);
    calendarGrid.replaceChildren();

    for (let index = 0; index < firstWeekday; index += 1) {
      const emptyCell = document.createElement("span");
      emptyCell.className = "calendar-empty";
      emptyCell.setAttribute("aria-hidden", "true");
      calendarGrid.append(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = dateKey(date);
      const record = checkins[key];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day";
      button.dataset.date = key;
      button.textContent = day;
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `${displayDate(date)}${record?.checked ? "，已打卡" : ""}${record?.note ? "，已有记录" : ""}`);
      button.setAttribute("aria-pressed", String(sameDay(date, selectedDate)));
      if (sameDay(date, getToday())) button.classList.add("is-today");
      if (sameDay(date, selectedDate)) button.classList.add("is-selected");
      if (record?.checked) button.classList.add("is-checked");
      if (record?.note) button.classList.add("has-note");
      if (isFuture(date)) button.classList.add("is-future");
      calendarGrid.append(button);
    }

    renderSelectedDay();
    renderMetrics();
  };

  calendarGrid.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-date]");
    if (!dayButton) return;
    selectedDate = fromDateKey(dayButton.dataset.date);
    renderCalendar();
  });

  calendarPrevious?.addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  calendarNext?.addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  window.addEventListener("blizzard:cloud-access-change", renderCalendar);

  saveDailyNoteButton?.addEventListener("click", () => {
    if (publicReadOnly) return;
    const key = dateKey(selectedDate);
    const previous = checkins[key] || {};
    const note = dailyNote.value.trim();
    if (!note && !previous.checked) {
      delete checkins[key];
    } else {
      checkins[key] = { ...previous, note, updatedAt: new Date().toISOString() };
    }
    if (saveCheckins({ date: key, record: checkins[key] || null })) {
      renderCalendar();
      dailyStatus.textContent = "这一天的文字记录已保存。";
    }
  });

  checkinButton?.addEventListener("click", () => {
    if (publicReadOnly) return;
    if (isFuture(selectedDate)) return;
    const key = dateKey(selectedDate);
    const previous = checkins[key] || {};
    const checked = !previous.checked;
    if (!checked && !previous.note) {
      delete checkins[key];
    } else {
      checkins[key] = { ...previous, checked, updatedAt: new Date().toISOString() };
    }
    if (saveCheckins({ date: key, record: checkins[key] || null })) {
      renderCalendar();
      dailyStatus.textContent = checked ? "打卡成功，今天的坚持已经记下。" : "已撤销这一天的打卡。";
    }
  });

  const loadPublicCheckins = async (attempt = 0) => {
    const config = window.SUPABASE_CONFIG || {};
    const isConfigured = window.supabase?.createClient
      && typeof config.url === "string"
      && config.url.startsWith("https://")
      && typeof config.publishableKey === "string"
      && config.publishableKey.length > 20;
    if (!isConfigured) {
      dailyStatus.textContent = "公开记录暂时无法加载。";
      return;
    }

    dailyStatus.textContent = "正在加载公开打卡记录…";
    const client = window.supabase.createClient(config.url, config.publishableKey);
    const { data, error } = await client.rpc("get_public_checkins");
    if (error) {
      if (attempt === 0) {
        dailyStatus.textContent = "网络较慢，正在重新加载公开记录…";
        window.setTimeout(() => { void loadPublicCheckins(1); }, 1200);
      } else {
        dailyStatus.textContent = "公开记录暂时无法加载，请刷新页面后重试。";
      }
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    checkins = rows.reduce((result, row) => {
      if (typeof row.checkin_date !== "string") return result;
      result[row.checkin_date] = {
        note: typeof row.note === "string" ? row.note : "",
        checked: Boolean(row.checked),
        updatedAt: row.updated_at || ""
      };
      return result;
    }, {});

    if (rows[0]?.checkin_date) {
      selectedDate = fromDateKey(rows[0].checkin_date);
      visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    }
    renderCalendar();
  };

  renderCalendar();
  if (publicReadOnly) {
    void loadPublicCheckins();
    window.addEventListener("online", () => { void loadPublicCheckins(); });
  }
}

const poemText = document.querySelector("[data-poem-text]");
const poemSource = document.querySelector("[data-poem-source]");
const poemButton = document.querySelector("[data-shuffle-poem]");

if (poemText && poemSource && poemButton) {
  const fallbackPoems = [
    ["长风破浪会有时，直挂云帆济沧海。", "李白《行路难》"],
    ["山重水复疑无路，柳暗花明又一村。", "陆游《游山西村》"],
    ["不经一番寒彻骨，怎得梅花扑鼻香。", "黄檗《上堂开示颂》"],
    ["会当凌绝顶，一览众山小。", "杜甫《望岳》"]
  ];
  const poems = Array.isArray(window.BLIZZARD_POEMS) && window.BLIZZARD_POEMS.length >= 50
    ? window.BLIZZARD_POEMS
    : fallbackPoems;
  let poemIndex = 0;

  poemButton.addEventListener("click", () => {
    poemIndex = (poemIndex + 1) % poems.length;
    poemText.textContent = `「${poems[poemIndex][0]}」`;
    poemSource.textContent = `— ${poems[poemIndex][1]}`;
  });
}
