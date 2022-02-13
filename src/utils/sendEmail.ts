import { Request, Response } from "express";
import nodemailer from "nodemailer";
import { getConnection, Repository } from "typeorm";
import { v4 } from "uuid";
import { User } from "../orm/entity/User";
import { UserEmail } from "../orm/entity/UserEmail";
import { CONFIRMUSER, RESETPWD } from "../routes/user";
import { createResetPasswordToken } from "./auth";
import HttpError from "./httpError";
import logger from "./middleware/winstonLogger";
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
  const emailRepo = getConnection().getRepository("UserEmail") as Repository<UserEmail>;
  const userConfirmation = await emailRepo.findOne({
    where: { uuid: req.params.id, reason: CONFIRMUSER },
  });
  if (userConfirmation === undefined) {
    res.status(400).send("Expired or unknown id, please register again");
  } else {
    const userRepo = getConnection().getRepository("User") as Repository<User>;
    const user = await userRepo.findOne({ where: { email: userConfirmation.email } });
    if (!user) {
      res.status(400).send("Not found");
    } else {
      const success = await userRepo.update(user.id, { confirmed: true });
      if (success.affected === 1) {
        // only cleanup if user login was actually enabled
        await emailRepo.delete(userConfirmation.id);
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
  const emailRepo = getConnection().getRepository("UserEmail") as Repository<UserEmail>;
  const userReset = await emailRepo.findOne({ where: { uuid: req.params.id, reason: RESETPWD } });
  if (userReset === undefined) {
    res.status(400).json({ error: "Expired or unknown id, please reset again!" });
  } else {
    const userRepo = getConnection().getRepository("User") as Repository<User>;
    const user = await userRepo.findOne({
      where: { email: userReset.email },
    });
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
  // logger.debug("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  // TO DO - log nodemailer link to DB instead of console.log
  const testMsgUrl = await nodemailer.getTestMessageUrl(info);
  logger.info(mailOptions.subject +". Nodemailer preview URL: " + testMsgUrl);
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
  const emailRepo = getConnection().getRepository("UserEmail") as Repository<UserEmail>;

  // there is a theoretical chance that uuid already exists, not likely though
  while (!uniqeUUID) {
    uuid = await v4(); // unique identifier
    const uuidDoublet = await emailRepo.findOne({ where: { uuid } });
    if (!uuidDoublet) {
      uniqeUUID = true;
    }
  }

  const oldEmail = await emailRepo.findOne({ where: { email, reason } });
  if (oldEmail) {
    logger.debug("emailRepo.delete(" + oldEmail.id + ")");
    await emailRepo.delete(oldEmail.id); // delete + create instead of updating uuid, timestamp etc.
  }

  const result = await emailRepo.create({ email, reason, uuid }).save();
  if (result?.email !== email || result?.reason !== reason || result?.uuid !== uuid) {
    logger.error("emailRepo.create ERROR - result:", result);
    throw new HttpError(500, "InternalServerError", "Creating new email failed", { label: "createEmailUrl" });
  }

  return `http://${process.env.DOMAIN}:${process.env.PORT}/user/${reason}/${uuid}`;
};
