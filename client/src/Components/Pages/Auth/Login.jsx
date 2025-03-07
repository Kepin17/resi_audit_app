import React, { useState, useEffect } from "react";
import AuthLayout from "../../Layouts/AuthLayout";
import InputFragment from "../../Fragments/InputFragment";
import { IoIosWarning } from "react-icons/io";
import { FaSpinner } from "react-icons/fa";
import SubChapter from "../../Elements/SubChapter";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import urlApi from "../../../utils/url";

const LoginPage = () => {
  const [loginData, setLoginData] = React.useState({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [timeoutRemaining, setTimeoutRemaining] = useState(0);

  useEffect(() => {
    // Trigger animation after component mount
    setTimeout(() => setAnimateIn(true), 100);

    // Check for existing timeout
    const checkTimeout = () => {
      const timeoutData = localStorage.getItem("loginTimeout");
      if (timeoutData) {
        const { expiry } = JSON.parse(timeoutData);
        const now = Date.now();
        if (now < expiry) {
          setTimeoutRemaining(Math.ceil((expiry - now) / 1000));
          return true;
        } else {
          localStorage.removeItem("loginTimeout");
        }
      }
      return false;
    };

    // Update countdown timer
    const timer = setInterval(() => {
      if (timeoutRemaining > 0) {
        setTimeoutRemaining((prev) => prev - 1);
      } else {
        checkTimeout();
      }
    }, 1000);

    checkTimeout();
    return () => clearInterval(timer);
  }, []);

  const loginHandler = (e) => {
    e.preventDefault();

    // Check if we're in timeout
    if (timeoutRemaining > 0) {
      setError(`Terlalu banyak percobaan. Silakan tunggu ${timeoutRemaining} detik.`);
      return;
    }

    setIsLoading(true);
    setError("");

    axios
      .post(`${urlApi}/api/v1/auth/login`, loginData)
      .then((res) => {
        setSuccess(true);
        localStorage.removeItem("loginAttempts");
        localStorage.removeItem("loginTimeout");
        const getToken = res.data.yourToken;
        localStorage.setItem("token", getToken);
        const decodeToken = jwtDecode(getToken);
        const allowedRoles = ["admin", "superadmin"];

        setTimeout(() => {
          if (allowedRoles.includes(decodeToken.role)) {
            window.location.href = "/admin";
          } else {
            window.location.href = "/";
          }
        }, 1000);
      })
      .catch((err) => {
        // Handle failed login attempt
        const attempts = Number(localStorage.getItem("loginAttempts") || 0) + 1;
        localStorage.setItem("loginAttempts", attempts);

        if (attempts >= 3) {
          const timeoutMinutes = Math.pow(3, Math.floor(attempts / 3));
          const expiry = Date.now() + timeoutMinutes * 60 * 1000;
          localStorage.setItem(
            "loginTimeout",
            JSON.stringify({
              expiry,
              attempts,
            })
          );
          setTimeoutRemaining(timeoutMinutes * 60);
          setError(`Terlalu banyak percobaan. Silakan tunggu ${timeoutMinutes} menit.`);
        } else {
          if (err.response) {
            setError(`${err.response.data.message || "Login gagal. Periksa username dan password."} (Percobaan ${attempts} dari 3)`);
          } else if (err.request) {
            setError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
          } else {
            setError("Terjadi kesalahan. Silakan coba lagi.");
          }
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <>
      <div className={`transition-all duration-700 ${animateIn ? "opacity-100" : "opacity-0"}`}>
        <AuthLayout onSubmit={loginHandler}>
          <div className="space-y-6 relative z-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">Login Dashboard</h1>
              <p className="text-gray-400 mt-2">Enter your credentials to continue</p>
            </div>

            <div className="relative group mb-6">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
              <div className="relative bg-white rounded-lg p-5">
                <div className="space-y-6">
                  <div className="relative">
                    <InputFragment
                      htmlFor={"username"}
                      InputType="text"
                      inputName={"username"}
                      inputValue={loginData.username}
                      inputOnChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      className={`pl-10 backdrop-blur-sm bg-white/90  border-transparent focus:border-blue-500 focus:ring-blue-500 transform transition-all duration-300 ${error ? "border-red-300" : ""}`}
                    >
                      Username
                    </InputFragment>
                  </div>

                  <div className="relative">
                    <InputFragment
                      htmlFor={"password"}
                      InputType={"password"}
                      inputName={"password"}
                      inputValue={loginData.password}
                      inputOnChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className={`pl-10 backdrop-blur-sm bg-white/90 border-transparent focus:border-blue-500 focus:ring-blue-500 transform transition-all duration-300 ${error ? "border-red-300" : ""}`}
                    >
                      Password
                    </InputFragment>
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="text-red-500 text-sm font-medium bg-red-50 p-4 rounded-md border-l-4 border-red-500 ">{error}</div>}

            {success && <div className="text-green-500 text-sm font-medium bg-green-50 p-4 rounded-md border-l-4 border-green-500 ">Login berhasil! Mengalihkan...</div>}

            {timeoutRemaining > 0 && (
              <div className="text-red-500 text-sm font-medium bg-red-50 p-4 rounded-md border-l-4 border-red-500">
                Akun terkunci. Silakan tunggu {Math.floor(timeoutRemaining / 60)}:{(timeoutRemaining % 60).toString().padStart(2, "0")} menit
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-md font-medium
                transform transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30
                disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              <span className="absolute top-0 left-0 w-full h-full bg-white/20 transform -skew-x-45 -translate-x-full transition-transform duration-1000 ease-out group-hover:translate-x-full"></span>
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>

            <div className="note-section backdrop-blur-sm bg-gradient-to-r from-amber-50/90 to-orange-50/90 border border-orange-200 p-5 flex flex-col gap-3 rounded-lg shadow-sm hover:shadow-orange-200/50 hover:shadow-md transition-all duration-300">
              <SubChapter titleStyle="text-md font-bold flex items-center gap-2">
                <IoIosWarning className="text-2xl text-orange-400" />
                <span className="text-orange-700">Catatan :</span>
              </SubChapter>
              <p className="text-gray-700 font-medium">Jika anda lupa password, silahkan hubungi IT Team</p>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </AuthLayout>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </>
  );
};

export default LoginPage;
