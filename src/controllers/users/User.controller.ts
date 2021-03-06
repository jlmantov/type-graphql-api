import { Request, Response } from "express";
import { getConnection, Repository } from "typeorm";
import { User } from "../../orm/entity/User";
import logger from "../../utils/middleware/winstonLogger";
import { confirmUserEmail, resetPasswordForm } from "../../utils/sendEmail";
import { verifyPasswordReset } from "../../utils/verifyPasswordReset";

/**
 *
 * @param _req
 * @param res
 */
export const users_get = async (req: Request, res: Response) => {
  const userRepo = getConnection().getRepository("User") as Repository<User>;
  let users;
  if (!!req.params.id) {
    users = await userRepo.findOne(req.params.id);
  } else {
    users = await userRepo.find();
  }
  res.status(200).json({ users: users });
};

/**
 *
 * @param req
 * @param res
 */
export const user_confirmEmail_get = async (req: Request, res: Response) => {
  confirmUserEmail(req, res);
};

/**
 *
 * @param req
 * @param res
 */
export const newPasswordForm_get = async (req: Request, res: Response) => {
  try {
    resetPasswordForm(req, res);
  } catch (error) {
    logger.error(error.message, { label: "newPasswordForm_get", error });
    res.status(400).send(error.name + ": " + error.message);
  }
};

/**
 *
 * @param req
 * @param res
 * @param _next
 */
export const verifyPassword_post = async (req: Request, res: Response) => {
  // http://localhost:4000/user/resetpwd/5052ef22-4d6a-4d29-925a-4856148068c8
  try {
    const success = await verifyPasswordReset(req, res);
    if (!success) {
      res.status(400).send("Attempt to reset password failed!");
    }
    res.clearCookie("jid"); // password changed, refreshToken is no longer valid
    res.clearCookie("roj");
    res.status(200).redirect(`http://${process.env.DOMAIN}:${process.env.PORT}/`);
  } catch (error) {
    res.clearCookie("roj");
    logger.error(error.message, { label: "verifyPassword_post", error });
    res.status(400).send(error.name + ": " + error.message);
  }
};
