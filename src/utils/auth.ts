import jwt, { SignOptions } from "jsonwebtoken";
import { User } from "../entity/User";

/**
 *
 * @param user the user who attempts to login
 * @returns
 */
export const createAccessToken = async (user: User) => {
  const accessPayload = { userId: user.id }; // typesafety - could be: parseInt(user.id.toString())
  const accessOptions: SignOptions = {
    header: { alg: "HS384", typ: "JWT" },
    expiresIn: "15m",
    algorithm: "HS384",
  };
  // console.log("jwt.sign("+ JSON.stringify(payload) +", jwtsecretKey, "+ JSON.stringify(options) +")");
  return await jwt.sign(accessPayload, process.env.JWT_ACCESS_TOKEN_SECRET!, accessOptions);
};

/**
 *
 * @param user the user who attempts to login
 * @returns
 */
export const createRefreshToken = async (user: User) => {
  const refreshPayload = { userId: user.id }; // typesafety - could be: parseInt(user.id.toString())
  const refreshOptions: SignOptions = {
    header: { alg: "HS384", typ: "JWT" },
    expiresIn: "7d",
    algorithm: "HS384",
  };
  // console.log("jwt.sign("+ JSON.stringify(payload) +", jwtsecretKey, "+ JSON.stringify(options) +")");
  return await jwt.sign(refreshPayload, process.env.JWT_REFRESH_TOKEN_SECRET!, refreshOptions);
};

// JSON Web Token secret value related to the server/domain. Used to validate requests
// this should be protected and kept in a .env file - like DB logins etc.
// export const jwtAccessSecretKey =
//   "hIoeVrjXoNF357s4s8Dh4hYpkgiueYkQalsMFP25WSLEQCvOIHt5SkwBxT71zJSOh3aXzbGUlnAESfi3aM6iRkvQNsXDpv8eQfkB" +
//   "3NBt354EfmJMnsLDJPNPgEWp9OVLxcCsb9yFWPAOiJIUzM4NCIsInR5cCI6IkpXVCJ9eyJ1c2VySWQiOjExLCJpYXQiOjE2Mzk1O" +
//   "DE5NDAsImV4cCI6MTYzOTU4Mjg0MH0zksImV4cCI6MTYzOTU4Mjg3OX0MiNDytAoS6GPRdj5Wgq7JDdtr5AT8fSE5GaNmw5v8h4r" +
//   "CEsJVSvrSGYh9Z7vCjDpjExLCJpYXQiOjE2Mzk1ODIwNDcsImV4cCI6MTYzOTU4Mjk0N30DQfQ01Z0bkWRBHcCYNlFTb0tagTZQ7" +
//   "qnTgUDppbRsHGZ9KR8VbXUJYfZl8z2hdPB54NP2RcVUt2ws82C8bNQ6aqeYZQtda652wlvFyDP3QV2BGuzNoVduFnZaYUy9wAefn" +
//   "0X2Ck7STBD6w8XISIjkqDM4cVCH1fGWyervRgtAEaKT77nyeC6NDG1B1gzOu6GXYrFZGtGgfBqaVx9uYDZonekE2LUED3B7lD40S" +
//   "YsNYi1f8bfa6eMJAcqw75Czc2YhKzg9uuTaItUKv3x28U4ygaz1lrN0lPKz3R2ipjXvQ297oPnTRYtBr7fHD5UvSMswJ9ZF3VnN2" +
//   "ldXo8i0eNEc4De8nGIwW1kPoad2GlMWrem563W0cZh8O2VuhoMwYqRr6UMaPhFtqmVmsoq3d5ng1yDF3URcgURJ9HE5rJ7Iv9sUW" +
//   "Ly5TVeih05MRBDzp5PUO11lcCgO7Rg4Z9rq5bzwFysRQiTHygxXAXNZrCMXDp6BkRKSeUX7fkk3A5d83kdke1y9dRR1SxXe6fEge" +
//   "YDc8BLVJQcn3TxbaEMyW58sp1YqlhD279JF9ROpdnNChIB3Cf4OWGibRYmoZzdG4VBSy5iQfWrdUCf7wehSeSwPGAxB6WwvRnwO2" +
//   "WebArTsiRd6L8Nbu0XA4XofB"; // 1024 random characters

// export const jwtRefreshSecretKey =
//   "3NBt354EfmJMnsLDJPNPgEWp9OVLxcCsb9yFWPAOiJIUzM4NCIsInR5cCI6IkpXVCJ9eyJ1c2VySWQiOjExLCJpYXQiOjE2Mzk1O" +
//   "hIoeVrjXoNF357s4s8Dh4hYpkgiueYkQalsMFP25WSLEQCvOIHt5SkwBxT71zJSOh3aXzbGUlnAESfi3aM6iRkvQNsXDpv8eQfkB" +
//   "DE5NDAsImV4cCI6MTYzOTU4Mjg0MH0zksImV4cCI6MTYzOTU4Mjg3OX0MiNDytAoS6GPRdj5Wgq7JDdtr5AT8fSE5GaNmw5v8h4r" +
//   "CEsJVSvrSGYh9Z7vCjDpjExLCJpYXQiOjE2Mzk1ODIwNDcsImV4cCI6MTYzOTU4Mjk0N30DQfQ01Z0bkWRBHcCYNlFTb0tagTZQ7" +
//   "qnTgUDppbRsHGZ9KR8VbXUJYfZl8z2hdPB54NP2RcVUt2ws82C8bNQ6aqeYZQtda652wlvFyDP3QV2BGuzNoVduFnZaYUy9wAefn" +
//   "0X2Ck7STBD6w8XISIjkqDM4cVCH1fGWyervRgtAEaKT77nyeC6NDG1B1gzOu6GXYrFZGtGgfBqaVx9uYDZonekE2LUED3B7lD40S" +
//   "YsNYi1f8bfa6eMJAcqw75Czc2YhKzg9uuTaItUKv3x28U4ygaz1lrN0lPKz3R2ipjXvQ297oPnTRYtBr7fHD5UvSMswJ9ZF3VnN2" +
//   "ldXo8i0eNEc4De8nGIwW1kPoad2GlMWrem563W0cZh8O2VuhoMwYqRr6UMaPhFtqmVmsoq3d5ng1yDF3URcgURJ9HE5rJ7Iv9sUW" +
//   "Ly5TVeih05MRBDzp5PUO11lcCgO7Rg4Z9rq5bzwFysRQiTHygxXAXNZrCMXDp6BkRKSeUX7fkk3A5d83kdke1y9dRR1SxXe6fEge" +
//   "YDc8BLVJQcn3TxbaEMyW58sp1YqlhD279JF9ROpdnNChIB3Cf4OWGibRYmoZzdG4VBSy5iQfWrdUCf7wehSeSwPGAxB6WwvRnwO2" +
//   "WebArTsiRd6L8Nbu0XA4XofB"; // 1024 random characters
