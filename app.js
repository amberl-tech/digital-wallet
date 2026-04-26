/* ---------------------------------------------------------
   SUPABASE CLIENT
--------------------------------------------------------- */

const supabaseUrl = "https://pcvdsltidnsyzjnlztie.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdmRzbHRpZG5zeXpqbmx6dGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNTk4MjYsImV4cCI6MjA5MjczNTgyNn0.MOTKV1PiPvRfcCkbbIooKcJYUD9kmadS6UZmh7-h61k";

// FIXED — no duplicate global variable
const client = supabase.createClient(supabaseUrl, supabaseAnonKey);

/* ---------------------------------------------------------
   WALLET STATE
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
   AUTH BUTTONS
--------------------------------------------------------- */

function setupAuthButtons() {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  loginBtn.addEventListener("click", async () => {
    const email = prompt("Enter your email to sign in:");
    if (!email) return;

    const { error } = await client.auth.signInWithOtp({ email });

    if (error) {
      alert("Login failed.");
      return;
    }

    alert("Check your email for the magic login link.");
  });

  logoutBtn.addEventListener("click", async () => {
    await client.auth.signOut();
    location.reload();
  });
}

/* ---------------------------------------------------------
   LOAD USER ID
--------------------------------------------------------- */

async function initUserId() {
  const { data } = await client.auth.getUser();
  const user = data.user;

  if (!user) {
    wallet.profile.userId = null;
    return;
  }

  wallet.profile.userId = user.id;
}

/* ---------------------------------------------------------
   LOAD BADGES
--------------------------------------------------------- */

async function loadBadges() {
  if (!wallet.profile.userId) {
    wallet.badges = [];
    return;
  }

  const { data: creds, error } = await client
    .from("credentials")
    .select("*")
    .eq("user_id", wallet.profile.userId)
    .order("issued_at", { ascending: false });

  if (error) {
    console.error("Error loading badges:", error);
    wallet.badges = [];
    return;
  }

  wallet.badges = creds || [];
}

/* ---------------------------------------------------------
   RENDER PROFILE
--------------------------------------------------------- */

function renderProfile() {
  document.getElementById("profile-name").textContent = wallet.profile.name;
  document.getElementById("profile-email").textContent = wallet.profile.email;
  document.getElementById("profile-id").textContent =
    wallet.profile.userId || "Not signed in";
}

/* ---------------------------------------------------------
   RENDER BADGES
--------------------------------------------------------- */

function renderBadges() {
  const container = document.getElementById("badge-list");
  container.innerHTML = "";

  if (!wallet.profile.userId) {
    container.innerHTML = `<p>Please sign in to view your badges.</p>`;
    return;
  }

  if (wallet.badges.length === 0) {
    container.innerHTML = `<p>No badges yet. Issue your first one below.</p>`;
    return;
  }

  wallet.badges.forEach((badge) => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <p><strong>${badge.name}</strong></p>
      <p>${badge.description}</p>
      <p>Issued: ${new Date(badge.issued_at).toLocaleString()}</p>

      <div class="wallet-buttons">
        <a href="${badge.apple_wallet_url}" target="_blank">
          <img class="wallet-badge-img"
               src="https://developer.apple.com/wallet/images/add-to-apple-wallet.svg">
        </a>

        <a href="${badge.google_wallet_url}" target="_blank">
          <img class="wallet-badge-img"
               src="assets/google-wallet.png">
        </a>
      </div>
    `;

    container.appendChild(div);
  });
}

/* ---------------------------------------------------------
   ISSUE BADGE
--------------------------------------------------------- */

async function issueBadge(name, description) {
  if (!wallet.profile.userId) {
    alert("Please sign in first.");
    return;
  }

  const { error } = await client.from("credentials").insert({
    user_id: wallet.profile.userId,
    name,
    description,
    apple_wallet_url:
      "https://pcvdsltidnsyzjnlztie.supabase.co/functions/v1/apple-pass",
    google_wallet_url:
      "https://pcvdsltidnsyzjnlztie.supabase.co/functions/v1/google-pass",
  });

  if (error) {
    console.error(error);
    alert("Error issuing badge.");
    return;
  }

  await loadBadges();
  renderBadges();
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

async function init() {
  setupAuthButtons();
  await initUserId();
  await loadBadges();
  renderProfile();
  renderBadges();
  setupEvents();
}

document.addEventListener("DOMContentLoaded", init);
