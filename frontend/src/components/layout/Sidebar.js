import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
import { navigationSections } from "../../lib/navigation";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
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
    setOpenSections((current) => {
      const nextState = availableSections.reduce((accumulator, item) => {
        if (!item.children) {
          return accumulator;
        }

        const isActiveSection = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
        accumulator[item.label] = current[item.label] ?? isActiveSection;
        if (isActiveSection) {
          accumulator[item.label] = true;
        }
        return accumulator;
      }, {});

      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextState);
      const hasSameShape =
        currentKeys.length === nextKeys.length &&
        nextKeys.every((key) => current[key] === nextState[key]);

      return hasSameShape ? current : nextState;
    });
  }, [availableSections, location.pathname]);

  const handleSectionClick = (item) => {
    const isSectionActive =
      location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

    if (!item.children?.length) {
      return;
    }

    if (!isSectionActive) {
      setOpenSections((current) => ({
        ...current,
        [item.label]: true,
      }));
      navigate(item.children[0].path);
      return;
    }

    setOpenSections((current) => ({
      ...current,
      [item.label]: !current[item.label],
    }));
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
                    className={isSectionActive || openSections[item.label] ? "nav-item active nav-toggle" : "nav-item nav-toggle"}
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
