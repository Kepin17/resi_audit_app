import React from "react";
import Form from "../Elements/Form";
import SubTitle from "../Elements/SubTitle";
import Button from "../Elements/Button";
import { CiLogin } from "react-icons/ci";
import { FaDoorClosed } from "react-icons/fa";

const AuthLayout = ({ children, onSubmit }) => {
  return (
    <div className="w-full h-screen relative">
      <Form
        formStyle="w-[23rem] h-auto rounded-md shadow-2xl border-2 border-slate-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
      flex flex-col gap-5 p-5
      "
        onSubmit={onSubmit}
      >
        <div className="w-full h-1/6 flex items-center justify-center">
          <SubTitle titleStyle="text-2xl font-bold flex items-center gap-2">
            <FaDoorClosed />
            Login
          </SubTitle>
        </div>
        {children}
        <Button>
          <CiLogin className="text-xl" />
          Masuk
        </Button>
      </Form>
    </div>
  );
};

export default AuthLayout;
