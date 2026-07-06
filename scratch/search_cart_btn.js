const fs = require('fs');
const content = fs.readFileSync('frontend/crm/index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('cart-b2b-btn') || line.includes('cart-b2c-btn') || line.includes('cart-submit-btn') || line.includes('cartSubmitBtn')) {
    if (i + 1 > 1130) {
      console.log(`${i + 1}: ${line.trim()}`);
    }
  }
});
