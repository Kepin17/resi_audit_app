import { Route, Routes } from "react-router-dom";
import "./App.css";
import HomePage from "./Components/Pages/Home";
import LoginPage from "./Components/Pages/Auth/Login";
import ProtectedRoute from "./Components/Auth/ProtectedRoute";
import PublicRoute from "./Components/Auth/PublicRoute";
import AdminProtectedRoute from "./Components/Auth/AdminProtectedRoute";
import AdminDashboard from "./Components/Pages/Admin/AdminDashboard";
import AdminBarangSection from "./Components/Pages/Admin/BarangManagement";
import StaffManagementPage from "./Components/Pages/Admin/StaffManagementPage";
import LogLoginPage from "./Components/Pages/Admin/Log/LogLoginPage";
import PackSalary from "./Components/Pages/Admin/PackSalary";
import PickoutPage from "./Components/Pages/Home/PickoutPage";
import { jwtDecode } from "jwt-decode";
import PackingPage from "./Components/Pages/Home/PackingPage";
import { useEffect, useState } from "react";
import ReturBarang from "./Components/Pages/Admin/ReturBarangPage";
import ReturBarangPage from "./Components/Pages/Home/ReturBarang";
import LogisticPage from "./Components/Pages/Admin/Logistic";
function App() {
  const [getRole, setRole] = useState("");
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        const role = decodedToken.roles;
        setRole(role);
        const currentTime = Date.now() / 1000;
        if (decodedToken.exp < currentTime) {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
      } catch (error) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
  }, []);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {getRole.includes("picker") ? (
                <HomePage />
              ) : getRole.includes("packing") ? (
                <PackingPage />
              ) : getRole.includes("pickout") ? (
                <PickoutPage />
              ) : getRole.includes("retur_barang") ? (
                <ReturBarangPage />
              ) : getRole.includes("admin") || getRole.includes("superadmin") ? (
                <AdminDashboard />
              ) : (
                ""
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/packing"
          element={
            <ProtectedRoute>
              <PackingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pickout"
          element={
            <ProtectedRoute>
              <PickoutPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/retur-barang"
          element={
            <ProtectedRoute>
              <ReturBarangPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        <Route path="/admin" element={<AdminProtectedRoute>{getRole.includes("superadmin") ? <AdminDashboard /> : getRole.includes("admin") ? <AdminBarangSection /> : ""}</AdminProtectedRoute>} />

        <Route
          path="/admin/barang"
          element={
            <AdminProtectedRoute>
              <AdminBarangSection />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/staff"
          element={
            <AdminProtectedRoute>
              <StaffManagementPage />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/staff/log-login"
          element={
            <AdminProtectedRoute>
              <LogLoginPage />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/staff/packer-salary"
          element={
            <AdminProtectedRoute>
              <PackSalary />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/retur-barang"
          element={
            <AdminProtectedRoute>
              <ReturBarang />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/logictic_management"
          element={
            <AdminProtectedRoute>
              <LogisticPage />
            </AdminProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
