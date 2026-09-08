const { applySecurityHeaders, createRateLimiter } = require("../../src/middleware/security");

describe("security middleware", () => {
  it("applies baseline security headers", () => {
    const headers = {};
    const req = {};
    const res = {
      setHeader(name, value) {
        headers[name] = value;
      },
    };
    const next = jest.fn();

    applySecurityHeaders(req, res, next);

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("blocks requests after the configured rate limit is exceeded", () => {
    const limiter = createRateLimiter({
      keyPrefix: "login",
      windowMs: 60_000,
      maxRequests: 2,
      message: "Too many requests",
    });
    const req = {
      ip: "127.0.0.1",
      body: {
        churchId: "demo",
        username: "user",
      },
    };
    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ message: "Too many requests" });
  });
});
