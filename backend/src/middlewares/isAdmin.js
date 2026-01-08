export const isAdmin = (req, res, next) => {
  const user = req.user; // comes from JWT auth middleware
  if (!user) return res.status(401).json({ message: "Not logged in" });
  if (user.role !== "admin")
    return res.status(403).json({ message: "Forbidden: Admins only" });
  next();
};
