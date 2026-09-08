import {
  buildDashboardAttendanceTrend,
  buildPermissionCatalog,
  formatCurrencyValue,
  getPersonAge,
} from "./appContextDisplayUtils";

describe("appContextDisplayUtils", () => {
  it("formats currency values using the active currency", () => {
    expect(formatCurrencyValue(12.5, { code: "GHS" })).toContain("12.50");
  });

  it("falls back to the provided symbol when the currency code is invalid", () => {
    expect(formatCurrencyValue(12.5, { code: "INVALID", symbol: "GHS " })).toBe("GHS 12.5");
  });

  it("returns a numeric person age", () => {
    expect(getPersonAge("2000-01-01")).toEqual(expect.any(Number));
  });

  it("returns null for empty or invalid dates", () => {
    expect(getPersonAge("")).toBeNull();
    expect(getPersonAge("not-a-date")).toBeNull();
  });

  it("builds a six-month dashboard trend with attendance and giving totals", () => {
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 10).toISOString();
    const trend = buildDashboardAttendanceTrend(
      [{ date: currentMonthDate, presentCount: 34 }],
      [{ date: currentMonthDate, amount: 500 }]
    );

    expect(trend).toHaveLength(6);
    expect(trend[5]).toEqual(
      expect.objectContaining({
        attendance: 34,
        giving: 500,
      })
    );
  });

  it("builds the permission catalog used by AppContext", () => {
    const catalog = buildPermissionCatalog();

    expect(catalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "core",
          permissions: expect.arrayContaining([
            expect.objectContaining({ key: "view_dashboard", label: "Dashboard" }),
          ]),
        }),
      ])
    );
  });
});
