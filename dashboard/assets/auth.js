/* ==========================================================================
   Clifton Apparels - Dyeing & Finishing Performance Dashboard
   Sign-in gate

   Author : Ikramul Hasan Rakib
            Executive, Central IE Department, Clifton Group
   (c) 2026 Ikramul Hasan Rakib. All rights reserved.

   NOTE: This is a light, client-side access gate for a static site. It keeps
   casual visitors out of the interface but cannot protect the underlying
   files (data.js / data.json are still publicly downloadable). Replace with
   real server-side authentication before relying on it for confidentiality.
   ========================================================================== */
(function () {
  "use strict";

  /* Hard-coded credentials - change here (or move to a backend) when needed. */
  var CREDENTIALS = {
    username: "clifton-dyeing",
    password: "dyeing123"
  };

  var STORAGE_KEY = "clifton-auth";
  var SESSION_HOURS = 12;

  function readSession() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var saved = JSON.parse(raw);
      if (!saved || saved.user !== CREDENTIALS.username || !saved.at) return false;
      var age = Date.now() - saved.at;
      return age >= 0 && age < SESSION_HOURS * 60 * 60 * 1000;
    } catch (e) {
      return false;
    }
  }

  function saveSession() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        user: CREDENTIALS.username,
        at: Date.now()
      }));
    } catch (e) { /* storage unavailable - session lasts for this page only */ }
  }

  function clearSession() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  function unlock() {
    document.documentElement.classList.remove("auth-locked");
    var gate = document.getElementById("login");
    if (!gate) return;
    gate.classList.add("hidden");
    gate.setAttribute("aria-hidden", "true");
    window.setTimeout(function () {
      if (gate.parentNode) gate.parentNode.removeChild(gate);
    }, 320);
  }

  function shake(card) {
    if (!card) return;
    card.classList.remove("shake");
    // force reflow so the animation can restart
    void card.offsetWidth;
    card.classList.add("shake");
  }

  function init() {
    var gate = document.getElementById("login");
    var form = document.getElementById("loginForm");
    var userInput = document.getElementById("loginUser");
    var passInput = document.getElementById("loginPass");
    var errorBox = document.getElementById("loginError");
    var submitBtn = document.getElementById("loginSubmit");
    var logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        clearSession();
        window.location.reload();
      });
    }

    if (!form || !userInput || !passInput) return;

    if (readSession()) {
      unlock();
      return;
    }

    if (!gate) return;

    userInput.focus();

    function fail(message) {
      if (errorBox) errorBox.textContent = message;
      shake(form);
      passInput.value = "";
      passInput.focus();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var user = userInput.value.trim();
      var pass = passInput.value;

      if (!user || !pass) {
        if (errorBox) errorBox.textContent = "Enter both your username and password.";
        shake(form);
        (user ? passInput : userInput).focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Signing in…";
      }

      // Small delay keeps the button state readable on very fast machines.
      window.setTimeout(function () {
        var ok = user.toLowerCase() === CREDENTIALS.username && pass === CREDENTIALS.password;

        if (!ok) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Sign in";
          }
          fail("Incorrect username or password.");
          return;
        }

        saveSession();
        unlock();
      }, 260);
    });

    [userInput, passInput].forEach(function (input) {
      input.addEventListener("input", function () {
        if (errorBox) errorBox.textContent = "";
        form.classList.remove("shake");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
