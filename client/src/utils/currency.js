export const formatPoints = (value = 0) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(value);

