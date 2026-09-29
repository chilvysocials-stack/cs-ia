/*
 * Admin login, shared by the login page and the admin panel.
 *
 * Passwords are stored as SHA-256 hashes, never as plain text: the typed
 * password is hashed and the two hashes are compared. The login is kept in
 * localStorage (shared by every tab) for 8 hours, so admins can switch to the
 * customer menu and back without logging in again.
 */
(function () {
  "use strict";

  var KEY = "sathi-cafe-admin";
  var SESSION_HOURS = 8;

  // username -> SHA-256 hash of the password ("sathi123")
  var USERS = {
    admin: "51d628bab2792b032837e87dbd3d0f99b6eed48d690ff62de874f2583d3d6dbc",
  };

  async function sha256(text) {
    var bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes), function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY));
    } catch (err) {
      return null;
    }
  }

  window.SathiAuth = {
    // Returns the logged-in username, or null if nobody is logged in / it expired.
    user: function () {
      var session = read();
      return session && session.expires > Date.now() ? session.user : null;
    },

    login: async function (username, password) {
      if (!USERS[username] || USERS[username] !== (await sha256(password))) return false;
      var expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
      localStorage.setItem(KEY, JSON.stringify({ user: username, expires: expires }));
      return true;
    },

    logout: function () {
      localStorage.removeItem(KEY);
    },
  };
})();
