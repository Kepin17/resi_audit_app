import React from "react";
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

  const loginHandler = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    axios
      .post(`${urlApi}/api/v1/auth/login`, loginData)
      .then((res) => {
        setSuccess(true);
        const getToken = res.data.yourToken;
        localStorage.setItem("token", getToken);
        const decodeToken = jwtDecode(getToken);
        const allowedRoles = ["admin", "superadmin"];

        setTimeout(() => {
          if (allowedRoles.includes(decodeToken.role)) {
            window.location.href = "/admin";
          } else {
            window.location.href = "/admin";
          }
        }, 1000);
      })
      .catch((err) => {
        if (err.response) {
          setError(err.response.data.message || "Login gagal. Periksa username dan password.");
        } else if (err.request) {
          setError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
        } else {
          setError("Terjadi kesalahan. Silakan coba lagi.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <>
      <AuthLayout onSubmit={loginHandler}>
        <div className="space-y-6">
          <InputFragment
            htmlFor={"username"}
            InputType="text"
            inputName={"username"}
            inputValue={loginData.username}
            inputOnChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
            className={`transform transition-all duration-300 focus:scale-105 ${error ? "border-red-300" : ""}`}
          >
            Username
          </InputFragment>

          <InputFragment
            htmlFor={"password"}
            InputType={"password"}
            inputName={"password"}
            inputValue={loginData.password}
            inputOnChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
            className={`transform transition-all duration-300 focus:scale-105 ${error ? "border-red-300" : ""}`}
          >
            Password
          </InputFragment>

          {error && <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-md border border-red-200">{error}</div>}

          {success && <div className="text-green-500 text-sm font-medium bg-green-50 p-3 rounded-md border border-green-200">Login berhasil! Mengalihkan...</div>}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium
              transform transition-all duration-300 hover:bg-blue-700 hover:scale-105
              disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <FaSpinner className="animate-spin" />
                Memproses...
              </>
            ) : (
              "Masuk"
            )}
          </button>

          <div className="note-section bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 p-4 flex flex-col gap-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
            <SubChapter titleStyle="text-md font-bold flex items-center gap-2">
              <IoIosWarning className="text-2xl text-orange-400" />
              <span className="text-orange-700">Catatan :</span>
            </SubChapter>
            <p className="text-gray-700 font-medium">Jika anda lupa password, silahkan hubungi admin</p>
          </div>
        </div>
      </AuthLayout>
    </>
  );
};

export default LoginPage;
