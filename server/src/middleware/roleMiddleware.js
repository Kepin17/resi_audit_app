const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;

      if (!userRole) {
        return res.status(403).json({
          status: "error",
          message: "No role specified",
        });
      }

      // Check if user role is in allowed roles
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          status: "error",
          message: "You do not have permission to access this resource",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Role verification failed",
      });
    }
  };
};

module.exports = roleMiddleware;
