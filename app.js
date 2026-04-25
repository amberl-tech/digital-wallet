// Simple "wallet" state
let wallet = {
  profile: {
    name: "Amber Lewis",
    email: "acl0092@uah.edu",
    userId: null,
  },
  badges: [],
};

// Badge (trybadge.com) credentials
const BADGE_API_KEY = "4eIcd4785qw0VO1GETvKf1jjoEvfM3aHB4mx8xFK";
const APPLE_TEMPLATE_ID = "99ed1435-446d-433b-a2f9-39d39a54611b";
const GOOGLE_TEMPLATE_ID = "4022197c-1ebf-4db1-9e29-d1b292188dde";
const GOOGLE_ISSUER_ID = "3388000000023109951";
const AMBER_WELLNESS_BADGE_URL = "https://api.trybadge.com/download?id=2929766e-15f2-4a74-884f-e1fd29242085&token=2SI0hkjaWUe6HW6zgqamPQurPKQOq6YU";

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

  // Always show the real Amber Wellness Badge at the top
  const wellnessBadge = document.createElement("div");
  wellnessBadge.className = "badge-card";
  wellnessBadge.innerHTML = `
    <h3>Amber Wellness Badge</h3>
    <p>Wellness Achievement</p>
    <p class="badge-meta">
      Issued: 2026-04-21<br/>
      Credential ID: cred-1234abcd
    </p>
    <a href="${AMBER_WELLNESS_BADGE_URL}" target="_blank" class="apple-btn" style="display:block;text-align:center;text-decoration:none;margin-top:0.5rem;">Add to Apple Wallet</a>
    <a href="${AMBER_WELLNESS_BADGE_URL}" target="_blank" class="google-btn" style="display:block;text-align:center;text-decoration:none;margin-top:0.5rem;">Add to Google Wallet</a>
  `;
  container.appendChild(wellnessBadge);

  // Then render any locally issued badges
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

  // Share handlers
  document.querySelectorAll(".share-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      shareBadge(wallet.badges[idx]);
    });
  });

  // Apple Wallet buttons (only for dynamically issued badges)
  document.querySelectorAll(".apple-btn[data-index]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      generateApplePass(wallet.badges[idx]);
    });
  });

  // Google Wallet buttons (only for dynamically issued badges)
  document.querySelectorAll(".google-btn[data-index]").forEach((btn) => {
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
    issuer: "Amber's Digital Wallet",
    holder: wallet.profile.userId,
  };

  wallet.badges.push(badge);
  saveBadges();
  renderBadges();
}

// Share badge JSON
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
   APPLE WALLET — TryBadge API
--------------------------------------------------------- */
async function generateApplePass(badge) {
  try {
    const response = await fetch(
      `https://api.trybadge.com/v1/passes/${APPLE_TEMPLATE_ID}/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BADGE_API_KEY}`
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
   GOOGLE WALLET — TryBadge API
--------------------------------------------------------- */
async function generateGooglePass(badge) {
  try {
    const response = await fetch(
      `https://api.trybadge.com/v1/passes/${GOOGLE_TEMPLATE_ID}/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BADGE_API_KEY}`
        },
        body: JSON.stringify({
          name: badge.name,
          credentialId: badge.id,
          issuedAt: badge.issuedAt,
          userId: wallet.profile.userId,
          issuerId: GOOGLE_ISSUER_ID
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