import fetcher from "../lib/fetcher.js";

let logout = document.querySelector('[data-action="logout"]');
let name = document.querySelector('[data-target="user-name"]');
let email = document.querySelector('[data-target="user-email"]');

async function loadUserData() {
  try {
    const user = await fetcher.get("/api/auth/me");

    name.textContent = user.name;
    email.textContent = user.email;
  } catch (ex) {
    // Will redirect to login if 401
  }
}

async function handleLogout() {
  try {
    await fetcher.post("/api/auth/logout");
  } catch (ex) {
    // Ignore errors, redirect anyway
  }

  window.location.href = "/login.html";
}

export function init() {
  loadUserData();

  logout.addEventListener("click", handleLogout);
}
