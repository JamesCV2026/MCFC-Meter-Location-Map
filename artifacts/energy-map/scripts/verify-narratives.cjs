const fs = require('fs');
const html = fs.readFileSync('mcfc-campus-map.html', 'utf8');
console.log('HTML size:', (html.length/1024/1024).toFixed(2), 'MB');
const needles = ['V Tower', 'E Tower', 'TX1', 'PROPOSED', '650 kVA', '6 MVA', 'Joie Stadium to raceway', 'Mr Goodwin', 'triplex'];
for (const n of needles) {
  const re = new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const count = (html.match(re) || []).length;
  console.log('  ' + n + ': ' + count + ' hit(s)');
}
