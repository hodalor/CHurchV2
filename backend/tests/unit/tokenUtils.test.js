const {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require("../../src/utils/tokenUtils");

describe("tokenUtils", () => {
  it("creates and verifies an access token", () => {
    const token = createAccessToken({ sub: "user-1" });

    expect(verifyAccessToken(token)).toEqual(
      expect.objectContaining({
        sub: "user-1",
      })
    );
  });

  it("creates a refresh token family and verifies the token", () => {
    const refresh = createRefreshToken({ sub: "user-2" });

    expect(refresh.familyId).toEqual(expect.any(String));
    expect(refresh.expiresAt).toBeInstanceOf(Date);
    expect(verifyRefreshToken(refresh.token)).toEqual(
      expect.objectContaining({
        sub: "user-2",
        familyId: refresh.familyId,
      })
    );
  });

  it("hashes tokens deterministically", () => {
    expect(hashToken("sample-token")).toBe(hashToken("sample-token"));
  });
});
