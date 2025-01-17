import NavFragment from "../Fragments/NavFragment";

const MainLayout = ({ children }) => {
  return (
    <>
      <header>
        <NavFragment />
      </header>
      <main className="w-full h-[80vh]">{children}</main>
    </>
  );
};

export default MainLayout;
