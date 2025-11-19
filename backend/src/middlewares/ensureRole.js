import jwt from "jsonwebtoken";

export const ensureRole = (roles) => {
  // normalize allowed roles once
  const allowed = (roles || []).map((r) => String(r).toLowerCase());

  return (req, res, next) => {
    try {
      const authHeader = req.header("Authorization");
      const token = authHeader?.replace("Bearer ", "") || null;

      if (!token) {
        console.warn("ensureRole: No token provided");
        return res.status(401).json({ error: "No token provided" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // attach decoded token to req.user for downstream handlers
      req.user = decoded;

      const userRole = (decoded.role || decoded.role === 0) ? String(decoded.role).toLowerCase() : null;

      console.debug("ensureRole: required=", allowed, "userRole=", userRole);

      if (!userRole || !allowed.includes(userRole)) {
        console.warn("ensureRole: Access denied for role", decoded.role);
        return res.status(403).json({ error: "Access denied." });
      }

      return next();
    } catch (error) {
      console.error("Auth error:", error.message || error);
      return res.status(401).json({ error: "Invalid token" });
    }
  };
};
