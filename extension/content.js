const DEFAULT_API_BASE = "http://localhost:3000";
const BADGE_ID = "base-culture-score-badge";
const RESERVED_PATHS = new Set(["home", "explore", "notifications", "messages", "i", "settings", "search", "compose"]);

let activeHandle = "";
let activeAbort = null;

function normalizeHandleFromPath() {
  const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
  if (!firstSegment || RESERVED_PATHS.has(firstSegment.toLowerCase())) return "";
  return firstSegment.replace(/^@/, "").toLowerCase();
}

function findProfileMount() {
  return (
    document.querySelector('[data-testid="UserName"]') ||
    document.querySelector('[data-testid="UserDescription"]') ||
    document.querySelector('main [role="button"][aria-label*="Follow"]')?.parentElement
  );
}

function removeBadge() {
  document.getElementById(BADGE_ID)?.remove();
}

function renderBadge(profile) {
  const mount = findProfileMount();
  if (!mount) return false;

  removeBadge();
  const badge = document.createElement("div");
  badge.id = BADGE_ID;
  badge.className = "base-culture-score-badge";

  const score = document.createElement("span");
  score.className = "base-culture-score-pill";
  score.textContent = `NFT Score ${profile.score}`;

  const rank = document.createElement("span");
  rank.className = "base-culture-score-pill";
  rank.textContent = profile.rank ? `Rank #${profile.rank}` : "Unranked";

  badge.append(score, rank);

  if (profile.isOg) {
    const og = document.createElement("span");
    og.className = "base-culture-score-pill base-culture-score-og";
    og.textContent = "OG";
    badge.appendChild(og);
  }

  mount.insertAdjacentElement("afterend", badge);
  return true;
}

async function getApiBase() {
  try {
    const stored = await chrome.storage.sync.get(["apiBaseUrl"]);
    return (stored.apiBaseUrl || DEFAULT_API_BASE).replace(/\/$/, "");
  } catch {
    return DEFAULT_API_BASE;
  }
}

async function hydrateBadge(handle) {
  if (!handle || handle === activeHandle) return;
  activeHandle = handle;
  removeBadge();

  if (activeAbort) activeAbort.abort();
  activeAbort = new AbortController();

  try {
    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}/api/profile/${encodeURIComponent(handle)}`, {
      signal: activeAbort.signal,
      headers: { Accept: "application/json" }
    });

    if (response.status === 404) return;
    if (!response.ok) throw new Error(`Profile lookup failed: ${response.status}`);

    const profile = await response.json();
    const rendered = renderBadge(profile);
    if (!rendered) {
      setTimeout(() => renderBadge(profile), 500);
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.debug("[Base Culture Score]", error);
    }
  }
}

function tick() {
  const handle = normalizeHandleFromPath();
  if (!handle) {
    activeHandle = "";
    removeBadge();
    return;
  }
  hydrateBadge(handle);
}

const observer = new MutationObserver(tick);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", tick);
tick();
