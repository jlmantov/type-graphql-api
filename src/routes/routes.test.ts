import request from "supertest";
import app from "../app";

/**
 * inpired by Sam Meech-Ward - Testing Node Server with Jest and Supertest
 * https://www.youtube.com/watch?v=FKnzS_icp20
 *
 * Supertest readme: https://github.com/visionmedia/supertest#readme
 * Express GET : https://expressjs.com/en/4x/api.html#app.get.method
 * Express POST: https://expressjs.com/en/4x/api.html#app.post.method
 *
 * src/index.ts endpoints:
 * GET  "/" - landing page
 * POST "/renew_accesstoken" - requires cookie with refreshToken.
 */
describe("Main routes - Landingpage + Renew Access token", () => {
  test("GET / - should return a simple 'hello' string", async () => {
    const response = await request(app).get("/");
    expect(response.statusCode).toBe(200);
    // console.log("response", JSON.stringify(response.text));
    expect(response.text).toEqual("hello");
  });

  // describe("POST /users/ - requires cookie with refreshToken", () => {
  //   test("cookie missing - failure", async () => {
  //     //
  //   });
  // });

  describe("POST /renew_accesstoken - requires cookie with refreshToken", () => {
    test("cookie missing - failure", async () => {
      const res = await request(app).post("/renew_accesstoken").send({}); // cookie is required
      expect(res.statusCode).toEqual(400);
      console.log("response.body: ", res.body);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toEqual("Access denied!");
    });

    test("should fail on invalid payload in cookie", () => {
      //
    });

    test("should fail on refreshToken expired!", async () => {
      // old token - should fail with response message and cookie deleted in response
      const oldRefreshToken =
        "eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJrZXciOjEsInRhcyI6MCwiaWF0IjoxNjQwNjg4MjYwLCJleHAiOjE2NDEyOTMwNjB9.ZUC-qxsuegFr9XVAkAWQKrdMIF3UasxwoLlur5w-2AdKT2F1UwAQPI-jP6ASMPOr";

      const res = await request(app).post("/renew_accesstoken")
        .set("Cookie", `jid=${oldRefreshToken}`)
        .send();
      expect(res.statusCode).toEqual(400);
      // console.log("response.body: ", res.body);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toEqual("jwt expired");
    });

    test("should succedd on valid payload in cookie", () => {
      //
    });
  });
});
