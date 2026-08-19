import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppContext } from "../context/AppContext";

const roleColors = ["#4f46e5", "#0ea5e9", "#f59e0b", "#ef4444"];
const zoneColors = ["#4f46e5", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef476f", "#7c5cff"];

export default function FamilyOverviewPage() {
  const { families, groups, familyApiState } = useAppContext();

  const roleDistribution = [
    { name: "Heads", value: families.filter((family) => family.headOfHousehold?.memberId).length },
    { name: "Spouses", value: families.filter((family) => family.spouse?.memberId).length },
    { name: "Children", value: families.reduce((sum, family) => sum + (family.children?.length || 0), 0) },
    { name: "Dependents", value: families.reduce((sum, family) => sum + (family.dependants?.length || 0), 0) },
  ];

  const householdSizeData = families.map((family) => ({
    name: family.familyName,
    members: family.householdMembers?.length || 0,
    children: family.children?.length || 0,
  }));

  const zoneDistribution = groups
    .map((group) => ({
      name: group.name,
      value: families.filter((family) => family.fellowshipZone === group.id).length,
    }))
    .filter((item) => item.value);

  const visitStatusData = [
    {
      name: "Visited",
      value: families.filter((family) => String(family.visitationHistory || "").includes("2026")).length,
    },
    {
      name: "Pending",
      value: families.filter((family) => !String(family.visitationHistory || "").includes("2026")).length,
    },
  ];

  if (familyApiState.loading) {
    return <div className="empty-note">Loading family charts...</div>;
  }

  if (familyApiState.error) {
    return <div className="empty-note">{familyApiState.error}</div>;
  }

  if (!families.length) {
    return <div className="empty-note">No family records yet. Create a household to start visualizing the data.</div>;
  }

  return (
    <div className="page-grid family-chart-page">
      <section className="family-chart-grid">
        <article className="surface-card chart-card">
          <div className="section-headline compact">
            <h3>Household Roles</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={roleDistribution} dataKey="value" nameKey="name" innerRadius={72} outerRadius={104}>
                {roleDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={roleColors[index % roleColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend-grid">
            {roleDistribution.map((entry, index) => (
              <span key={entry.name}>
                <i style={{ background: roleColors[index % roleColors.length] }} />
                {entry.name} {entry.value}
              </span>
            ))}
          </div>
        </article>

        <article className="surface-card chart-card">
          <div className="section-headline compact">
            <h3>Household Size</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={householdSizeData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="members" radius={[10, 10, 0, 0]} fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="family-chart-grid">
        <article className="surface-card chart-card">
          <div className="section-headline compact">
            <h3>Zone Mix</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={zoneDistribution} dataKey="value" nameKey="name" outerRadius={104}>
                {zoneDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={zoneColors[index % zoneColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend-grid">
            {zoneDistribution.map((entry, index) => (
              <span key={entry.name}>
                <i style={{ background: zoneColors[index % zoneColors.length] }} />
                {entry.name} {entry.value}
              </span>
            ))}
          </div>
        </article>

        <article className="surface-card chart-card">
          <div className="section-headline compact">
            <h3>Visitation Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={visitStatusData} layout="vertical">
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                {visitStatusData.map((entry, index) => (
                  <Cell key={entry.name} fill={index === 0 ? "#14b8a6" : "#f59e0b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>
    </div>
  );
}
