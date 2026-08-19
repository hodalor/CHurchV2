import { APP_NAME } from "../../data/mockData";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

export default function Topbar() {
  const { branding, members, ministries } = useAppContext();
  const { authUser, logout } = useAuth();
  const initials = (authUser?.displayName || "CA")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="topbar">
      <div>
        <p className="topbar-label">Church Name</p>
        <h1>{APP_NAME}</h1>
        <span className="topbar-subtitle">{branding.churchName}</span>
      </div>

      <div className="topbar-right">
        <div className="topbar-chip">Members {members.length}</div>
        <div className="topbar-chip">Ministries {ministries.length}</div>
        <div className="topbar-chip">19 Aug 2026</div>
        <div className="topbar-chip">{authUser?.displayName || "Administrator"}</div>
        <button type="button" className="topbar-chip topbar-logout" onClick={logout}>
          Sign Out
        </button>
        <div className="topbar-avatar">{initials}</div>
      </div>
    </header>
  );
}
