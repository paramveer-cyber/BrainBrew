export const adminMiddleware = (req, res, next) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(503).json({ message: "Admin access not configured on this server." });
  }

  const provided = req.headers["x-admin-password"];
  if (!provided || provided !== adminPassword) {
    return res.status(403).json({ message: "Invalid admin credentials." });
  }

  next();
};
