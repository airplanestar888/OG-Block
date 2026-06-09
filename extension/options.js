const input = document.getElementById("apiBaseUrl");
const status = document.getElementById("status");

chrome.storage.sync.get(["apiBaseUrl"], (stored) => {
  input.value = stored.apiBaseUrl || "http://localhost:3000";
});

document.getElementById("save").addEventListener("click", () => {
  const value = input.value.trim().replace(/\/$/, "");
  chrome.storage.sync.set({ apiBaseUrl: value }, () => {
    status.textContent = "Saved.";
    setTimeout(() => {
      status.textContent = "";
    }, 1600);
  });
});
