import { Request, Response } from "express";
import nodemailer from "nodemailer";
import { v4 } from "uuid";
import { User } from "../graphql/entity/User";
import { UserEmail } from "../graphql/entity/UserEmail";
import { CONFIRMUSER, RESETPWD } from "../routes/user";
import { createResetPasswordToken } from "./auth";
import { resetPasswordHtml } from "./resetPasswordForm";

/**
 * Verify uuid from request url, enable login and cleanup email confirmation
 * @param http request - url parameter is used as input
 * @param http status - 200 on success, 400 on error
 * @param http response - succes JSON: { OK: true } - error JSON: { error: 'message' }
 * @returns http response - true when user is confirmed, false otherwise
 */
export const confirmUserEmail = async (req: Request, res: Response) => {
  // request endpoint is "/user/confirm/:id" - this means that req.params.id is defined when this method is called
  const userConfirmation = await UserEmail.findOne({
    where: { uuid: req.params.id, reason: CONFIRMUSER },
  });
  if (userConfirmation === undefined) {
    res.status(400).json({ error: "Expired or unknown id, please register again!" });
  } else {
    const user = await User.findOne({ where: { email: userConfirmation.email } });
    if (!user) {
      res.status(400).json({ error: "Not found!" });
    } else {
      const success = await User.update(user.id, { confirmed: true });
      if (success.affected === 1) {
        // only cleanup if user login was actually enabled
        await UserEmail.delete(userConfirmation.id);
      }
      res.status(200).redirect(`http://${process.env.DOMAIN}:${process.env.PORT}/`);
    }
  }
};

/**
 * 1. Verify uuid from request url,
 * 2. create accessToken to changePassword
 * 3. cleanup email
 * 4. redirect to change password
 * @param http request - url parameter is used as input
 * @param http status - 200 on success, 400 on error
 * @param http response - succes JSON: { OK: true } - error JSON: { error: 'message' }
 * @returns http response - true when user is confirmed, false otherwise
 */
export const resetPasswordForm = async (req: Request, res: Response) => {
  // request endpoint is "/user/confirm/:id" - this means that req.params.id is defined when this method is called
  const userReset = await UserEmail.findOne({ where: { uuid: req.params.id, reason: RESETPWD } });
  if (userReset === undefined) {
    res.status(400).json({ error: "Expired or unknown id, please reset again!" });
  } else {
    const user = await User.findOne({ where: { email: userReset.email } });
    if (!user) {
      res.status(400).json({ error: "Not found!" });
    } else {
      // now create a JSON Web Token - https://www.npmjs.com/package/jsonwebtoken
      const html = resetPasswordHtml();
      const resetPwdToken = await createResetPasswordToken(user);
      res.cookie("roj", resetPwdToken, { httpOnly: true, sameSite: "strict" });
      res.send(html);
    }
  }
};

/**
 * Use nodemailer to create an email with a unique URL
 * 1. let user enable login
 * 2. let user reset password
 * @param email address to send confirmation email to, before enabling user login
 */
export const sendUserEmail = async (email: string, reason: string) => {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  const testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  const url = await createEmailUrl(email, reason);

  // send mail with defined transport object
  const mailOptions = {
    from: '"Fred Foo" <noreply@example.com>', // sender address
    to: email, // list of receivers
    subject: "", // Subject line
    text: "", // plain text body
    html: "", // html body
  };

  switch (reason) {
    case RESETPWD:
      mailOptions.subject = "Reset Password"; // Subject line
      mailOptions.text = `Please click this link in order to reset your password: ${url}`; // plain text body
      mailOptions.html = `<b>Please click this link in order to reset your password.</b><a href="${url}">${url}</a>`; // html body
      break;
    case CONFIRMUSER:
    default:
      mailOptions.subject = "Confirm Email"; // Subject line
      mailOptions.text = `Please confirm your email: ${url}`; // plain text body
      mailOptions.html = `<b>Please confirm your email.</b><a href="${url}">${url}</a>`; // html body
      break;
  }

  const info = await transporter.sendMail(mailOptions);
  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
};

/**
 * Create a new UserEmail entity in the database and return the url
 * @param email address to send email to
 * @returns URL with unique uuidv4
 */
const createEmailUrl = async (email: string, reason: string) => {
  let uuid;
  let uniqeUUID = false; // uuid needs to be unique - there's a good chance it is, but we need to be sure.
  while (!uniqeUUID) {
    uuid = v4(); // unique identifier

    const oldEmail = await UserEmail.findOne({ where: { email, reason } });
    if (oldEmail) {
      UserEmail.delete(oldEmail.id); // delete + create instead of updating uuid, timestamp etc.
    }

    const result = await UserEmail.create({ uuid, email, reason }).save();
    if (result instanceof UserEmail && result.uuid === uuid && result.email === email) {
      uniqeUUID = true;
    }
  }

  return `http://${process.env.DOMAIN}:${process.env.PORT}/user/${reason}/${uuid}`;
};
