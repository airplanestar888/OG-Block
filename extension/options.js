const DEFAULT_API_BASE = "https://www.joinog.xyz";

const input = document.getElementById("apiBaseUrl");
const debugInput = document.getElementById("debugEnabled");
const status = document.getElementById("status");

chrome.storage.sync.get(["apiBaseUrl", "debugEnabled"], (stored) => {
  input.value = stored.apiBaseUrl || DEFAULT_API_BASE;
  debugInput.checked = Boolean(stored.debugEnabled);
});

document.getElementById("save").addEventListener("click", () => {
  const value = input.value.trim().replace(/\/$/, "");
  chrome.storage.sync.set({ apiBaseUrl: value || DEFAULT_API_BASE, debugEnabled: debugInput.checked }, () => {
    status.textContent = "Saved.";
    setTimeout(() => {
      status.textContent = "";
    }, 1600);
  });
});

