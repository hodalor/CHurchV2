import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
import { navigationSections } from "../../lib/navigation";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar() {
  const location = useLocation();
  const { branding } = useAppContext();
  const { authUser } = useAuth();
  const availableSections = useMemo(() => {
    const permissionSet = new Set(authUser?.permissions || []);
    return navigationSections.filter((item) => !item.permission || permissionSet.has(item.permission));
  }, [authUser?.permissions]);
  const defaultOpenState = useMemo(() => {
    return availableSections.reduce((accumulator, item) => {
      if (item.children) {
        accumulator[item.label] = location.pathname.startsWith(`${item.path}/`);
      }
      return accumulator;
    }, {});
  }, [availableSections, location.pathname]);
  const [openSections, setOpenSections] = useState(defaultOpenState);

  useEffect(() => {
    const nextState = availableSections.reduce((accumulator, item) => {
      if (item.children) {
        accumulator[item.label] = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
      }
      return accumulator;
    }, {});

    setOpenSections(nextState);
  }, [availableSections, location.pathname]);

  const handleSectionClick = (item) => {
    if (!item.children?.length) {
      return;
    }

    setOpenSections((current) =>
      availableSections.reduce((accumulator, section) => {
        if (!section.children?.length) {
          return accumulator;
        }

        accumulator[section.label] = section.label === item.label ? !current[item.label] : false;
        return accumulator;
      }, {})
    );
  };

  return (
    <aside className="sidebar">
      <div className="brand-strip">
        <div className="brand-icon">
          {branding.appLogoUrl ? <img src={branding.appLogoUrl} alt={branding.appName || "App logo"} className="brand-logo-image" /> : (branding.appName || "C").slice(0, 1)}
        </div>
        <div className="brand-copy">
          <p>Application</p>
          <h2>{branding.appName || "ChurchSuite Pro"}</h2>
        </div>
      </div>

      <div className="sidebar-menu-scroll">
        <nav className="sidebar-nav">
          {availableSections.map((item) => {
            const Icon = item.icon;
            const isSectionActive =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <div key={item.label} className="nav-section">
                {item.children ? (
                  <button
                    type="button"
                    className={isSectionActive ? "nav-item active nav-toggle" : "nav-item nav-toggle"}
                    onClick={() => handleSectionClick(item)}
                  >
                    <span className="nav-item-main">
                      <Icon />
                      <span>{item.label}</span>
                    </span>
                    <FaChevronDown className={openSections[item.label] ? "submenu-caret open" : "submenu-caret"} />
                  </button>
                ) : (
                  <NavLink to={item.path} className={isSectionActive ? "nav-item active" : "nav-item"}>
                    <span className="nav-item-main">
                      <Icon />
                      <span>{item.label}</span>
                    </span>
                  </NavLink>
                )}

                {item.children && openSections[item.label] ? (
                  <div className="submenu-list">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) => (isActive ? "submenu-item active" : "submenu-item")}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
