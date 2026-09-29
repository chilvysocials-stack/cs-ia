/* Admin login form. */
(function () {
  "use strict";

  // Already logged in (e.g. coming back from the customer menu): skip the form.
  if (SathiAuth.user()) {
    window.location.replace("index.html");
    return;
  }

  var form = document.getElementById("login-form");
  var error = document.getElementById("login-error");

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var username = form.username.value.trim();
    var password = form.password.value;

    if (!username || !password) {
      showError("Enter both your username and password.");
      return;
    }
    if (!(await SathiAuth.login(username, password))) {
      showError("Incorrect username or password.");
      form.password.value = "";
      form.password.focus();
      return;
    }
    window.location.href = "index.html";
  });
})();
