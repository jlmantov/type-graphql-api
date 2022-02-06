import argon2 from "argon2";
import HttpError from "./httpError";
// Maybe tis will cange in the future - for now, argon2 is isolated in this file.

/**
 * argon2 options used to produce/verify argon2 hashed passwords
 * Security is leveled up:
 *  - type: argon2i changed to argon2id - resistant against both GPU and tradeoff attacks
 *  - default memoryCost 2^12 (untouched)
 *  - default timeCost 3 (untouched)
 *  - default parallelism 1 (untouched)
 *  - default version 19 (untouched)
 *  - default hash length 32  (untouched)
 * https://github.com/ranisalt/node-argon2/wiki/Options
 */
const argon2idOptions = {
  type: argon2.argon2id,
  memoryCost: 2 ** 12,
  timeCost: 3,
  parallelism: 1,
  version: 19,
  hashLength: 32,
};
const params = "$argon2id$v=19$m=4096,t=3,p=1$"; // length 30

/**
 * @param pwd  String - password to be hashed (encrypted)
 * @returns String - hashedPassword - salt + password, both base64 encoded
 */
export const hash = async (pwd: string): Promise<string> => {
  try {
    const resp = await argon2.hash(pwd, argon2idOptions);
    // $argon2id$v=19$m=4096,t=3,p=1$smAS+XYvkFiGikkKFpD2Qw$nGn4AGRkBjuW3w9Iv7nzsMxRAiKbJNsZWDaXY0cOels
    // type: argon2id
    // version: : v=19
    // memoryCost: m=4096
    // timeCost: t=3
    // parallelism: p=1
    // base64 encoded salt: smAS+XYvkFiGikkKFpD2Qw (https://github.com/ranisalt/node-argon2/issues/76)
    // base64 encoded hash: nGn4AGRkBjuW3w9Iv7nzsMxRAiKbJNsZWDaXY0cOels
    const respValues = resp.split("$");

    return respValues[4] + "$" + respValues[5]; // base64 encoded salt + base64 encoded passwordhash
  } catch (error) {
    throw new HttpError(500, "EncryptionError", "Password encryption failed", error); // anonymous error, user might be looking for a vulnerabilities
  }
};

/**
 * When hashed password is produced, the options used for hashing is included in the result.
 * The whole response from argon2.hash(...) is used as input here
 * @param hashedPwd string produced by argon2.hash, incl. hashing options
 * @param pwd string password provided by user
 * @returns true/false
 */
export const verifyPwd = async (pwd: string, hashedPwd: string): Promise<boolean> => {
  try {
    if (await argon2.verify(params + hashedPwd, pwd)) {
      return true; // password match
    } else {
      return false; // password did not match
    }
  } catch (error) {
      throw new HttpError(400, "BadRequestError", "Invalid password", error); // anonymous error, user might be looking for a vulnerabilities
  }
};

