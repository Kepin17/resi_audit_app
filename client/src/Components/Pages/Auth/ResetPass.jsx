import React, { useEffect, useState } from "react";
import Form from "../../Elements/Form";
import InputFragment from "../../Fragments/InputFragment";
import Button from "../../Elements/Button";
import axios from "axios";
import urlApi from "../../../utils/url";
import { jwtDecode } from "jwt-decode";
import { message } from "antd";

const ResetPass = () => {
  const [formData, setFormData] = useState({ oldPassword: "", newPassword: "" });

  const handleResetPass = (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const decoded = jwtDecode(token);
    console.log(decoded);

    axios
      .put(
        `${urlApi}/api/v1/auth/reset-pass/${decoded.id_pekerja}`,
        {
          id_pekerja: decoded.id_pekerja,
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then((res) => {
        localStorage.removeItem("token");
        window.location.href = "/login";
      })
      .catch((err) => {
        message.error(err.response.data.message);
      });
  };

  return (
    <div className="w-full min-h-screen flex justify-center items-center bg-gradient-to-br from-blue-50 to-slate-50 p-4">
      <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-xl flex flex-col relative overflow-hidden">
        <div className="w-full h-auto py-8 bg-gradient-to-r from-blue-600 to-blue-400 flex flex-col justify-center items-center px-6">
          <h1 className="text-3xl font-bold text-white mb-3">Reset Password</h1>
          <p className="text-center text-blue-100 text-sm">Amankan akun Anda dengan memperbarui password secara berkala</p>
        </div>

        <Form formStyle="w-full px-6 py-8 mt-4 flex flex-col gap-6" onSubmit={handleResetPass}>
          <div className="space-y-6">
            <div className="relative w-full">
              <InputFragment
                htmlFor={"oldPassword"}
                InputType={"password"}
                inputName={"oldPassword"}
                inputValue={formData.oldPassword}
                inputOnChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
                className="pl-10 h-14 w-full bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl transition-all duration-300"
              >
                Password Lama
              </InputFragment>
            </div>

            <div className="relative w-full">
              <InputFragment
                htmlFor={"newPassword"}
                InputType={"password"}
                inputName={"newPassword"}
                inputValue={formData.newPassword}
                inputOnChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="pl-10 h-14 w-full bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl transition-all duration-300"
              >
                Password Baru
              </InputFragment>
            </div>
          </div>

          <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20">Perbarui Password</Button>
        </Form>
      </div>
    </div>
  );
};

export default ResetPass;
