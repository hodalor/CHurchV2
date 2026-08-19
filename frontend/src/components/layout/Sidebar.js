import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
import { navigationSections } from "../../lib/navigation";
import { APP_NAME } from "../../data/mockData";
import { useAppContext } from "../../context/AppContext";

export default function Sidebar() {
  const location = useLocation();
  const { branding } = useAppContext();
  const defaultOpenState = useMemo(() => {
    return navigationSections.reduce((accumulator, item) => {
      if (item.children) {
        accumulator[item.label] = location.pathname.startsWith(`${item.path}/`);
      }
      return accumulator;
    }, {});
  }, [location.pathname]);
  const [openSections, setOpenSections] = useState(defaultOpenState);

  useEffect(() => {
    setOpenSections((current) => ({ ...defaultOpenState, ...current }));
  }, [defaultOpenState]);

  const toggleSection = (label) => {
    setOpenSections((current) => ({
      ...current,
      [label]: !current[label],
    }));
  };

  return (
    <aside className="sidebar">
      <div className="brand-strip">
        <div className="brand-icon">{branding.churchName.slice(0, 1)}</div>
        <div className="brand-copy">
          <p>{APP_NAME}</p>
          <h2>{branding.churchName}</h2>
        </div>
      </div>

      <div className="sidebar-menu-scroll">
        <nav className="sidebar-nav">
          {navigationSections.map((item) => {
            const Icon = item.icon;
            const isSectionActive =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <div key={item.label} className="nav-section">
                {item.children ? (
                  <button
                    type="button"
                    className={isSectionActive || openSections[item.label] ? "nav-item active nav-toggle" : "nav-item nav-toggle"}
                    onClick={() => toggleSection(item.label)}
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
