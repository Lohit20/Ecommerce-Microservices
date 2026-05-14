const INR_TO_GBP = 106;

export const toGBP = (inrPrice) => {
  if (inrPrice == null) return 0;
  return Math.round((inrPrice / INR_TO_GBP) * 100) / 100;
};

export const formatPrice = (price, includeCurrency = true) => {
  if (price == null) return '';
  let n = typeof price === 'string' ? parseFloat(price.replace(/[£$€₹,]/g, '')) : price;
  if (isNaN(n)) return '';
  const gbp = n / INR_TO_GBP;
  const formatted = gbp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return includeCurrency ? `£${formatted}` : formatted;
};