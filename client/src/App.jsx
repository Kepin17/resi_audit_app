import { Route, Routes } from "react-router-dom";
import "./App.css";
import HomePage from "./Components/Pages/Home";
import LoginPage from "./Components/Pages/Auth/Login";
import ProtectedRoute from "./Components/Auth/ProtectedRoute";
import PublicRoute from "./Components/Auth/PublicRoute";
import AdminProtectedRoute from "./Components/Auth/AdminProtectedRoute";
import AdminDashboard from "./Components/Pages/Admin/AdminDashboard";
import AdminBarangSection from "./Components/Pages/Admin/BarangManagement";
import KategoriPage from "./Components/Pages/Admin/KategoriPage";
import StaffManagementPage from "./Components/Pages/Admin/StaffManagementPage";

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
          path="/admin/barang/kategori"
          element={
            <AdminProtectedRoute>
              <KategoriPage />
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
      </Routes>
    </>
  );
}

export default App;
