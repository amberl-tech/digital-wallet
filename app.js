/* ---------------------------------------------------------
   SIMPLE WALLET STATE
--------------------------------------------------------- */

let wallet = {
  profile: {
    name: "Amber Lewis",
    email: "amber@example.com",
    userId: null,
  },
  badges: [],
};

/* ---------------------------------------------------------
   USER ID
--------------------------------------------------------- */

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

/* ---------------------------------------------------------
   BADGE STORAGE
--------------------------------------------------------- */

function loadBadges() {
  const stored = localStorage.getItem("wallet_badges");
  wallet.badges = stored ? JSON.parse(stored) : [];
}

function saveBadges() {
  localStorage.setItem("wallet_badges", JSON.stringify(wallet.badges));
}

/* ---------------------------------------------------------
   RENDER PROFILE
--------------------------------------------------------- */

function renderProfile() {
  document.getElementById("profile-name").textContent = wallet.profile.name;
  document.getElementById("profile-email").textContent = wallet.profile.email;
  document.getElementById("profile-id").textContent = wallet.profile.userId;
}

/* ---------------------------------------------------------
   RENDER BADGES
--------------------------------------------------------- */

function renderBadges() {
  const container = document.getElementById("badge-list");
  container.innerHTML = "";

  if (wallet.badges.length === 0) {
    container.innerHTML = `<p>No badges yet. Issue your first one below.</p>`;
    return;
  }

  wallet.badges.forEach((badge, index) => {
    const div = document.createElement("div");
    div.className = "badge-card";

    div.innerHTML = `
      <p><strong>${badge.name}</strong></p>
      <p>${badge.description}</p>
      <p>Issued: ${new Date(badge.issuedAt).toLocaleString()}</p>
      <p>Credential ID: ${badge.id}</p>

      <button class="share-btn" data-index="${index}">Share</button>
      <button class="apple-btn" data-index="${index}">Add to Apple Wallet</button>
      <button class="google-btn" data-index="${index}">Add to Google Wallet</button>
    `;

    container.appendChild(div);
  });

  // SHARE
  document.querySelectorAll(".share-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      shareBadge(wallet.badges[idx]);
    });
  });

  // APPLE WALLET
  document.querySelectorAll(".apple-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      generateApplePass(wallet.badges[idx]);
    });
  });

  // GOOGLE WALLET
  document.querySelectorAll(".google-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      generateGooglePass(wallet.badges[idx]);
    });
  });
}

/* ---------------------------------------------------------
   ISSUE BADGE
--------------------------------------------------------- */

function issueBadge(name, description) {
  const badge = {
    id: "cred-" + Math.random().toString(36).substring(2, 10),
    name,
    description,
    issuedAt: new Date().toISOString(),
    issuer: "Amber's Digital Wallet",
    holder: wallet.profile.userId,
  };

  wallet.badges.push(badge);
  saveBadges();
  renderBadges();
}

/* ---------------------------------------------------------
   SHARE BADGE JSON
--------------------------------------------------------- */

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
   APPLE WALLET (TryBadge)
--------------------------------------------------------- */

async function generateApplePass(badge) {
  try {
    const response = await fetch(
      "https://api.trybadge.com/v1/passes/99ed1435-446d-433b-a2f9-39d39a54611b/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer YOUR_API_KEY_HERE"
        },
        body: JSON.stringify({
          name: badge.name,
          credentialId: badge.id,
          issuedAt: badge.issuedAt,
          userId: wallet.profile.userId
        })
      }
    );

    if (!response.ok) {
      alert("Error generating Apple Wallet pass.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${badge.id}.pkpass`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    alert("Failed to generate Apple Wallet pass.");
  }
}

/* ---------------------------------------------------------
   GOOGLE WALLET (TryBadge)
--------------------------------------------------------- */

async function generateGooglePass(badge) {
  try {
    const response = await fetch(
      "https://api.trybadge.com/v1/passes/YOUR_GOOGLE_TEMPLATE_ID/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer YOUR_API_KEY_HERE"
        },
        body: JSON.stringify({
          name: badge.name,
          credentialId: badge.id,
          issuedAt: badge.issuedAt,
          userId: wallet.profile.userId
        })
      }
    );

    if (!response.ok) {
      alert("Error generating Google Wallet pass.");
      return;
    }

    const result = await response.json();
    window.open(result.saveUrl, "_blank");

  } catch (err) {
    console.error(err);
    alert("Failed to generate Google Wallet pass.");
  }
}

/* ---------------------------------------------------------
   UI EVENTS
--------------------------------------------------------- */

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

/* ---------------------------------------------------------
   INIT
--------------------------------------------------------- */

function init() {
  initUserId();
  loadBadges();
  renderProfile();
  renderBadges();
  setupEvents();
}

document.addEventListener("DOMContentLoaded", init);
