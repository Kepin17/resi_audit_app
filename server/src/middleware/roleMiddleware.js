const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user has roles array in token
      if (!req.user || !req.user.roles || !Array.isArray(req.user.roles)) {
        return res.status(403).json({
          status: "error",
          message: "No roles found for user",
        });
      }

      // Check if user has any of the allowed roles
      const hasAllowedRole = req.user.roles.some((userRole) => allowedRoles.includes(userRole));

      if (!hasAllowedRole) {
        return res.status(403).json({
          status: "error",
          message: "You don't have permission to access this resource",
        });
      }

      next();
    } catch (error) {
      console.error("Role middleware error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error in role verification",
      });
    }
  };
};

module.exports = roleMiddleware;
