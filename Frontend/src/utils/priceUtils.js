/**
 * Formats a price value
 * Ensures price is displayed correctly and properly handles cases where price might already contain a currency symbol
 * 
 * @param {number|string} price - The price to format
 * @param {boolean} includeCurrency - Whether to include the currency symbol in the output
 * @returns {string} Formatted price with or without currency symbol
 */
export const formatPrice = (price, includeCurrency = true) => {
  // Skip formatting if price is undefined or null
  if (price == null) {
    return '';
  }
  
  // Ensure we're working with a number by removing any existing currency symbols
  let numericPrice = price;
  if (typeof price === 'string') {
    numericPrice = parseFloat(price.replace(/[£$€]/g, ''));
  }
  
  // Return formatted price with or without currency symbol
  return includeCurrency ? `£${numericPrice.toFixed(2)}` : numericPrice.toFixed(2);
};