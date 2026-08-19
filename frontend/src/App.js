import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AuthGate />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function AuthGate() {
  const { authUser, authLoading } = useAuth();

  if (authLoading) {
    return <div className="empty-note page-loader">Loading session...</div>;
  }

  return authUser ? <AppLayout /> : <LoginPage />;
}
