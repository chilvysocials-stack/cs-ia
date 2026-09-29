/*
 * Admin login (front-end prototype).
 *
 * The credentials are checked in the browser, so this only gates the demo UI;
 * it is not real security. The full system checks them on the server.
 */
(function () {
  "use strict";

  var SESSION_KEY = "sathi-cafe-admin";
  var DEMO_USERS = { admin: "sathi123" };

  var form = document.getElementById("login-form");
  var error = document.getElementById("login-error");

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var username = form.username.value.trim();
    var password = form.password.value;

    if (!username || !password) {
      showError("Enter both your username and password.");
      return;
    }
    if (DEMO_USERS[username] !== password) {
      showError("Incorrect username or password.");
      form.password.value = "";
      form.password.focus();
      return;
    }

    try {
      window.sessionStorage.setItem(SESSION_KEY, username);
    } catch (err) {
      // Storage blocked: the panel will send the user back here.
    }
    window.location.href = "index.html";
  });
})();
