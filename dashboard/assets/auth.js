/* ==========================================================================
   Clifton Apparels - Dyeing & Finishing Performance Dashboard
   Sign-in gate + client-side decryption of the data bundle

   Author : Ikramul Hasan Rakib
            Executive, Central IE Department, Clifton Group
   (c) 2026 Ikramul Hasan Rakib. All rights reserved.

   The published data file (dashboard/data/data.enc.js) is AES-256-GCM
   encrypted. The password is NOT stored anywhere in this repository: the
   correct password is the one that successfully decrypts the bundle, and
   the browser keeps only the decrypted payload for this tab's session.

   This protects the numbers in the bundle, but it is still a static site:
   anyone who knows a strong password can read the data. Use a long
   passphrase and never reuse a sensitive account password here.
   ========================================================================== */
(function () {
  "use strict";

  /* Username only - the password is verified cryptographically, not compared
     against a stored string. Change this value if the username should change. */
  var USERNAME = "clifton-dyeing";

  var SESSION_KEY = "clifton-session";
  var LEGACY_KEY = "clifton-auth";
  var SESSION_HOURS = 12;

  var appRequested = false;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */
  function b64ToBytes(value) {
    var binary = atob(value);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    try { sessionStorage.removeItem(LEGACY_KEY); } catch (e) { /* ignore */ }
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if (!saved || typeof saved.data !== "string" || !saved.at) return null;
      var age = Date.now() - saved.at;
      if (age < 0 || age > SESSION_HOURS * 60 * 60 * 1000) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return saved.data;
    } catch (e) {
      return null;
    }
  }

  function writeCache(jsonText) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ at: Date.now(), data: jsonText }));
    } catch (e) {
      /* storage full or disabled - the visitor will simply sign in again */
    }
  }

  function showFatal(message) {
    var boot = document.getElementById("boot");
    if (boot) {
      boot.classList.remove("hidden");
      boot.innerHTML = '<div class="boot-inner"><p style="max-width:440px">' + message + "</p></div>";
    } else {
      window.alert(message.replace(/<[^>]+>/g, ""));
    }
  }

  function loadApp() {
    if (appRequested) return;
    appRequested = true;
    var script = document.createElement("script");
    script.src = "assets/app.js";
    script.onerror = function () {
      showFatal("The dashboard application could not be loaded. Refresh the page and try again.");
    };
    document.body.appendChild(script);
  }

  function unlock(jsonText) {
    var data;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      return false;
    }
    if (!data || !data.meta || !data.dyeing || !data.finishing) return false;

    window.DASHBOARD_DATA = data;

    document.documentElement.classList.remove("auth-locked");
    var gate = document.getElementById("login");
    if (gate) {
      gate.classList.add("hidden");
      gate.setAttribute("aria-hidden", "true");
      window.setTimeout(function () {
        if (gate.parentNode) gate.parentNode.removeChild(gate);
      }, 320);
    }

    loadApp();
    return true;
  }

  function decrypt(password) {
    var enc = window.DASHBOARD_DATA_ENC;
    if (!enc || !enc.salt || !enc.iv || !enc.ct) {
      return Promise.reject(new Error("missing"));
    }

    var subtle = window.crypto && window.crypto.subtle;
    if (!subtle || typeof TextEncoder === "undefined" || typeof TextDecoder === "undefined") {
      return Promise.reject(new Error("unsupported"));
    }

    var iterations = parseInt(enc.iterations, 10) || 250000;
    if (iterations < 10000 || iterations > 2000000) {
      return Promise.reject(new Error("bad-bundle"));
    }

    var salt, iv, ciphertext;
    try {
      salt = b64ToBytes(enc.salt);
      iv = b64ToBytes(enc.iv);
      ciphertext = b64ToBytes(enc.ct);
    } catch (e) {
      return Promise.reject(new Error("bad-bundle"));
    }

    return subtle
      .importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"])
      .then(function (baseKey) {
        return subtle.deriveKey(
          { name: "PBKDF2", salt: salt, iterations: iterations, hash: "SHA-256" },
          baseKey,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );
      })
      .then(function (key) {
        return subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ciphertext);
      })
      .then(function (buffer) {
        return new TextDecoder().decode(buffer);
      });
  }

  function shake(form) {
    if (!form) return;
    form.classList.remove("shake");
    void form.offsetWidth; // restart the animation
    form.classList.add("shake");
  }

  /* ------------------------------------------------------------------ */
  /* Start-up                                                            */
  /* ------------------------------------------------------------------ */
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

    // Same tab, already unlocked -> decrypt-free restore from the session cache.
    var cached = readCache();
    if (cached) {
      if (unlock(cached)) return;
      clearSession();
    }

    if (!form || !userInput || !passInput) return;

    if (!window.DASHBOARD_DATA_ENC) {
      if (errorBox) {
        errorBox.textContent = "Encrypted data bundle not found. Run python scripts/build.py, then reload.";
      }
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    userInput.focus();

    function resetButton() {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign in";
      }
    }

    function fail(message) {
      if (errorBox) errorBox.textContent = message;
      shake(form);
      passInput.value = "";
      passInput.focus();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submitBtn && submitBtn.disabled) return;

      var user = userInput.value.trim();
      var pass = passInput.value;

      if (!user || !pass) {
        if (errorBox) errorBox.textContent = "Enter both your username and password.";
        shake(form);
        (user ? passInput : userInput).focus();
        return;
      }

      // The username is not a secret; the password is validated by decryption.
      if (user.toLowerCase() !== USERNAME) {
        fail("Incorrect username or password.");
        return;
      }

      if (errorBox) errorBox.textContent = "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Unlocking…";
      }

      decrypt(pass)
        .then(function (jsonText) {
          writeCache(jsonText);
          if (!unlock(jsonText)) throw new Error("parse");
        })
        .catch(function (err) {
          clearSession();
          resetButton();
          var code = err && err.message;
          if (code === "unsupported") {
            if (errorBox) {
              errorBox.textContent = "This browser cannot decrypt the dashboard. " +
                "Use a current browser and open the site over HTTPS.";
            }
          } else if (code === "missing" || code === "bad-bundle") {
            if (errorBox) {
              errorBox.textContent = "The encrypted data bundle is missing or damaged. " +
                "Rebuild it with: python scripts/build.py";
            }
          } else if (code === "parse") {
            if (errorBox) {
              errorBox.textContent = "The decrypted data could not be read. Rebuild the dashboard data.";
            }
          } else {
            fail("Incorrect username or password.");
          }
        });
    });

    [userInput, passInput].forEach(function (input) {
      input.addEventListener("input", function () {
        if (errorBox) errorBox.textContent = "";
        if (form) form.classList.remove("shake");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
