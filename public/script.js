const API_KEY = document
  .querySelector('meta[name="api-key"]')
  .getAttribute("content");

const subscribeForm = document.getElementById("subscribeForm");
const lookupForm = document.getElementById("lookupForm");
const emailInput = document.getElementById("email");
const repositoryInput = document.getElementById("repository");
const lookupEmailInput = document.getElementById("lookupEmail");
const subscribeStatus = document.getElementById("subscribeStatus");
const lookupStatus = document.getElementById("lookupStatus");
const rows = document.getElementById("rows");

function headers(withJson) {
  const h = { "x-api-key": API_KEY };
  if (withJson) {
    h["Content-Type"] = "application/json";
  }
  return h;
}

function setStatus(node, text, isError) {
  node.textContent = text;
  node.style.color = isError ? "#b00020" : "#0a7a33";
}

function renderTable(subscriptions) {
  rows.innerHTML = "";
  if (!subscriptions.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "No active subscriptions";
    tr.appendChild(td);
    rows.appendChild(tr);
    return;
  }

  for (const s of subscriptions) {
    const tr = document.createElement("tr");

    const repository = document.createElement("td");
    repository.textContent = s.repository || "-";
    tr.appendChild(repository);

    const status = document.createElement("td");
    status.textContent = s.status || "-";
    tr.appendChild(status);

    const createdAt = document.createElement("td");
    createdAt.textContent = s.createdAt
      ? new Date(s.createdAt).toLocaleString()
      : "-";
    tr.appendChild(createdAt);

    rows.appendChild(tr);
  }
}

subscribeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(subscribeStatus, "", false);

  try {
    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({
        email: emailInput.value.trim(),
        repository: repositoryInput.value.trim(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Subscribe failed");
    }

    lookupEmailInput.value = emailInput.value.trim();
    setStatus(
      subscribeStatus,
      "Subscription created. Confirm it from your email.",
      false,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    setStatus(subscribeStatus, message, true);
  }
});

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(lookupStatus, "", false);
  const email = lookupEmailInput.value.trim();

  try {
    const response = await fetch(
      `/api/subscriptions?email=${encodeURIComponent(email)}`,
      {
        headers: headers(false),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Load failed");
    }

    renderTable(data.subscriptions || []);
    setStatus(lookupStatus, "Loaded", false);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    renderTable([]);
    setStatus(lookupStatus, message, true);
  }
});
