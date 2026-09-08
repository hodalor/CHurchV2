const { computeVariance } = require("../../src/services/varianceService");

describe("varianceService", () => {
  it("computes variance and percentage for a normal target", () => {
    expect(computeVariance(100, 125)).toEqual({
      targetValue: 100,
      actualValue: 125,
      variance: 25,
      variancePercent: 25,
    });
  });

  it("returns 100 percent when target is zero and actual is positive", () => {
    expect(computeVariance(0, 80)).toEqual({
      targetValue: 0,
      actualValue: 80,
      variance: 80,
      variancePercent: 100,
    });
  });
});
