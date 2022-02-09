import { resetPasswordHtml } from "./resetPasswordForm";

/**
 * Send email to user with a unique link to 'Password Reset' Form
 * called by: newPasswordForm_get (User.controller.ts) - handler for endpoint '/user/<Id>'
 */
describe("resetPasswordForm", () => {

  // newPasswordForm_get is handler for endpoint '/user/<Id>'
  describe("resetPasswordForm", () => {
    test("Success ", async () => {
      const html = resetPasswordHtml();
      expect(html).toContain('id="formSetPwd"');
    }); // Success
  }); // resetPasswordForm
});
