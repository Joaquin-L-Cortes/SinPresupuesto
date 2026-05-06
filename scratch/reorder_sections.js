const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'content', 'classroom_sections.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const ROMAN_MAP = {
  "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10,
  "XI": 11, "XII": 12, "XIII": 13, "XIV": 14, "XV": 15, "XVI": 16, "XVII": 17, "XVIII": 18, "XIX": 19, "XX": 20
};

function getRomanVal(name) {
  const match = name.match(/^([IVX]+)\./i);
  return match ? (ROMAN_MAP[match[1].toUpperCase()] || 999) : 999;
}

const sorted = [...data].sort((a, b) => getRomanVal(a.name) - getRomanVal(b.name));

fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2), 'utf-8');
console.log("JSON reordered correctly!");
