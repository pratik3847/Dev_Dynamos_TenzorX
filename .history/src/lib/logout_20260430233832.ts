import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { sessionStore } from "@/lib/session-store";

export const useLogoutHandler = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return async function handleLogout() {
    sessionStore.clearAll();
    localStorage.removeItem("healthcare_token");
    signOut();
    navigate("/login");
  };
};
