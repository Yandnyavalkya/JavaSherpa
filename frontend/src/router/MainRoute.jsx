import React, { lazy, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const Home = lazy(() => import("../pages/home/Home"));
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const About = lazy(() => import("../pages/about/About"));
const Default = lazy(() => import("../pages/default/Default"));
const BotList = lazy(() =>
  import("../pages/default/components/BotList/BotList")
);
const FileUpload = lazy(() =>
  import("../pages/default/components/FileUpload/FileUpload")
);
const ChatPage = lazy(() =>
  import("../pages/default/components/ChatPage/ChatPage")
);

// Automatically scrolls to top on every route change
const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [location.pathname, location.search]);

  return null;
};

const MainRoute = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/default"
          element={
            <ProtectedRoute>
              <Default />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="bot-list" />} />

          <Route path="bot-list" element={<BotList />} />
          <Route path="doc-upload" element={<FileUpload />} />
          <Route path="chat" element={<ChatPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default MainRoute;
