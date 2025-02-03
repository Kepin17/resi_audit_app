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

function App() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
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

        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />

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
      </Routes>
    </>
  );
}

export default App;
