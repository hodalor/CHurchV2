function computeVariance(targetValue, actualValue) {
  const normalizedTarget = Number(targetValue || 0);
  const normalizedActual = Number(actualValue || 0);
  const variance = normalizedActual - normalizedTarget;
  const variancePercent = normalizedTarget === 0 ? (normalizedActual === 0 ? 0 : 100) : (variance / normalizedTarget) * 100;

  return {
    targetValue: normalizedTarget,
    actualValue: normalizedActual,
    variance,
    variancePercent,
  };
}

module.exports = {
  computeVariance,
};
