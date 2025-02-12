import { jwtDecode } from "jwt-decode";
import React from "react";
import { Navigate } from "react-router-dom";

const AdminProtectedRoute = ({ children }) => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      return <Navigate to="/" replace />;
    }

    const decodeToken = jwtDecode(token);
    const allowedRoles = ["admin", "superadmin"];

    const hasAdminAccess = decodeToken.roles.some((role) => allowedRoles.includes(role));

    if (!hasAdminAccess) {
      return <Navigate to="/" replace />;
    }

    return children;
  } catch (error) {
    console.error("Error in AdminProtectedRoute:", error);
    localStorage.removeItem("token");
    return <Navigate to="/" replace />;
  }
};

export default AdminProtectedRoute;
