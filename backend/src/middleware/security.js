const rateLimitState = new Map();

function applySecurityHeaders(req, res, next) {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https: http:;"
  );
  next();
}

function createRateLimiter({ keyPrefix, windowMs, maxRequests, message }) {
  return (req, res, next) => {
    const requestKey = `${keyPrefix}:${req.ip}:${String(req.body?.churchId || "").trim().toLowerCase()}:${String(req.body?.username || "").trim().toLowerCase()}`;
    const now = Date.now();
    const existing = rateLimitState.get(requestKey);

    if (!existing || existing.expiresAt <= now) {
      rateLimitState.set(requestKey, {
        count: 1,
        expiresAt: now + windowMs,
      });
      return next();
    }

    if (existing.count >= maxRequests) {
      return res.status(429).json({
        message,
      });
    }

    existing.count += 1;
    rateLimitState.set(requestKey, existing);
    return next();
  };
}

module.exports = {
  applySecurityHeaders,
  createRateLimiter,
};
