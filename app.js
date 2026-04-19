// Simple "wallet" state
let wallet = {
  profile: {
    name: "Amber Lewis",
    email: "amber@example.com",
    userId: null,
  },
  badges: [],
};

// Generate or load user ID
function initUserId() {
  const storedId = localStorage.getItem("wallet_user_id");
  if (storedId) {
    wallet.profile.userId = storedId;
  } else {
    const newId = "user-" + Math.random().toString(36).substring(2, 10);
    wallet.profile.userId = newId;
    localStorage.setItem("wallet_user_id", newId);
  }
}

// Load badges from localStorage
function loadBadges() {
  const stored = localStorage.getItem("wallet_badges");
  if (stored) {
    wallet.badges = JSON.parse(stored);
  } else {
    wallet.badges = [];
  }
}

// Save badges to localStorage
function saveBadges() {
  localStorage.setItem("wallet_badges", JSON.stringify(wallet.badges));
}

// Render profile section
function renderProfile() {
  document.getElementById("profile-name").textContent = wallet.profile.name;
  document.getElementById("profile-email").textContent = wallet.profile.email;
  document.getElementById("profile-id").textContent = wallet.profile.userId;
}

// Render badges
function renderBadges() {
  const container = document.getElementById("badge-list");
  container.innerHTML = "";

  if (wallet.badges.length === 0) {
    container.innerHTML = "<p>No badges yet. Issue your first one below.</p>";
    return;
  }

  wallet.badges.forEach((badge, index) => {
    const div = document.createElement("div");
    div.className = "badge-card";

    div.innerHTML = `
      <h3>${badge.name}</h3>
      <p>${badge.description}</p>
      <p class="badge-meta">
        Issued: ${new Date(badge.issuedAt).toLocaleString()}<br/>
        Credential ID: ${badge.id}
      </p>

      <button data-index="${index}" class="share-btn">Share</button>

      <button data-index="${index}" class="apple-btn">Add to Apple Wallet</button>
      <button data-index="${index}" class="google-btn">Add to Google Wallet</button>
    `;

    container.appendChild(div);
  });

  // Attach share handlers
  document.querySelectorAll(".share-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      shareBadge(wallet.badges[idx]);
    });
  });

  // Apple Wallet button
  document.querySelectorAll(".apple-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      generateApplePass(wallet.badges[idx]);
    });
  });

  // Google Wallet button
  document.querySelectorAll(".google-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      generateGooglePass(wallet.badges[idx]);
    });
  });
}

// Issue a new badge
function issueBadge(name, description) {
  const badge = {
    id: "cred-" + Math.random().toString(36).substring(2, 10),
    name,
    description,
    issuedAt: new Date().toISOString(),
    issuer: "Amber's Wallet Prototype",
    holder: wallet.profile.userId,
  };

  wallet.badges.push(badge);
  saveBadges();
  renderBadges();
}

// "Share" a badge (for now, just show JSON)
function shareBadge(badge) {
  const sharePayload = {
    credential: badge,
    proof: {
      type: "demo-signature",
      created: new Date().toISOString(),
    },
  };

  alert("Share this credential JSON:\n\n" + JSON.stringify(sharePayload, null, 2));
}

/* ---------------------------------------------------------
   ⭐ UPDATED APPLE WALLET PASS GENERATOR
--------------------------------------------------------- */
async function generateApplePass(badge) {
  const passTemplateUrl = "templates/apple-pass-template/pass.json";

  const response = await fetch(passTemplateUrl);
  const passJson = await response.json();

  // Inject badge data
  passJson.generic.primaryFields[0].value = badge.name;
  passJson.generic.auxiliaryFields[0].value = badge.id;
  passJson.barcode.message = `https://yourdomain.com/verify?badgeId=${badge.id}`;

  const blob = new Blob([JSON.stringify(passJson, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "digital-wallet-pass.json"; // placeholder until .pkpass signing
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------
   ⭐ UPDATED GOOGLE WALLET PASS GENERATOR
--------------------------------------------------------- */
async function generateGooglePass(badge) {
  const templateUrl = "templates/google-pass-template.json";
  const response = await fetch(templateUrl);
  const template = await response.json();

  // Inject badge data
  template.id = `digitalwallet.badge.${badge.id}`;
  template.textModulesData[0].body = badge.name;
  template.textModulesData[1].body = badge.id;
  template.barcode.value = `https://yourdomain.com/verify?badgeId=${badge.id}`;

  const blob = new Blob([JSON.stringify(template, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "google-wallet-pass.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Wire up UI events
function setupEvents() {
  const issueBtn = document.getElementById("issue-btn");
  const nameInput = document.getElementById("badge-name");
  const descInput = document.getElementById("badge-desc");

  issueBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const desc = descInput.value.trim();

    if (!name || !desc) {
      alert("Please enter both a badge name and description.");
      return;
    }

    issueBadge(name, desc);
    nameInput.value = "";
    descInput.value = "";
  });
}

// Initialize wallet
function init() {
  initUserId();
  loadBadges();
  renderProfile();
  renderBadges();
  setupEvents();
}

document.addEventListener("DOMContentLoaded", init);
