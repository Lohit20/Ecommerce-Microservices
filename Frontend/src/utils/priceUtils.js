/**
 * Formats a price value
 * Ensures price is displayed correctly and properly handles cases where price might already contain a currency symbol
 * 
 * @param {number|string} price - The price to format
 * @param {boolean} includeCurrency - Whether to include the currency symbol in the output
 * @returns {string} Formatted price with or without currency symbol
 */
export const formatPrice = (price, includeCurrency = true) => {
  if (price == null) return '';
  let n = typeof price === 'string' ? parseFloat(price.replace(/[£$€₹]/g, '')) : price;
  if (isNaN(n)) return '';
  return includeCurrency ? `₹${n.toLocaleString('en-IN')}` : n.toLocaleString('en-IN');
};