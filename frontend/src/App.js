import React, { useMemo, useState } from "react";
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  FaBuilding,
  FaCalendarCheck,
  FaChurch,
  FaCoins,
  FaHandHoldingHeart,
  FaLayerGroup,
  FaPlus,
  FaSearch,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

const initialGroups = [
  { id: "g1", name: "Central Zone", levelName: "Zone", parentId: null, code: "ZONE-001" },
  { id: "g2", name: "North Zone", levelName: "Zone", parentId: null, code: "ZONE-002" },
  { id: "g3", name: "Faith Sub-Zone", levelName: "Sub-Zone", parentId: "g1", code: "SUB-001" },
  { id: "g4", name: "Glory Cell", levelName: "Cell", parentId: "g3", code: "CELL-001" },
  { id: "g5", name: "Hope Cell", levelName: "Cell", parentId: "g3", code: "CELL-002" },
  { id: "g6", name: "Victory Sub-Zone", levelName: "Sub-Zone", parentId: "g2", code: "SUB-002" },
];

const initialMinistries = [
  { id: "m1", name: "Choir", leader: "Grace Mensah", description: "Worship and music team", color: "#7c3aed" },
  { id: "m2", name: "Ushering", leader: "Peter Cole", description: "Guest reception and seating", color: "#ef476f" },
  { id: "m3", name: "Children", leader: "Martha Daniel", description: "Children church coordination", color: "#f59e0b" },
  { id: "m4", name: "Media", leader: "John Kwarteng", description: "Sound and projection support", color: "#14b8a6" },
];

const initialMembers = [
  {
    id: "mem1",
    memberId: "CH-1001",
    firstName: "Daniel",
    lastName: "Owusu",
    memberType: "Adult",
    gender: "Male",
    phone: "+233 24 555 1001",
    email: "daniel@churchflow.org",
    ministryId: "m2",
    attendanceRate: "92%",
    joinedAt: "2026-01-08",
    address: "12 Palm Street",
    groups: [
      { groupId: "g1", levelName: "Zone", groupName: "Central Zone" },
      { groupId: "g3", levelName: "Sub-Zone", groupName: "Faith Sub-Zone" },
      { groupId: "g4", levelName: "Cell", groupName: "Glory Cell" },
    ],
    personalPhoto: "Uploaded",
    idFrontPhoto: "Uploaded",
    idBackPhoto: "Uploaded",
  },
  {
    id: "mem2",
    memberId: "CH-1002",
    firstName: "Ruth",
    lastName: "Asante",
    memberType: "Adult",
    gender: "Female",
    phone: "+233 54 222 4400",
    email: "ruth@churchflow.org",
    ministryId: "m1",
    attendanceRate: "88%",
    joinedAt: "2026-02-14",
    address: "8 Cedar Avenue",
    groups: [
      { groupId: "g2", levelName: "Zone", groupName: "North Zone" },
      { groupId: "g6", levelName: "Sub-Zone", groupName: "Victory Sub-Zone" },
    ],
    personalPhoto: "Uploaded",
    idFrontPhoto: "Uploaded",
    idBackPhoto: "Uploaded",
  },
  {
    id: "mem3",
    memberId: "CH-1003",
    firstName: "Ethan",
    lastName: "Cole",
    memberType: "Child",
    gender: "Child",
    phone: "Parent contact on file",
    email: "",
    ministryId: "m3",
    attendanceRate: "95%",
    joinedAt: "2026-03-03",
    address: "Children church wing",
    groups: [
      { groupId: "g1", levelName: "Zone", groupName: "Central Zone" },
      { groupId: "g3", levelName: "Sub-Zone", groupName: "Faith Sub-Zone" },
      { groupId: "g5", levelName: "Cell", groupName: "Hope Cell" },
    ],
    personalPhoto: "Pending",
    idFrontPhoto: "Birth record",
    idBackPhoto: "Guardian ID",
  },
];

const initialBranding = {
  churchName: "ChurchFlow Central",
  address: "Plot 22, Hope Avenue, Accra",
  phone: "+233 20 700 8899",
  email: "hello@churchflow.org",
  website: "www.churchflow.org",
};

const initialRoles = [
  { id: "r1", name: "Administrator", description: "Full access to setup and records" },
  { id: "r2", name: "Finance Officer", description: "Can manage finance and reports" },
  { id: "r3", name: "Ministry Leader", description: "Can oversee ministry teams" },
];

const initialUsers = [
  { id: "u1", fullName: "Paul Admin", email: "admin@churchflow.org", role: "Administrator", status: "Active" },
  { id: "u2", fullName: "Grace Finance", email: "finance@churchflow.org", role: "Finance Officer", status: "Active" },
  { id: "u3", fullName: "Martha Kids", email: "kids@churchflow.org", role: "Ministry Leader", status: "Pending" },
];

const initialFinanceRecords = [
  { id: "f1", recordNo: "FIN-001", category: "Offering", description: "Sunday first service", amount: 1200, date: "2026-08-03", status: "Posted" },
  { id: "f2", recordNo: "FIN-002", category: "Tithe", description: "Weekly tithe collection", amount: 2200, date: "2026-08-10", status: "Posted" },
  { id: "f3", recordNo: "FIN-003", category: "Project", description: "Building support", amount: 850, date: "2026-08-17", status: "Pending" },
];

const initialAttendanceSessions = [
  { id: "a1", service: "Sunday Worship", zone: "Central Zone", date: "2026-08-03", expected: 210, present: 184, rate: "88%" },
  { id: "a2", service: "Midweek Service", zone: "North Zone", date: "2026-08-06", expected: 150, present: 121, rate: "81%" },
  { id: "a3", service: "Youth Encounter", zone: "Central Zone", date: "2026-08-09", expected: 90, present: 76, rate: "84%" },
];

const attendanceData = [
  { month: "Jan", attendance: 180, giving: 6400 },
  { month: "Feb", attendance: 210, giving: 7200 },
  { month: "Mar", attendance: 235, giving: 8000 },
  { month: "Apr", attendance: 260, giving: 8500 },
  { month: "May", attendance: 248, giving: 9100 },
  { month: "Jun", attendance: 295, giving: 9800 },
];

const memberFormTemplate = {
  memberId: "",
  firstName: "",
  lastName: "",
  memberType: "Adult",
  gender: "Male",
  phone: "",
  email: "",
  address: "",
  ministryId: "",
  personalPhoto: "",
  idFrontPhoto: "",
  idBackPhoto: "",
  groupChain: [],
};

const groupFormTemplate = {
  name: "",
  levelName: "",
  parentId: "",
  code: "",
  description: "",
};

const ministryFormTemplate = {
  name: "",
  leader: "",
  color: "#4f46e5",
  description: "",
};

const financeFormTemplate = {
  recordNo: "",
  category: "Offering",
  description: "",
  amount: "",
  date: "",
  status: "Pending",
};

const attendanceFormTemplate = {
  service: "",
  zone: "",
  date: "",
  expected: "",
  present: "",
};

const userFormTemplate = {
  fullName: "",
  email: "",
  role: "Administrator",
  status: "Pending",
};

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

function AppLayout() {
  const location = useLocation();
  const [groups, setGroups] = useState(initialGroups);
  const [ministries, setMinistries] = useState(initialMinistries);
  const [members, setMembers] = useState(initialMembers);
  const [branding, setBranding] = useState(initialBranding);
  const [roles, setRoles] = useState(initialRoles);
  const [users, setUsers] = useState(initialUsers);
  const [financeRecords, setFinanceRecords] = useState(initialFinanceRecords);
  const [attendanceSessions, setAttendanceSessions] = useState(initialAttendanceSessions);
  const [groupForm, setGroupForm] = useState(groupFormTemplate);
  const [memberForm, setMemberForm] = useState(memberFormTemplate);
  const [ministryForm, setMinistryForm] = useState(ministryFormTemplate);
  const [financeForm, setFinanceForm] = useState(financeFormTemplate);
  const [attendanceForm, setAttendanceForm] = useState(attendanceFormTemplate);
  const [userForm, setUserForm] = useState(userFormTemplate);
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  const [activeSetupTab, setActiveSetupTab] = useState("groups");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberMinistryFilter, setMemberMinistryFilter] = useState("all");
  const [activeModal, setActiveModal] = useState(null);

  const groupsByParent = useMemo(() => {
    return groups.reduce((accumulator, group) => {
      const key = group.parentId || "root";
      accumulator[key] = accumulator[key] || [];
      accumulator[key].push(group);
      return accumulator;
    }, {});
  }, [groups]);

  const topLevelGroups = groupsByParent.root || [];
  const selectedChain = memberForm.groupChain.filter(Boolean);

  const dashboardStats = useMemo(() => {
    return [
      { label: "Members", value: members.length, accent: "purple", icon: <FaUsers /> },
      { label: "Active Ministries", value: ministries.length, accent: "pink", icon: <FaHandHoldingHeart /> },
      { label: "Finance Entries", value: financeRecords.length, accent: "orange", icon: <FaCoins /> },
      { label: "Attendance Logs", value: attendanceSessions.length, accent: "blue", icon: <FaCalendarCheck /> },
    ];
  }, [attendanceSessions.length, financeRecords.length, members.length, ministries.length]);

  const memberDistribution = useMemo(() => {
    const adultCount = members.filter((member) => member.memberType === "Adult").length;
    const childCount = members.filter((member) => member.memberType === "Child").length;
    return [
      { name: "Adults", value: adultCount, color: "#7c3aed" },
      { name: "Children", value: childCount, color: "#f59e0b" },
    ];
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch = `${member.firstName} ${member.lastName} ${member.memberId}`
        .toLowerCase()
        .includes(memberSearch.toLowerCase());
      const matchesMinistry =
        memberMinistryFilter === "all" || member.ministryId === memberMinistryFilter;

      return matchesSearch && matchesMinistry;
    });
  }, [memberMinistryFilter, memberSearch, members]);

  const totalFinance = financeRecords.reduce((sum, item) => sum + Number(item.amount), 0);
  const pageMeta = getPageMeta(location.pathname, activeSetupTab);

  const openModal = (name) => setActiveModal(name);
  const closeModal = () => setActiveModal(null);

  const resetMemberModal = () => {
    setMemberForm(memberFormTemplate);
    openModal("member");
  };

  const handleGroupChainChange = (depth, value) => {
    setMemberForm((current) => {
      const nextChain = current.groupChain.slice(0, depth);
      nextChain[depth] = value;
      return { ...current, groupChain: nextChain };
    });
  };

  const handleMemberSubmit = (event) => {
    event.preventDefault();

    const selectedGroups = memberForm.groupChain
      .map((groupId) => groups.find((group) => group.id === groupId))
      .filter(Boolean)
      .map((group) => ({
        groupId: group.id,
        levelName: group.levelName,
        groupName: group.name,
      }));

    setMembers((current) => [
      {
        id: `mem${Date.now()}`,
        ...memberForm,
        groups: selectedGroups,
        joinedAt: new Date().toISOString().slice(0, 10),
        attendanceRate: "New",
      },
      ...current,
    ]);

    setMemberForm(memberFormTemplate);
    closeModal();
  };

  const handleGroupSubmit = (event) => {
    event.preventDefault();
    setGroups((current) => [
      ...current,
      {
        id: `g${Date.now()}`,
        ...groupForm,
        parentId: groupForm.parentId || null,
      },
    ]);
    setGroupForm(groupFormTemplate);
    closeModal();
  };

  const handleMinistrySubmit = (event) => {
    event.preventDefault();
    setMinistries((current) => [
      ...current,
      {
        id: `m${Date.now()}`,
        ...ministryForm,
      },
    ]);
    setMinistryForm(ministryFormTemplate);
    closeModal();
  };

  const handleBrandingSubmit = (event) => {
    event.preventDefault();
    closeModal();
  };

  const handleRoleSubmit = (event) => {
    event.preventDefault();
    setRoles((current) => [
      ...current,
      {
        id: `r${Date.now()}`,
        ...roleForm,
      },
    ]);
    setRoleForm({ name: "", description: "" });
    closeModal();
  };

  const handleFinanceSubmit = (event) => {
    event.preventDefault();
    setFinanceRecords((current) => [
      {
        id: `f${Date.now()}`,
        ...financeForm,
        amount: Number(financeForm.amount || 0),
      },
      ...current,
    ]);
    setFinanceForm(financeFormTemplate);
    closeModal();
  };

  const handleAttendanceSubmit = (event) => {
    event.preventDefault();
    const expected = Number(attendanceForm.expected || 0);
    const present = Number(attendanceForm.present || 0);
    const rate = expected ? `${Math.round((present / expected) * 100)}%` : "0%";

    setAttendanceSessions((current) => [
      {
        id: `a${Date.now()}`,
        ...attendanceForm,
        expected,
        present,
        rate,
      },
      ...current,
    ]);
    setAttendanceForm(attendanceFormTemplate);
    closeModal();
  };

  const handleUserSubmit = (event) => {
    event.preventDefault();
    setUsers((current) => [
      {
        id: `u${Date.now()}`,
        ...userForm,
      },
      ...current,
    ]);
    setUserForm(userFormTemplate);
    closeModal();
  };

  const pageAction = getPageAction({
    pathname: location.pathname,
    activeSetupTab,
    onMemberOpen: resetMemberModal,
    onGroupOpen: () => openModal("group"),
    onBrandingOpen: () => openModal("branding"),
    onRoleOpen: () => openModal("role"),
    onMinistryOpen: () => openModal("ministry"),
    onFinanceOpen: () => openModal("finance"),
    onAttendanceOpen: () => openModal("attendance"),
    onUserOpen: () => openModal("user"),
  });

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-strip">
            <div className="brand-icon">
              <FaChurch />
            </div>
            <div className="brand-copy">
              <h2>{branding.churchName}</h2>
              <p>Church manager system</p>
            </div>
          </div>

          <div className="sidebar-menu-scroll">
            <nav className="sidebar-nav">
              <NavLink to="/dashboard" className="nav-item">
                <FaBuilding />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/setup" className="nav-item">
                <FaLayerGroup />
                <span>Church Setup</span>
              </NavLink>
              <NavLink to="/members" className="nav-item">
                <FaUsers />
                <span>Members</span>
              </NavLink>
              <NavLink to="/ministries" className="nav-item">
                <FaHandHoldingHeart />
                <span>Ministries</span>
              </NavLink>
              <NavLink to="/finance" className="nav-item">
                <FaCoins />
                <span>Finance</span>
              </NavLink>
              <NavLink to="/attendance" className="nav-item">
                <FaCalendarCheck />
                <span>Attendance</span>
              </NavLink>
              <NavLink to="/users" className="nav-item">
                <FaUserShield />
                <span>Users</span>
              </NavLink>
            </nav>
          </div>
        </aside>

        <main className="main-shell">
          <header className="topbar">
            <div className="topbar-left">
              <div>
                <p className="topbar-label">ChurchFlow</p>
                <h1>{branding.churchName}</h1>
              </div>
            </div>

            <div className="topbar-right">
              <div className="topbar-chip">Members {members.length}</div>
              <div className="topbar-chip">Ministries {ministries.length}</div>
              <div className="topbar-chip">19 Aug 2026</div>
              <div className="topbar-avatar">CA</div>
            </div>
          </header>

          <section className="workspace-shell">
            <div className="page-header">
              <div>
                <h2>{pageMeta.title}</h2>
                <p>{pageMeta.subtitle}</p>
              </div>
              {pageAction}
            </div>

            <div className="page-scroll-area">
              <Routes>
                <Route
                  path="/dashboard"
                  element={
                    <DashboardPage
                      stats={dashboardStats}
                      attendanceData={attendanceData}
                      memberDistribution={memberDistribution}
                      members={members}
                      financeRecords={financeRecords}
                    />
                  }
                />
                <Route
                  path="/setup"
                  element={
                    <SetupPage
                      activeSetupTab={activeSetupTab}
                      setActiveSetupTab={setActiveSetupTab}
                      groups={groups}
                      groupsByParent={groupsByParent}
                      branding={branding}
                      roles={roles}
                    />
                  }
                />
                <Route
                  path="/members"
                  element={
                    <MembersPage
                      members={filteredMembers}
                      ministries={ministries}
                      search={memberSearch}
                      setSearch={setMemberSearch}
                      ministryFilter={memberMinistryFilter}
                      setMinistryFilter={setMemberMinistryFilter}
                    />
                  }
                />
                <Route
                  path="/ministries"
                  element={<MinistriesPage ministries={ministries} members={members} />}
                />
                <Route
                  path="/finance"
                  element={<FinancePage financeRecords={financeRecords} totalFinance={totalFinance} />}
                />
                <Route
                  path="/attendance"
                  element={
                    <AttendancePage attendanceSessions={attendanceSessions} totalMembers={members.length} />
                  }
                />
                <Route
                  path="/users"
                  element={<UsersPage users={users} roles={roles} />}
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </section>
        </main>
      </div>

      {activeModal === "member" && (
        <ModalShell title="Add Member" subtitle="Create a member record without exposing the form on the page." onClose={closeModal}>
          <form className="modal-form" onSubmit={handleMemberSubmit}>
            <div className="form-grid">
              <label>
                Member ID
                <input
                  value={memberForm.memberId}
                  onChange={(event) => setMemberForm((current) => ({ ...current, memberId: event.target.value }))}
                  required
                />
              </label>
              <label>
                First Name
                <input
                  value={memberForm.firstName}
                  onChange={(event) => setMemberForm((current) => ({ ...current, firstName: event.target.value }))}
                  required
                />
              </label>
              <label>
                Last Name
                <input
                  value={memberForm.lastName}
                  onChange={(event) => setMemberForm((current) => ({ ...current, lastName: event.target.value }))}
                  required
                />
              </label>
              <label>
                Member Type
                <select
                  value={memberForm.memberType}
                  onChange={(event) => setMemberForm((current) => ({ ...current, memberType: event.target.value }))}
                >
                  <option value="Adult">Adult</option>
                  <option value="Child">Child</option>
                </select>
              </label>
              <label>
                Gender
                <select
                  value={memberForm.gender}
                  onChange={(event) => setMemberForm((current) => ({ ...current, gender: event.target.value }))}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Child">Child</option>
                </select>
              </label>
              <label>
                Phone
                <input
                  value={memberForm.phone}
                  onChange={(event) => setMemberForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label>
                Email
                <input
                  value={memberForm.email}
                  onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                Ministry
                <select
                  value={memberForm.ministryId}
                  onChange={(event) => setMemberForm((current) => ({ ...current, ministryId: event.target.value }))}
                >
                  <option value="">Select ministry</option>
                  {ministries.map((ministry) => (
                    <option key={ministry.id} value={ministry.id}>
                      {ministry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-width">
                Address
                <input
                  value={memberForm.address}
                  onChange={(event) => setMemberForm((current) => ({ ...current, address: event.target.value }))}
                />
              </label>
            </div>

            <div className="subsection-card">
              <div className="section-headline">
                <h3>Dynamic Group Path</h3>
                <p>The next level appears after a parent is selected.</p>
              </div>

              <div className="group-selectors">
                <label>
                  Zone
                  <select
                    value={selectedChain[0] || ""}
                    onChange={(event) => handleGroupChainChange(0, event.target.value)}
                    required
                  >
                    <option value="">Select zone</option>
                    {topLevelGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedChain.map((groupId, index) => {
                  const childGroups = groupsByParent[groupId] || [];
                  if (!childGroups.length) {
                    return null;
                  }

                  return (
                    <label key={groupId}>
                      {childGroups[0].levelName}
                      <select
                        value={selectedChain[index + 1] || ""}
                        onChange={(event) => handleGroupChainChange(index + 1, event.target.value)}
                      >
                        <option value="">Select {childGroups[0].levelName}</option>
                        {childGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="form-grid">
              <label>
                Personal Photo
                <input
                  value={memberForm.personalPhoto}
                  onChange={(event) => setMemberForm((current) => ({ ...current, personalPhoto: event.target.value }))}
                />
              </label>
              <label>
                ID Photo Front
                <input
                  value={memberForm.idFrontPhoto}
                  onChange={(event) => setMemberForm((current) => ({ ...current, idFrontPhoto: event.target.value }))}
                />
              </label>
              <label>
                ID Photo Back
                <input
                  value={memberForm.idBackPhoto}
                  onChange={(event) => setMemberForm((current) => ({ ...current, idBackPhoto: event.target.value }))}
                />
              </label>
            </div>

            <ModalActions onClose={closeModal} submitLabel="Save Member" />
          </form>
        </ModalShell>
      )}

      {activeModal === "group" && (
        <ModalShell title="Create Group" subtitle="Add a flexible setup level such as Zone, Sub-Zone, or Cell." onClose={closeModal}>
          <form className="modal-form" onSubmit={handleGroupSubmit}>
            <div className="form-grid">
              <label>
                Group Name
                <input
                  value={groupForm.name}
                  onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                Level Name
                <input
                  value={groupForm.levelName}
                  onChange={(event) => setGroupForm((current) => ({ ...current, levelName: event.target.value }))}
                  required
                />
              </label>
              <label>
                Code
                <input
                  value={groupForm.code}
                  onChange={(event) => setGroupForm((current) => ({ ...current, code: event.target.value }))}
                />
              </label>
              <label>
                Parent Group
                <select
                  value={groupForm.parentId}
                  onChange={(event) => setGroupForm((current) => ({ ...current, parentId: event.target.value }))}
                >
                  <option value="">No parent</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.levelName}: {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-width">
                Description
                <input
                  value={groupForm.description}
                  onChange={(event) => setGroupForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
            </div>
            <ModalActions onClose={closeModal} submitLabel="Save Group" />
          </form>
        </ModalShell>
      )}

      {activeModal === "branding" && (
        <ModalShell title="Church Branding" subtitle="Update address and contact details from a modal instead of exposing a form." onClose={closeModal}>
          <form className="modal-form" onSubmit={handleBrandingSubmit}>
            <div className="form-grid">
              <label>
                Church Name
                <input
                  value={branding.churchName}
                  onChange={(event) => setBranding((current) => ({ ...current, churchName: event.target.value }))}
                />
              </label>
              <label>
                Phone
                <input
                  value={branding.phone}
                  onChange={(event) => setBranding((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label>
                Email
                <input
                  value={branding.email}
                  onChange={(event) => setBranding((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                Website
                <input
                  value={branding.website}
                  onChange={(event) => setBranding((current) => ({ ...current, website: event.target.value }))}
                />
              </label>
              <label className="full-width">
                Address
                <input
                  value={branding.address}
                  onChange={(event) => setBranding((current) => ({ ...current, address: event.target.value }))}
                />
              </label>
            </div>
            <ModalActions onClose={closeModal} submitLabel="Save Branding" />
          </form>
        </ModalShell>
      )}

      {activeModal === "role" && (
        <ModalShell title="Add User Role" subtitle="Define the kind of access a user account should have." onClose={closeModal}>
          <form className="modal-form" onSubmit={handleRoleSubmit}>
            <div className="form-grid">
              <label>
                Role Name
                <input
                  value={roleForm.name}
                  onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label className="full-width">
                Description
                <input
                  value={roleForm.description}
                  onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))}
                  required
                />
              </label>
            </div>
            <ModalActions onClose={closeModal} submitLabel="Save Role" />
          </form>
        </ModalShell>
      )}

      {activeModal === "ministry" && (
        <ModalShell title="Create Ministry" subtitle="Add a ministry from a compact modal flow." onClose={closeModal}>
          <form className="modal-form" onSubmit={handleMinistrySubmit}>
            <div className="form-grid">
              <label>
                Ministry Name
                <input
                  value={ministryForm.name}
                  onChange={(event) => setMinistryForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                Leader
                <input
                  value={ministryForm.leader}
                  onChange={(event) => setMinistryForm((current) => ({ ...current, leader: event.target.value }))}
                />
              </label>
              <label>
                Color
                <input
                  type="color"
                  value={ministryForm.color}
                  onChange={(event) => setMinistryForm((current) => ({ ...current, color: event.target.value }))}
                />
              </label>
              <label className="full-width">
                Description
                <input
                  value={ministryForm.description}
                  onChange={(event) => setMinistryForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
            </div>
            <ModalActions onClose={closeModal} submitLabel="Save Ministry" />
          </form>
        </ModalShell>
      )}

      {activeModal === "finance" && (
        <ModalShell title="Add Finance Record" subtitle="Record offerings, tithes, projects, and other church finances." onClose={closeModal}>
          <form className="modal-form" onSubmit={handleFinanceSubmit}>
            <div className="form-grid">
              <label>
                Record No
                <input
                  value={financeForm.recordNo}
                  onChange={(event) => setFinanceForm((current) => ({ ...current, recordNo: event.target.value }))}
                  required
                />
              </label>
              <label>
                Category
                <select
                  value={financeForm.category}
                  onChange={(event) => setFinanceForm((current) => ({ ...current, category: event.target.value }))}
                >
                  <option value="Offering">Offering</option>
                  <option value="Tithe">Tithe</option>
                  <option value="Project">Project</option>
                  <option value="Expense">Expense</option>
                </select>
              </label>
              <label className="full-width">
                Description
                <input
                  value={financeForm.description}
                  onChange={(event) => setFinanceForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              <label>
                Amount
                <input
                  type="number"
                  value={financeForm.amount}
                  onChange={(event) => setFinanceForm((current) => ({ ...current, amount: event.target.value }))}
                  required
                />
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={financeForm.date}
                  onChange={(event) => setFinanceForm((current) => ({ ...current, date: event.target.value }))}
                  required
                />
              </label>
              <label>
                Status
                <select
                  value={financeForm.status}
                  onChange={(event) => setFinanceForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="Pending">Pending</option>
                  <option value="Posted">Posted</option>
                </select>
              </label>
            </div>
            <ModalActions onClose={closeModal} submitLabel="Save Record" />
          </form>
        </ModalShell>
      )}

      {activeModal === "attendance" && (
        <ModalShell title="Add Attendance Log" subtitle="Capture service attendance in a quick modal form." onClose={closeModal}>
          <form className="modal-form" onSubmit={handleAttendanceSubmit}>
            <div className="form-grid">
              <label>
                Service
                <input
                  value={attendanceForm.service}
                  onChange={(event) => setAttendanceForm((current) => ({ ...current, service: event.target.value }))}
                  required
                />
              </label>
              <label>
                Zone or Group
                <input
                  value={attendanceForm.zone}
                  onChange={(event) => setAttendanceForm((current) => ({ ...current, zone: event.target.value }))}
                  required
                />
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={attendanceForm.date}
                  onChange={(event) => setAttendanceForm((current) => ({ ...current, date: event.target.value }))}
                  required
                />
              </label>
              <label>
                Expected
                <input
                  type="number"
                  value={attendanceForm.expected}
                  onChange={(event) => setAttendanceForm((current) => ({ ...current, expected: event.target.value }))}
                  required
                />
              </label>
              <label>
                Present
                <input
                  type="number"
                  value={attendanceForm.present}
                  onChange={(event) => setAttendanceForm((current) => ({ ...current, present: event.target.value }))}
                  required
                />
              </label>
            </div>
            <ModalActions onClose={closeModal} submitLabel="Save Attendance" />
          </form>
        </ModalShell>
      )}

      {activeModal === "user" && (
        <ModalShell title="Create User Account" subtitle="Create a login account for a church staff or leader." onClose={closeModal}>
          <form className="modal-form" onSubmit={handleUserSubmit}>
            <div className="form-grid">
              <label>
                Full Name
                <input
                  value={userForm.fullName}
                  onChange={(event) => setUserForm((current) => ({ ...current, fullName: event.target.value }))}
                  required
                />
              </label>
              <label>
                Email
                <input
                  value={userForm.email}
                  onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Role
                <select
                  value={userForm.role}
                  onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={userForm.status}
                  onChange={(event) => setUserForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </label>
            </div>
            <ModalActions onClose={closeModal} submitLabel="Create User" />
          </form>
        </ModalShell>
      )}
    </>
  );
}

function DashboardPage({ stats, attendanceData, memberDistribution, members, financeRecords }) {
  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        {stats.map((stat) => (
          <article key={stat.label} className={`compact-stat-card ${stat.accent}`}>
            <div className="compact-stat-label">{stat.label}</div>
            <div className="compact-stat-value">{stat.value}</div>
          </article>
        ))}
      </section>

      <section className="content-layout">
        <article className="surface-card">
          <div className="section-headline">
            <h3>Attendance and Giving</h3>
            <p>Quick church performance trend across the last six months.</p>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={attendanceData}>
              <defs>
                <linearGradient id="attendanceColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="givingColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.38} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="attendance" stroke="#7c3aed" fill="url(#attendanceColor)" />
              <Area type="monotone" dataKey="giving" stroke="#0ea5e9" fill="url(#givingColor)" />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="surface-card side-panel">
          <div className="section-headline">
            <h3>Member Mix</h3>
            <p>Adult and children balance.</p>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={memberDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86}>
                {memberDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="legend-row">
            {memberDistribution.map((entry) => (
              <span key={entry.name}>
                <i style={{ background: entry.color }} />
                {entry.name}: {entry.value}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="surface-card">
        <div className="section-headline">
          <h3>Recent Activity Snapshot</h3>
          <p>Latest members and finance records.</p>
        </div>

        <div className="mini-grid">
          <div className="simple-list">
            {members.slice(0, 4).map((member) => (
              <div className="simple-list-item" key={member.id}>
                <div className="avatar-badge">{member.firstName[0]}{member.lastName[0]}</div>
                <div>
                  <strong>{member.firstName} {member.lastName}</strong>
                  <p>{member.memberId}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="simple-list">
            {financeRecords.slice(0, 4).map((record) => (
              <div className="simple-list-item" key={record.id}>
                <div className="status-dot posted" />
                <div>
                  <strong>{record.category}</strong>
                  <p>{record.recordNo} - ${record.amount}</p>
                </div>
                <span className={`status-pill ${record.status.toLowerCase()}`}>{record.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SetupPage({ activeSetupTab, setActiveSetupTab, groups, groupsByParent, branding, roles }) {
  return (
    <div className="page-grid">
      <div className="tab-row">
        {["groups", "branding", "users"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeSetupTab === tab ? "tab-button active" : "tab-button"}
            onClick={() => setActiveSetupTab(tab)}
          >
            {tab === "users" ? "User Roles" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeSetupTab === "groups" && (
        <div className="content-layout">
          <section className="surface-card">
            <div className="section-headline">
              <h3>Hierarchy Preview</h3>
              <p>Flexible parent and child setup for groups.</p>
            </div>
            <div className="tree-view">
              {(groupsByParent.root || []).map((group) => (
                <GroupNode key={group.id} group={group} groupsByParent={groupsByParent} depth={0} />
              ))}
            </div>
          </section>

          <section className="surface-card side-panel">
            <div className="section-headline">
              <h3>Available Levels</h3>
              <p>Compact list of all configured group levels.</p>
            </div>
            <div className="simple-list">
              {groups.map((group) => (
                <div className="simple-list-item" key={group.id}>
                  <div className="status-dot purple" />
                  <div>
                    <strong>{group.name}</strong>
                    <p>{group.levelName} {group.code ? `- ${group.code}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeSetupTab === "branding" && (
        <section className="surface-card">
          <div className="info-grid">
            <InfoTile label="Church Name" value={branding.churchName} />
            <InfoTile label="Phone" value={branding.phone} />
            <InfoTile label="Email" value={branding.email} />
            <InfoTile label="Website" value={branding.website} />
            <InfoTile label="Address" value={branding.address} wide />
          </div>
        </section>
      )}

      {activeSetupTab === "users" && (
        <section className="surface-card">
          <div className="simple-list">
            {roles.map((role) => (
              <div className="simple-list-item" key={role.id}>
                <div className="avatar-badge">
                  <FaUserShield />
                </div>
                <div>
                  <strong>{role.name}</strong>
                  <p>{role.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MembersPage({ members, ministries, search, setSearch, ministryFilter, setMinistryFilter }) {
  const memberCards = [
    { label: "Members", value: members.length, className: "purple" },
    { label: "Adults", value: members.filter((member) => member.memberType === "Adult").length, className: "pink" },
    { label: "Children", value: members.filter((member) => member.memberType === "Child").length, className: "orange" },
  ];

  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        {memberCards.map((card) => (
          <article key={card.label} className={`compact-stat-card ${card.className}`}>
            <div className="compact-stat-label">{card.label}</div>
            <div className="compact-stat-value">{card.value}</div>
          </article>
        ))}
      </section>

      <section className="surface-card data-card">
        <div className="toolbar-row">
          <div className="search-field">
            <FaSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search member, ID, or name" />
          </div>
          <select className="filter-select" value={ministryFilter} onChange={(event) => setMinistryFilter(event.target.value)}>
            <option value="all">All ministries</option>
            {ministries.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>
                {ministry.name}
              </option>
            ))}
          </select>
        </div>

        <div className="table-accent-bar" />

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>ID Number</th>
                <th>Group Path</th>
                <th>Ministry</th>
                <th>Contact</th>
                <th>Photos</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const ministry = ministries.find((item) => item.id === member.ministryId);
                return (
                  <tr key={member.id}>
                    <td>
                      <div className="member-cell">
                        <div className="avatar-badge">
                          {(member.firstName[0] || "") + (member.lastName[0] || "")}
                        </div>
                        <div>
                          <strong>{member.firstName} {member.lastName}</strong>
                          <p>{member.memberType}</p>
                        </div>
                      </div>
                    </td>
                    <td>{member.memberId}</td>
                    <td>{member.groups.map((group) => group.groupName).join(" > ")}</td>
                    <td>{ministry ? ministry.name : "Unassigned"}</td>
                    <td>
                      <strong>{member.phone || "-"}</strong>
                      <p>{member.email || "No email"}</p>
                    </td>
                    <td>
                      <div className="photo-stack">
                        <span>{member.personalPhoto || "-"}</span>
                        <span>{member.idFrontPhoto || "-"}</span>
                        <span>{member.idBackPhoto || "-"}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MinistriesPage({ ministries, members }) {
  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Ministries</div>
          <div className="compact-stat-value">{ministries.length}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">Assigned Members</div>
          <div className="compact-stat-value">{members.filter((member) => member.ministryId).length}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Leaders</div>
          <div className="compact-stat-value">{ministries.filter((item) => item.leader).length}</div>
        </article>
      </section>

      <section className="ministry-grid">
        {ministries.map((ministry) => (
          <article className="surface-card ministry-tile" key={ministry.id}>
            <div className="ministry-strip" style={{ background: ministry.color }} />
            <h3>{ministry.name}</h3>
            <p>{ministry.description}</p>
            <span>Leader: {ministry.leader || "Not assigned"}</span>
          </article>
        ))}
      </section>
    </div>
  );
}

function FinancePage({ financeRecords, totalFinance }) {
  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Records</div>
          <div className="compact-stat-value">{financeRecords.length}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">Posted</div>
          <div className="compact-stat-value">{financeRecords.filter((item) => item.status === "Posted").length}</div>
        </article>
        <article className="compact-stat-card orange">
          <div className="compact-stat-label">Total Value</div>
          <div className="compact-stat-value">${totalFinance}</div>
        </article>
      </section>

      <section className="surface-card data-card">
        <div className="table-accent-bar" />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Record No</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {financeRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.recordNo}</td>
                  <td>{record.category}</td>
                  <td>{record.description}</td>
                  <td>${record.amount}</td>
                  <td>{record.date}</td>
                  <td>
                    <span className={`status-pill ${record.status.toLowerCase()}`}>{record.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AttendancePage({ attendanceSessions, totalMembers }) {
  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Attendance Logs</div>
          <div className="compact-stat-value">{attendanceSessions.length}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Expected Pool</div>
          <div className="compact-stat-value">{totalMembers}</div>
        </article>
        <article className="compact-stat-card orange">
          <div className="compact-stat-label">Latest Rate</div>
          <div className="compact-stat-value">{attendanceSessions[0]?.rate || "0%"}</div>
        </article>
      </section>

      <section className="surface-card data-card">
        <div className="table-accent-bar" />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Zone</th>
                <th>Date</th>
                <th>Expected</th>
                <th>Present</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {attendanceSessions.map((session) => (
                <tr key={session.id}>
                  <td>{session.service}</td>
                  <td>{session.zone}</td>
                  <td>{session.date}</td>
                  <td>{session.expected}</td>
                  <td>{session.present}</td>
                  <td>{session.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function UsersPage({ users, roles }) {
  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Accounts</div>
          <div className="compact-stat-value">{users.length}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">Active</div>
          <div className="compact-stat-value">{users.filter((user) => user.status === "Active").length}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Roles</div>
          <div className="compact-stat-value">{roles.length}</div>
        </article>
      </section>

      <section className="surface-card data-card">
        <div className="table-accent-bar" />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <span className={`status-pill ${user.status.toLowerCase()}`}>{user.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ModalShell({ title, subtitle, children, onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <p className="topbar-label">Modal Form</p>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, submitLabel }) {
  return (
    <div className="modal-actions">
      <button type="button" className="ghost-button" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" className="primary-button">
        {submitLabel}
      </button>
    </div>
  );
}

function InfoTile({ label, value, wide }) {
  return (
    <div className={wide ? "info-tile wide" : "info-tile"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function GroupNode({ group, groupsByParent, depth }) {
  const children = groupsByParent[group.id] || [];

  return (
    <div className="tree-node" style={{ marginLeft: depth * 18 }}>
      <div className="tree-label">
        <span>{group.levelName}</span>
        <strong>{group.name}</strong>
      </div>
      {children.map((child) => (
        <GroupNode key={child.id} group={child} groupsByParent={groupsByParent} depth={depth + 1} />
      ))}
    </div>
  );
}

function getPageMeta(pathname, activeSetupTab) {
  if (pathname === "/members") {
    return {
      title: "Members",
      subtitle: "Compact member records with a cleaner data table and modal-based forms.",
    };
  }

  if (pathname === "/ministries") {
    return {
      title: "Ministries",
      subtitle: "Create and manage ministries without exposing forms on the page.",
    };
  }

  if (pathname === "/finance") {
    return {
      title: "Finance",
      subtitle: "Track offerings, tithes, projects, and other financial records.",
    };
  }

  if (pathname === "/attendance") {
    return {
      title: "Attendance",
      subtitle: "Record service attendance and review turnout performance.",
    };
  }

  if (pathname === "/users") {
    return {
      title: "Users",
      subtitle: "Create user accounts and assign system access roles.",
    };
  }

  if (pathname === "/setup") {
    const subtitles = {
      groups: "Manage hierarchy levels like Zone, Sub-Zone, and Cell.",
      branding: "Store church contact details and branding information.",
      users: "Manage user roles used across the system.",
    };
    return {
      title: "Church Setup",
      subtitle: subtitles[activeSetupTab],
    };
  }

  return {
    title: "Dashboard",
    subtitle: "A tighter dashboard layout inspired by your reference image.",
  };
}

function getPageAction({
  pathname,
  activeSetupTab,
  onMemberOpen,
  onGroupOpen,
  onBrandingOpen,
  onRoleOpen,
  onMinistryOpen,
  onFinanceOpen,
  onAttendanceOpen,
  onUserOpen,
}) {
  if (pathname === "/members") {
    return (
      <button type="button" className="primary-button large-action" onClick={onMemberOpen}>
        <FaPlus />
        Add Member
      </button>
    );
  }

  if (pathname === "/ministries") {
    return (
      <button type="button" className="primary-button large-action" onClick={onMinistryOpen}>
        <FaPlus />
        Add Ministry
      </button>
    );
  }

  if (pathname === "/finance") {
    return (
      <button type="button" className="primary-button large-action" onClick={onFinanceOpen}>
        <FaPlus />
        Add Finance
      </button>
    );
  }

  if (pathname === "/attendance") {
    return (
      <button type="button" className="primary-button large-action" onClick={onAttendanceOpen}>
        <FaPlus />
        Add Attendance
      </button>
    );
  }

  if (pathname === "/users") {
    return (
      <button type="button" className="primary-button large-action" onClick={onUserOpen}>
        <FaPlus />
        Create User
      </button>
    );
  }

  if (pathname === "/setup") {
    if (activeSetupTab === "groups") {
      return (
        <button type="button" className="primary-button large-action" onClick={onGroupOpen}>
          <FaPlus />
          Add Group
        </button>
      );
    }

    if (activeSetupTab === "branding") {
      return (
        <button type="button" className="primary-button large-action" onClick={onBrandingOpen}>
          <FaPlus />
          Edit Branding
        </button>
      );
    }

    return (
      <button type="button" className="primary-button large-action" onClick={onRoleOpen}>
        <FaPlus />
        Add Role
      </button>
    );
  }

  return null;
}

export default App;
