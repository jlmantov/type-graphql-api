export const resetPasswordForm = (token: string) => {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset Password</title>
  </head>
  <body>
      <!-- form card reset password -->
      <div class="card card-outline-secondary">
        <div>
          <h3 class="mb-0">Reset Password</h3>
        </div>
        <div class="card-body">
          <form id="resetpwd">
            <div class="form-group">
              <label for="pw1">New Password</label>
              <input type="password" id="pw1" required="" oninput="matchInput()" />
            </div>
            <div class="form-group">
              <label for="pw2">Confirm Password</label>
              <input type="password" id="pw2" oninput="matchInput()" />
            </div>
            <div class="form-group">
              <input type="button" id="submit" name="Update" value="Update" disabled="true" />
            </div>
          </form>
        </div>
      </div>
      <!-- /form card reset password -->
    </div>
    <script>
      function matchInput() {
        const pw1 = document.getElementById("pw1").value;
        const pw2 = document.getElementById("pw2").value;
        if (pw1 !== pw2) {
          document.getElementById("submit").disabled = true;
          document.getElementById("submit").classList.add("submit-primary");
          document.getElementById("submit").classList.remove("submit-success");
        } else {
          document.getElementById("submit").disabled = false;
          document.getElementById("submit").classList.remove("submit-primary");
          document.getElementById("submit").classList.add("submit-success");
        }
      }
      function updateSuccess() {
        window.location.replace("http://${process.env.DOMAIN}:${process.env.PORT}/");
      }

      // submit
      window.onload = () => {
        document.getElementById("submit").addEventListener("click", (evt) => {
          // evt.preventDefault();
          console.log('updatePassword evt', evt);
          // URL is something like this: http://${process.env.DOMAIN}:${process.env.PORT}/user/resetpwd/f391146b-13d2-44bd-a1f5-f0ffeef5c28c
          const uuid = window.location.href.split('/').slice(-1)[0]; // last element array, produced by splitting url by '/'
          const pwd = document.getElementById("pw1").value;
          const form = document.getElementById("resetpwd");
          const xhr = new XMLHttpRequest(); // https://developer.mozilla.org/en-US/search?q=XMLHttpRequest
          xhr.open("POST", "http://${process.env.DOMAIN}:${process.env.PORT}/user/resetpwd/" + uuid, true);
          // xhr.setRequestHeader("Accept", "application/json");
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.withCredentials = false;
          xhr.setRequestHeader("Authorization", "Bearer ${token}");

          xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                console.log('xhr.status', xhr.status);
                console.log('xhr.responseText', xhr.responseText);
            };
            if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
              updateSuccess(); // Request finished. Do processing here.
            }
          };
          xhr.send(JSON.stringify({ pwd: pwd, token: "${token}" }));
        });
      };
    </script>
  </body>
</html>`;
};
