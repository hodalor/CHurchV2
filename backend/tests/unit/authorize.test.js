const {
  authorizePermissions,
  authorizeRoles,
} = require("../../src/middleware/authorize");

describe("authorize middleware", () => {
  it("allows requests when required permissions are present", () => {
    const middleware = authorizePermissions("members:write");
    const req = {
      user: {
        permissions: ["members:write"],
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects requests missing a required role", () => {
    const middleware = authorizeRoles("admin");
    const req = {
      user: {
        roles: ["member"],
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
