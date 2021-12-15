import argon2 from "argon2";
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
    return error;
  }
};

/**
 * When hashed password is produced, the options used for hashing is included in the result.
 * The whole response from argon2.hash(...) is used as input here
 * @param hashedPwd string produced by argon2.hash, incl. hashing options
 * @param pwd string password provided by user
 * @returns true/false
 */
export const verify = async (pwd: string, hashedPwd: string): Promise<boolean> => {
  try {
    if (await argon2.verify(params + hashedPwd, pwd)) {
      return true; // password match
    } else {
      return false; // password did not match
    }
  } catch (err) {
    console.error(err); // internal failure
    // return err;
    return false;
  }
};

// JSON Web Token secret value related to the server/domain. Used to validate requests
// this should be protected and kept in a .env file - like DB logins etc.
export const jwtsecretKey =
  "hIoeVrjXoNF357s4s8Dh4hYpkgiueYkQalsMFP25WSLEQCvOIHt5SkwBxT71zJSOh3aXzbGUlnAESfi3aM6iRkvQNsXDpv8eQfkB" +
  "3NBt354EfmJMnsLDJPNPgEWp9OVLxcCsb9yFWPAOiJIUzM4NCIsInR5cCI6IkpXVCJ9eyJ1c2VySWQiOjExLCJpYXQiOjE2Mzk1O" +
  "DE5NDAsImV4cCI6MTYzOTU4Mjg0MH0zksImV4cCI6MTYzOTU4Mjg3OX0MiNDytAoS6GPRdj5Wgq7JDdtr5AT8fSE5GaNmw5v8h4r" +
  "CEsJVSvrSGYh9Z7vCjDpjExLCJpYXQiOjE2Mzk1ODIwNDcsImV4cCI6MTYzOTU4Mjk0N30DQfQ01Z0bkWRBHcCYNlFTb0tagTZQ7" +
  "qnTgUDppbRsHGZ9KR8VbXUJYfZl8z2hdPB54NP2RcVUt2ws82C8bNQ6aqeYZQtda652wlvFyDP3QV2BGuzNoVduFnZaYUy9wAefn" +
  "0X2Ck7STBD6w8XISIjkqDM4cVCH1fGWyervRgtAEaKT77nyeC6NDG1B1gzOu6GXYrFZGtGgfBqaVx9uYDZonekE2LUED3B7lD40S" +
  "YsNYi1f8bfa6eMJAcqw75Czc2YhKzg9uuTaItUKv3x28U4ygaz1lrN0lPKz3R2ipjXvQ297oPnTRYtBr7fHD5UvSMswJ9ZF3VnN2" +
  "ldXo8i0eNEc4De8nGIwW1kPoad2GlMWrem563W0cZh8O2VuhoMwYqRr6UMaPhFtqmVmsoq3d5ng1yDF3URcgURJ9HE5rJ7Iv9sUW" +
  "Ly5TVeih05MRBDzp5PUO11lcCgO7Rg4Z9rq5bzwFysRQiTHygxXAXNZrCMXDp6BkRKSeUX7fkk3A5d83kdke1y9dRR1SxXe6fEge" +
  "YDc8BLVJQcn3TxbaEMyW58sp1YqlhD279JF9ROpdnNChIB3Cf4OWGibRYmoZzdG4VBSy5iQfWrdUCf7wehSeSwPGAxB6WwvRnwO2" +
  "WebArTsiRd6L8Nbu0XA4XofB"; // 1024 random characters
