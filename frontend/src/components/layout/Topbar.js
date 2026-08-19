import { APP_NAME } from "../../data/mockData";
import { useAppContext } from "../../context/AppContext";

export default function Topbar() {
  const { branding, members, ministries } = useAppContext();

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
        <div className="topbar-avatar">CA</div>
      </div>
    </header>
  );
}
