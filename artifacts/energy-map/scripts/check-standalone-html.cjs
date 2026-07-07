const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'mcfc-campus-map.html'), 'utf8');
console.log('HTML size:', (html.length / 1024 / 1024).toFixed(2), 'MB');

const blocks = [
  ['mcfc-snapshot-data',      'snapshot',     true],
  ['mcfc-hh-data-registry',   'hh-data',      true],
  ['mcfc-photo-registry',     'photo-reg',    true],
  ['mcfc-catalog-html',       'catalog',      false],
  ['mcfc-attachments-registry', 'attachments', true],
];

for (const [id, label, expectObject] of blocks) {
  const re = new RegExp('<script type="application/json" id="' + id + '">([\\s\\S]*?)</script>');
  const m = html.match(re);
  if (!m) { console.log('  MISSING: ' + id); continue; }
  let raw = m[1]
    .split('<\\/').join('</')
    .split('<\\!--').join('<!--')
    .split('--\\>').join('-->');
  try {
    const parsed = JSON.parse(raw);
    const size = (m[1].length / 1024).toFixed(1);
    const detail = expectObject && parsed && typeof parsed === 'object'
      ? 'keys=' + Object.keys(parsed).length
      : '(' + typeof parsed + ')';
    console.log('  OK ' + label.padEnd(14) + size.padStart(8) + ' KB  ' + detail);
  } catch (e) {
    console.log('  PARSE ERROR ' + label + ': ' + e.message.slice(0, 100));
  }
}

const jsMatch = html.match(/<script type="module">([\s\S]+?)<\/script>/);
console.log('JS bundle present:', !!jsMatch, jsMatch ? '(' + (jsMatch[1].length / 1024).toFixed(0) + ' KB)' : '');

// Also verify the substation-01 stuff is gone
const stub = html.match(/substation-01/g) || [];
console.log('substation-01 mentions in HTML:', stub.length);
const rowsley = html.match(/Rowsley/gi) || [];
console.log('Rowsley mentions in HTML:', rowsley.length);
