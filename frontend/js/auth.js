/*
 * Admin login, shared by the login page and the admin panel.
 *
 * The Python server checks the password against a salted hash in MySQL and
 * keeps the admin logged in with a session cookie for 8 hours, across every tab.
 */
(function () {
  "use strict";

  var api = window.SathiStore.api;

  window.SathiAuth = {
    // Logged-in username, or null.
    me: async function () {
      return (await api("me")).user;
    },

    // Throws an Error with the server's message if the login is wrong.
    login: function (username, password) {
      return api("login", { username: username, password: password });
    },

    logout: function () {
      return api("logout", {});
    },
  };
})();
