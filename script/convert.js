#!/usr/bin/env node
/*  convert.js  – collision-free UNI encoder + row exploder
    Usage: node convert.js data/rawdata.csv [data/out.csv]

    npm install csv-parser fast-csv
*/

const fs      = require('fs');
const path    = require('path');
const csvIn   = require('csv-parser');
const fastCsv = require('fast-csv');

/* ---------- CLI ------------------------------------------------------ */
const IN  = process.argv[2];
const OUT = process.argv[3] || path.join(path.dirname(IN), 'out.csv');
if (!IN) {
  console.error('Usage: node convert.js <in.csv> [out.csv]');
  process.exit(1);
}

/* ---------- 1. build / load mapping table --------------------------- */
const MAP_FILE = path.join(__dirname, 'mapping.json');
let MAP = fs.existsSync(MAP_FILE)
  ? JSON.parse(fs.readFileSync(MAP_FILE))
  : buildMapping();

function buildMapping() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const combos  = [];

  for (const a of letters) {
    for (const b of letters) {
      combos.push(a + b);                    // 2-letter
      for (const c of letters) {
        combos.push(a + b + c);              // 3-letter
      }
    }
  }

  combos.sort(() => Math.random() - 0.5);    // shuffle (optional)

  const m = {};
  combos.forEach((s, i) => { m[s] = (i + 1).toString().padStart(5, '0'); });

  fs.writeFileSync(MAP_FILE, JSON.stringify(m, null, 2));
  console.log(`🔑  Mapping table written → ${MAP_FILE}`);
  return m;
}

/* ---------- 2. helper to rewrite UNI values ------------------------- */
const UNI_RE = /^([A-Za-z]{2,3})(\d{4})$/;

function encodeCell(text) {
  return text
    .split(',')
    .map(part => {
      const t = part.trim();
      const m = UNI_RE.exec(t);
      if (!m) return t;
      const code   = MAP[m[1].toUpperCase()];
      const digits = m[2];
      return digits + code;
    })
    .join(', ');
}

/* ---------- 3. helper to parse timestamps --------------------------- */
function parseTimestamp(ts) {
  // Expects "YYYY/MM/DD HH:MM:SS AM/PM XXX"
  const parts = ts.split(' ');
  if (parts.length >= 3) {
    const [datePart, timePart, ampm] = parts;
    return new Date(`${datePart} ${timePart} ${ampm}`);
  }
  return new Date(ts);
}

/* ---------- 4. read → transform → collect rows ---------------------- */
const rows = [];
const NEXT_FIELD = 'Next Person(s) UNI';      // change if your header differs

fs.createReadStream(IN)
  .pipe(csvIn())
  .on('data', row => {
    /* 4a. encode any UNI-like cell */
    for (const k in row) {
      if (typeof row[k] === 'string' && /[A-Za-z]{2,3}\d{4}/.test(row[k])) {
        row[k] = encodeCell(row[k]);
      }
    }

    /* 4b. explode by Group(s) and Next-UNI(s) ----------------------- */
    const groups = (row['Group'] || '')
      .toString()
      .split(/\s*,\s*/)
      .filter(Boolean);

    const nextList = (row[NEXT_FIELD] || '')
      .toString()
      .split(/\s*,\s*/)
      .filter(Boolean);

    // ensure at least one element so the loops run once
    const grpSafe  = groups.length   ? groups   : [''];
    const nextSafe = nextList.length ? nextList : [''];

    grpSafe.forEach(g => {
      const base = { ...row, Group: g };

      nextSafe.forEach(nxt => {
        const newRow = { ...base, [NEXT_FIELD]: nxt };
        rows.push(newRow);
      });
    });
  })
  .on('end', () => {
    /* ---------- 5. sort rows (group ↑ / time ↑) ------------------- */
    rows.sort((a, b) => {
      const ga = parseInt(a.Group, 10);
      const gb = parseInt(b.Group, 10);
      if (ga !== gb) return ga - gb;

      const da = parseTimestamp(a.Timestamp);
      const db = parseTimestamp(b.Timestamp);
      return da - db;
    });

    /* ---------- 6. write out ------------------------------------- */
    const writer = fastCsv.format({ headers: true });
    writer.pipe(fs.createWriteStream(OUT));

    rows.forEach(r => writer.write(r));
    writer.end();

    console.log(`✅  Finished. Full output → ${OUT}`);
  })
  .on('error', err => console.error('CSV error:', err));