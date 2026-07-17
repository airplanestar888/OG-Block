const DEFAULT_API_BASE = "https://og-block.vercel.app";
const BADGE_ID = "base-culture-score-badge";
const MY_SCORE_BADGE_ID = "base-culture-my-score-badge";
const DEBUG_OVERLAY_ID = "base-culture-debug-overlay";
const RESERVED_PATHS = new Set([
  "home",
  "explore",
  "notifications",
  "messages",
  "i",
  "settings",
  "search",
  "compose",
  "intent",
  "share",
  "login",
  "logout"
]);

let activeHandle = "";
let pendingHandle = "";
let myHandle = "";
let pendingMyHandle = "";
let tickPending = false;
let debugEnabled = false;

function createDebugOverlay() {
  if (!debugEnabled) return;
  if (document.getElementById(DEBUG_OVERLAY_ID)) return;

  const overlay = document.createElement("div");
  overlay.id = DEBUG_OVERLAY_ID;
  overlay.style.position = "fixed";
  overlay.style.top = "10px";
  overlay.style.right = "10px";
  overlay.style.zIndex = "9999";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  overlay.style.color = "#00ff00";
  overlay.style.padding = "8px 12px";
  overlay.style.borderRadius = "8px";
  overlay.style.fontSize = "12px";
  overlay.style.fontFamily = "monospace";
  overlay.style.pointerEvents = "none";
  overlay.style.border = "1px solid #00ff00";
  overlay.textContent = "Base Culture: Initializing...";
  document.body.appendChild(overlay);
}

function updateDebugLog(message) {
  if (!debugEnabled) return;
  createDebugOverlay();
  const overlay = document.getElementById(DEBUG_OVERLAY_ID);
  if (overlay) {
    overlay.textContent = `Base Culture: ${message}`;
    console.debug(`[Base Culture Debug] ${message}`);
  }
}

function normalizeHandleFromPath() {
  const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
  if (!firstSegment || RESERVED_PATHS.has(firstSegment.toLowerCase())) return "";
  return firstSegment.replace(/^@/, "").toLowerCase();
}

function findProfileMount() {
  const userNameEl = document.querySelector('[data-testid="UserName"]');
  if (userNameEl) return userNameEl;

  const headerMount = document.querySelector('main [role="heading"][aria-level="1"]');
  if (headerMount) return headerMount.parentElement || headerMount;

  return null;
}

function findProfileStatsMount() {
  const followingLink = document.querySelector('main a[href$="/following"]');
  const followersLink = document.querySelector('main a[href$="/verified_followers"], main a[href$="/followers"]');
  const statNode = followersLink || followingLink;

  let current = statNode?.parentElement || null;
  for (let depth = 0; current && depth < 6; depth += 1) {
    const text = current.textContent || "";
    if (text.includes("Following") && text.includes("Followers")) return current;
    current = current.parentElement;
  }

  return null;
}

function removeBadge() {
  document.getElementById(BADGE_ID)?.remove();
}

function clearProfileState(handle) {
  if (activeHandle === handle) activeHandle = "";
  if (pendingHandle === handle) pendingHandle = "";
}

function clearMyProfileState(handle) {
  if (myHandle === handle) myHandle = "";
  if (pendingMyHandle === handle) pendingMyHandle = "";
}

function createScoreBadge(profile, id) {
  const badge = document.createElement("div");
  badge.id = id;
  badge.dataset.handle = profile.xHandle;
  badge.className = "base-culture-score-badge";

  const label = document.createElement("span");
  label.className = "base-culture-score-label";
  label.textContent = "OG";

  const value = document.createElement("span");
  value.className = "base-culture-score-value";
  value.textContent = String(profile.score);

  badge.append(label, value);

  if (profile.rank) {
    const rank = document.createElement("span");
    rank.className = "base-culture-score-meta";
    rank.textContent = `#${profile.rank}`;
    badge.appendChild(rank);
  }

  if (profile.hasAgentIdentity) {
    const virtual = document.createElement("span");
    virtual.className = "base-culture-score-meta base-culture-score-virtual";
    virtual.textContent = "Virtual IO";
    badge.appendChild(virtual);
  }

  return badge;
}

function renderBadge(profile) {
  const statsMount = findProfileStatsMount();
  const mount = statsMount || findProfileMount();
  if (!mount) {
    updateDebugLog(`❌ Profile mount not found for ${profile.xHandle}`);
    return false;
  }

  const existing = document.getElementById(BADGE_ID);
  if (existing && existing.dataset.handle === profile.xHandle) return true;

  removeBadge();
  const badge = createScoreBadge(profile, BADGE_ID);

  if (statsMount) {
    badge.classList.add("base-culture-score-badge-inline");
    statsMount.appendChild(badge);
  } else if (mount.dataset.testid === "UserName") {
    badge.style.marginTop = "6px";
    mount.appendChild(badge);
  } else {
    badge.style.marginTop = "6px";
    mount.insertAdjacentElement("afterend", badge);
  }

  updateDebugLog(`✅ Rendered badge for ${profile.xHandle}`);
  return true;
}

function renderBadgeWithRetry(profile, attempt = 0) {
  if (renderBadge(profile)) return true;
  if (attempt >= 6) return false;

  setTimeout(() => {
    renderBadgeWithRetry(profile, attempt + 1);
  }, 400);

  return false;
}

async function getApiBase() {
  try {
    const stored = await chrome.storage.sync.get(["apiBaseUrl"]);
    return (stored.apiBaseUrl || DEFAULT_API_BASE).replace(/\/$/, "");
  } catch {
    return DEFAULT_API_BASE;
  }
}

async function loadDebugMode() {
  try {
    const stored = await chrome.storage.sync.get(["debugEnabled"]);
    debugEnabled = Boolean(stored.debugEnabled);
  } catch {
    debugEnabled = false;
  }
}

async function fetchViaBackground(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "FETCH_PROFILE", url }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.success) {
        resolve({ ok: response.ok, status: response.status, data: response.data });
      } else {
        reject(new Error(response?.error || "Unknown background fetch error"));
      }
    });
  });
}

async function fetchProfile(handle) {
  const apiBase = await getApiBase();
  const primaryUrl = `${apiBase}/api/profile/${encodeURIComponent(handle)}`;
  updateDebugLog(`Fetching: ${primaryUrl}...`);

  try {
    return await fetchViaBackground(primaryUrl);
  } catch (error) {
    if (apiBase === DEFAULT_API_BASE) throw error;

    const fallbackUrl = `${DEFAULT_API_BASE}/api/profile/${encodeURIComponent(handle)}`;
    updateDebugLog(`Retrying default backend: ${fallbackUrl}...`);
    return fetchViaBackground(fallbackUrl);
  }
}

async function hydrateBadge(handle) {
  if (!handle || handle === activeHandle || handle === pendingHandle) return;
  pendingHandle = handle;
  removeBadge();

  try {
    const result = await fetchProfile(handle);

    if (result.status === 404) {
      updateDebugLog(`⚠️ User @${handle} not found (404)`);
      clearProfileState(handle);
      return;
    }
    if (!result.ok) {
      throw new Error(`Profile lookup failed: ${result.status}`);
    }

    const profile = result.data;
    if (!profile) {
      throw new Error("Empty profile response");
    }

    updateDebugLog(`✨ Got data for @${handle} (Score: ${profile.score})`);
    renderBadgeWithRetry(profile);
    activeHandle = handle;
  } catch (error) {
    updateDebugLog(`🚨 Error: ${error.message}`);
    clearProfileState(handle);
  } finally {
    if (pendingHandle === handle) pendingHandle = "";
  }
}

function getCurrentUserHandle() {
  const profileLink = document.querySelector('[data-testid="SideNav_AccountHome_Link"]');
  if (profileLink) {
    const href = profileLink.getAttribute("href");
    if (href) return href.replace(/^\//, "").replace(/^@/, "").toLowerCase();
  }
  const navLinks = document.querySelectorAll('nav a[href^="/"]');
  for (const link of navLinks) {
    const href = link.getAttribute("href");
    if (href && !RESERVED_PATHS.has(href.replace("/", "").toLowerCase())) {
      const segments = href.split("/").filter(Boolean);
      if (segments.length === 1) {
        return segments[0].replace(/^@/, "").toLowerCase();
      }
    }
  }
  return null;
}

function renderMyScoreBadge(profile) {
  const navLink = document.querySelector('[data-testid="SideNav_AccountHome_Link"]') || 
                   document.querySelector('nav a[href^="/"]');
  if (!navLink) return false;

  const textElement = navLink.querySelector('span') || navLink;

  const existing = document.getElementById(MY_SCORE_BADGE_ID);
  if (existing && existing.dataset.handle === profile.xHandle) return true;

  document.getElementById(MY_SCORE_BADGE_ID)?.remove();
  const badge = createScoreBadge(profile, MY_SCORE_BADGE_ID);
  badge.style.marginTop = "4px";

  textElement.insertAdjacentElement("afterend", badge);
  updateDebugLog(`✅ Rendered my-score for @${profile.xHandle}`);
  return true;
}

async function updateMyScore() {
  const handle = getCurrentUserHandle();
  if (!handle || handle === myHandle || handle === pendingMyHandle) return;
  pendingMyHandle = handle;

  try {
    const result = await fetchProfile(handle);

    if (result.status === 404) {
      updateDebugLog(`⚠️ My profile @${handle} not found (404)`);
      clearMyProfileState(handle);
      return;
    }
    if (!result.ok) {
      throw new Error(`My profile lookup failed: ${result.status}`);
    }

    const profile = result.data;
    if (!profile) {
      throw new Error("Empty profile response");
    }

    updateDebugLog(`✨ Got my data: @${handle} (Score: ${profile.score})`);
    if (renderMyScoreBadge(profile)) {
      myHandle = handle;
    }
  } catch (error) {
    updateDebugLog(`🚨 Error fetching my score: ${error.message}`);
    clearMyProfileState(handle);
  } finally {
    if (pendingMyHandle === handle) pendingMyHandle = "";
  }
}

function tick() {
  const handle = normalizeHandleFromPath();
  if (!handle) {
    activeHandle = "";
    pendingHandle = "";
    removeBadge();
  } else {
    hydrateBadge(handle);
  }
  updateMyScore();
}

function start() {
  const observer = new MutationObserver(() => {
    if (tickPending) return;
    tickPending = true;
    requestAnimationFrame(() => {
      tick();
      tickPending = false;
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", tick);
  tick();
}

loadDebugMode().finally(start);
