export function formatCurrency(value?: number) {
  const n = typeof value === "number" ? value : 0
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `₹${n.toFixed(0)}`
  }
}
