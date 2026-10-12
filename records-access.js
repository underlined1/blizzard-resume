(() => {
  const overlay = document.querySelector("[data-records-lock]");
  const privateContent = document.querySelector("[data-records-private-content]");
  const form = document.querySelector("[data-records-lock-form]");
  const usernameInput = document.querySelector("[data-records-lock-username]");
  const passwordInput = document.querySelector("[data-records-lock-password]");
  const submitButton = document.querySelector("[data-records-lock-submit]");
  const status = document.querySelector("[data-records-lock-status]");
  const config = window.SUPABASE_CONFIG || {};
  const isConfigured = typeof config.url === "string" && config.url.startsWith("https://")
    && typeof config.publishableKey === "string" && config.publishableKey.length > 20;

  if (!overlay || !privateContent || !form || !usernameInput || !passwordInput || !submitButton || !status) return;

  const setStatus = (message, state = "idle") => {
    status.textContent = message;
    status.dataset.state = state;
  };

  const lockRecords = (message = "请输入访问用户名和密码。", state = "idle") => {
    document.body.classList.add("records-is-locked");
    overlay.hidden = false;
    privateContent.inert = true;
    privateContent.setAttribute("aria-hidden", "true");
    passwordInput.value = "";
    setStatus(message, state);
  };

  const unlockRecords = (records) => {
    document.body.classList.remove("records-is-locked");
    overlay.hidden = true;
    privateContent.inert = false;
    privateContent.removeAttribute("aria-hidden");
    passwordInput.value = "";
    window.dispatchEvent(new CustomEvent("blizzard:private-records-unlocked", {
      detail: { records: Array.isArray(records) ? records : [] }
    }));
  };

  lockRecords();

  if (!isConfigured || !window.supabase?.createClient) {
    setStatus("安全验证组件未能加载，请刷新页面后重试。", "error");
    return;
  }

  const client = window.BLIZZARD_SUPABASE_CLIENT
    || (window.BLIZZARD_SUPABASE_CLIENT = window.supabase.createClient(config.url, config.publishableKey));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) return;

    submitButton.disabled = true;
    setStatus("正在验证密码…", "busy");
    const { data, error } = await client.rpc("unlock_private_records", {
      p_username: username,
      p_password: password
    });
    submitButton.disabled = false;

    if (error) {
      passwordInput.value = "";
      passwordInput.focus();
      setStatus("暂时无法验证，请稍后再试。", "error");
      return;
    }

    if (!data?.ok) {
      passwordInput.value = "";
      passwordInput.focus();
      setStatus("用户名或密码不正确，请重新输入。", "error");
      return;
    }

    unlockRecords(data.records);
  });
})();
