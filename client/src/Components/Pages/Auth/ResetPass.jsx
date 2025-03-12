import React from "react";
import Form from "../../Elements/Form";
import InputFragment from "../../Fragments/InputFragment";
import { Button } from "antd";
import { LockOutlined } from "@ant-design/icons";

const ResetPass = () => {
  return (
    <div className="w-full h-screen flex justify-center items-center bg-gradient-to-br from-slate-100 to-white">
      <div className="w-[420px] h-auto min-h-[450px] bg-white shadow-lg flex flex-col justify-center items-center rounded-xl relative overflow-hidden">
        <div className="absolute top-0 w-full h-auto py-6 bg-gradient-to-r from-slate-800 to-slate-700 flex flex-col justify-center items-center">
          <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-center text-slate-300 px-4">Yuk Reset Password Kamu Tiap Bulan Agar Lebih Aman!</p>
        </div>
        <Form formStyle={`w-4/5 absolute top-36 h-auto mt-5 flex flex-col justify-center items-center gap-6`}>
          <div className="relative w-full">
            <LockOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <InputFragment
              htmlFor={"oldPassword"}
              InputType={"password"}
              inputName={"oldPassword"}
              className={`pl-10 h-12 w-full backdrop-blur-sm bg-white/90 border border-gray-200 focus:border-blue-500 focus:ring-blue-500 transform transition-all duration-300 rounded-lg`}
            >
              Password Lama
            </InputFragment>
          </div>

          <div className="relative w-full">
            <LockOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <InputFragment
              htmlFor={"newPassword"}
              InputType={"password"}
              inputName={"newPassword"}
              className={`pl-10 h-12 w-full backdrop-blur-sm bg-white/90 border border-gray-200 focus:border-blue-500 focus:ring-blue-500 transform transition-all duration-300 rounded-lg`}
            >
              Password Baru
            </InputFragment>
          </div>

          <Button className="w-full h-12 mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg">Reset Password</Button>
        </Form>
      </div>
    </div>
  );
};

export default ResetPass;
