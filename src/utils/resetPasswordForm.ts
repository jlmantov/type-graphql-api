export const resetPasswordHtml = () => {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset Password</title>
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css"
      rel="stylesheet"
      integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3"
      crossorigin="anonymous"
    />
  </head>
  <body>
    <div class="col-md-6 offset-md-3">
      <span class="anchor" id="formSetPwd"></span>
      <hr class="mb-5" />

      <!-- form card reset password -->
      <div class="card card-outline-secondary">
        <div class="card-header">
          <h3 class="mb-0">Reset Password</h3>
        </div>
        <div class="card-body">
          <form id="formSetPwd" class="form" role="form" autocomplete="off">
            <div class="form-group">
              <label for="pw1">New Password</label>
              <input
                type="password"
                class="form-control"
                id="pw1"
                required=""
                oninput="matchInput()"
              />
            </div>
            <div class="form-group">
              <label for="pw2">Confirm Password</label>
              <input
                type="password"
                class="form-control"
                id="pw2"
                required=""
                oninput="matchInput()"
              />
              <span class="form-text small text-muted">
                To confirm, type the new password again.
              </span>
            </div>
            <div class="form-group">
              <input
                type="button"
                id="submit"
                name="Update"
                value="Update"
                class="btn btn-secondary btn-lg float-right"
                disabled="true"
              />
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
          document.getElementById("submit").classList.add("btn-secondary");
          document.getElementById("submit").classList.remove("btn-success");
        } else {
          document.getElementById("submit").disabled = false;
          document.getElementById("submit").classList.remove("btn-secondary");
          document.getElementById("submit").classList.add("btn-success");
        }
      }
      function updateSuccess() {
        window.location.replace("http://${process.env.DOMAIN}:${process.env.PORT}/");
      }
      function updateFailed(status, msg) {
        document.body.innerHTML = "<h2>Update failed!</h2>"
      }
      function resetPasswordTimeout(status, msg) {
        document.body.innerHTML = "<h2>Update timeout!</h2><p>Link is still active and can be reactivated until password is updated.</p>"
      }

      // submit
      window.onload = () => {
        setTimeout(resetPasswordTimeout, 300000);
        document.getElementById("submit").addEventListener("click", (evt) => {
          // evt.preventDefault();
          document.getElementById("submit").disabled = true;
          document.getElementById("submit").classList.remove("btn-success");
          document.getElementById("submit").classList.add("btn-primary");
          // URL is something like this: http://${process.env.DOMAIN}:${process.env.PORT}/user/resetpwd/f391146b-13d2-44bd-a1f5-f0ffeef5c28c
          const uuid = window.location.href.split('/').slice(-1)[0]; // last element array, produced by splitting url by '/'
          const pwd = document.getElementById("pw1").value;
          const form = document.getElementById("formSetPwd");
          const xhr = new XMLHttpRequest(); // https://developer.mozilla.org/en-US/search?q=XMLHttpRequest
          xhr.open("POST", "http://${process.env.DOMAIN}:${process.env.PORT}/user/resetpwd/" + uuid, true);
          // xhr.setRequestHeader("Accept", "application/json");
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.withCredentials = false;

          xhr.onreadystatechange = function () {
            if (this.readyState === XMLHttpRequest.DONE) {
              // Request finished. Do processing here.
              if (this.status === 200) {
                updateSuccess();
              } else {
                // console.log('XMLHttpRequest Status '+ xhr.status +' - ResponseText: ', xhr.responseText);
                updateFailed(xhr.status, xhr.responseText);
              }
            }
            if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            }
          };
          xhr.send(JSON.stringify({ pwd: pwd }));
        });
      };
    </script>
    <script
      src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.10.2/dist/umd/popper.min.js"
      integrity="sha384-7+zCNj/IqJ95wo16oMtfsKbZ9ccEh31eOz1HGyDuCQ6wgnyJNSYdrPa03rtR1zdB"
      crossorigin="anonymous"
    ></script>
    <script
      src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.min.js"
      integrity="sha384-QJHtvGhmr9XOIpI6YVutG+2QOK9T+ZnN4kzFN1RtK3zEFEIsxhlmWl5/YESvpZ13"
      crossorigin="anonymous"
    ></script>
  </body>
</html>`;
};
