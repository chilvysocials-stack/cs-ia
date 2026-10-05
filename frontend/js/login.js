/* Admin login form. */
(async function () {
  "use strict";

  var form = document.getElementById("login-form");
  var error = document.getElementById("login-error");

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
  }

  // Already logged in (e.g. coming back from the customer menu): skip the form.
  try {
    if (await SathiAuth.me()) {
      window.location.replace("index.html");
      return;
    }
  } catch (err) {
    showError(err.message);
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var username = form.username.value.trim();
    var password = form.password.value;

    if (!username || !password) {
      showError("Enter both your username and password.");
      return;
    }
    try {
      await SathiAuth.login(username, password);
      window.location.href = "index.html";
    } catch (err) {
      showError(err.message);
      form.password.value = "";
      form.password.focus();
    }
  });
})();
