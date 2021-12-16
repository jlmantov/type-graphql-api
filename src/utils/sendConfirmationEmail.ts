import nodemailer from "nodemailer";
import { getConnection } from "typeorm";
import { v4 } from "uuid";
import { UserEmailConfirmation } from "../entity/UserEmailConfirmation";

/**
 * Use nodemailer to create an email with validation URL in order for user to enable login
 * @param email address to send confirmation email to, before enabling user login
 */
export const sendConfirmationEmail = async (email: string) => {
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

  const url = await createConfirmationUrl(email);

  // send mail with defined transport object
  const mailOptions = {
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    to: email, // list of receivers
    subject: "Hello ✔", // Subject line
    text: "Hello world?", // plain text body
    html: `<b>Please confirm your email.</b><a href="${url}">${url}</a>`, // html body
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

/**
 * Create a new UserEmailConfirmation entity in the database and return the
 * @param email address to send confirmation email to, before enabling user login
 * @returns URL with unique uuidv4
 */
const createConfirmationUrl = async (email: string) => {
  let uuid;
  let uniqeUUID = false; // uuid needs to be unique - there's a good chance it is, but we need to be sure.
  while (!uniqeUUID) {
    uuid = v4(); // unique identifier

    const conn = await getConnection(); // get database connection.
    const result = await conn.getRepository(UserEmailConfirmation).create({ uuid, email }).save();
    console.log("UserEmailConfirmation", JSON.stringify(result));

    if (result instanceof UserEmailConfirmation && result.uuid === uuid && result.email === email) {
      uniqeUUID = true;
    }
  }

  return `http://localhost:4000/user/confirm/${uuid}`;
};
