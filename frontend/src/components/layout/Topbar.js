import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { formatDateDisplay } from "../../utils/dateUtils";

export default function Topbar() {
  const { branding } = useAppContext();
  const { authUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = (authUser?.displayName || "CA")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const churchNameClassName = useMemo(() => {
    const length = (branding.churchName || "").length;
    if (length > 34) {
      return "topbar-church-name compact";
    }
    if (length > 24) {
      return "topbar-church-name medium";
    }
    return "topbar-church-name";
  }, [branding.churchName]);

  return (
    <header className="topbar">
      <div className="topbar-branding">
        <div className="topbar-brand-icon">
          {branding.appLogoUrl ? <img src={branding.appLogoUrl} alt={branding.appName || "App logo"} className="brand-logo-image" /> : (branding.appName || "C").slice(0, 1)}
        </div>
        <h1 className={churchNameClassName}>{branding.churchName}</h1>
      </div>

      <div className="topbar-right">
        <div className="topbar-chip">{formatDateDisplay(new Date())}</div>
        <div className="profile-menu-wrap">
          <button type="button" className="topbar-avatar profile-toggle" onClick={() => setMenuOpen((current) => !current)}>
            {initials}
          </button>
          {menuOpen ? (
            <div className="profile-dropdown">
              <strong>{authUser?.displayName || "Administrator"}</strong>
              <span>@{authUser?.username || "account"}</span>
              <button type="button" className="ghost-button small topbar-logout" onClick={logout}>
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
