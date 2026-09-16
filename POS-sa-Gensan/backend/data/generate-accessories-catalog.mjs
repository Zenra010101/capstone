/**
 * Parses PH-ACC-Price1.txt (extracted from accessories price list PDF)
 * and generates accessories-catalog.csv for GensanPOS import.
 */
import fs from 'fs';

const CATEGORY = 'Accessories';
const text = fs.readFileSync(new URL('./PH-ACC-Price1.txt', import.meta.url), 'utf8');

const lines = text
  .split('\n')
  .map((l) => l.replace(/\r/g, '').trim())
  .filter((l) => l && !l.match(/^-- \d+ of \d+ --$/));

const SIZE_RE =
  /^(\d+(?:\.\d+)?(?:mm|inch|Inch|Inch)?|\d+x\d+(?:x[\d.]+)?|\d+x\d+|\d+\/\d+(?:x\d+\/\d+)?|\d+\/\d+|\d+(?:\.\d+)?m|#[0-9]+|#?\d+(?:\.\d+)?°?|[A-Z]-?\s*Z|0\s*-\s*9|\d+mm|\d+Inch|\d+inch|\d+Wheels|\d+L|\d+mmx\d+|Gold|Silver|Black|Single Side|Double Side|L Side|Big|Small|Nihon 2\.0|Nihon 2\.5|BBB|FH|\d+x\d+x\d+|\d+x[\d.]+|\d+\.\d+|\d+°|\d+Wheels|\d+Inch|\d+inch)$/i;

const PH_RE = /^PH\s*(\d{3})$/i;
const PH_INLINE_RE = /PH\s*(\d{3})/gi;

function isPrice(tok) {
  if (!tok) return false;
  const n = parseFloat(tok.replace(/,/g, ''));
  return !Number.isNaN(n) && n >= 0 && /^[\d,.]+$/.test(tok);
}

function isGradeHeader(tok) {
  return tok === '#202' || tok === '#304' || tok === '202' || tok === '304';
}

function isNoise(tok) {
  return (
    tok === 'Size:' ||
    isGradeHeader(tok) ||
    tok === 'SQ' ||
    tok === 'RT' ||
    tok === 'Flat' ||
    tok === 'Round' ||
    tok === 'Cover' ||
    tok === 'Flange' ||
    tok === 'Elbow' ||
    tok === 'Set' ||
    tok === 'Ball' ||
    tok === 'Gold' ||
    tok === 'Wall' ||
    tok === 'Holder' ||
    tok === 'Glass' ||
    tok === 'Design' ||
    tok === '3D' ||
    tok === 'Post' ||
    tok === 'End' ||
    tok === 'Hinge' ||
    tok === 'Hinges' ||
    tok === 'Handle' ||
    tok === 'Wheel' ||
    tok === 'Bolt' ||
    tok === 'Disc' ||
    tok === 'Clip' ||
    tok === 'Faucet' ||
    tok === 'Lock' ||
    tok === 'Machine' ||
    tok === 'Rod' ||
    tok === 'Patch' ||
    tok === 'Spring' ||
    tok === 'Drain' ||
    tok === 'Valve' ||
    tok === 'Hose' ||
    tok === 'Spray' ||
    tok === 'Rollers' ||
    tok === 'Slide' ||
    tok === 'Catches' ||
    tok === 'Letters' ||
    tok === 'Numbers' ||
    tok === 'Padlock' ||
    tok === 'Stand' ||
    tok === 'Meter' ||
    tok === 'Gloves' ||
    tok === 'Bit' ||
    tok === 'Gel' ||
    tok === 'Saw' ||
    tok === 'Wax' ||
    tok === 'Stone' ||
    tok === 'Cloth' ||
    tok === 'Paper' ||
    tok === 'Bride' ||
    tok === 'Liha' ||
    tok === 'Tig' ||
    tok === 'Clean' ||
    tok === 'Sanding' ||
    tok === 'Buffing' ||
    tok === 'Grinding' ||
    tok === 'Nylon' ||
    tok === 'Flap' ||
    tok === 'Cutting' ||
    tok === 'Mounted' ||
    tok === 'Mouted' ||
    tok === 'Filler' ||
    tok === 'Tungsten' ||
    tok === 'Expansion' ||
    tok === 'Advertising' ||
    tok === 'Foot' ||
    tok === 'Barrel' ||
    tok === 'Spring' ||
    tok === 'Hole' ||
    tok === 'Welding' ||
    tok === 'Bending' ||
    tok === 'Scotch' ||
    tok === 'Leaves' ||
    tok === 'Drill' ||
    tok === 'Footing' ||
    tok === 'Buckle' ||
    tok === 'Celyndrical' ||
    tok === 'Cender' ||
    tok === 'Half' ||
    tok === 'Sphere' ||
    tok === 'Cabinet' ||
    tok === 'Square' ||
    tok === 'Denim' ||
    tok === 'Swivel' ||
    tok === 'Drawer' ||
    tok === 'Trash' ||
    tok === 'Can' ||
    tok === 'Flexible' ||
    tok === 'Sink' ||
    tok === 'Strainer' ||
    tok === 'Bidet' ||
    tok === 'Piano' ||
    tok === 'Bracket' ||
    tok === 'Mountain' ||
    tok === 'Woven' ||
    tok === 'Non' ||
    tok === 'Cooled' ||
    tok === 'Ceramic' ||
    tok === 'Cap' ||
    tok === 'Hanlde' ||
    tok === 'Tail' ||
    tok === 'Hadle' ||
    tok === 'Switch' ||
    tok === 'TIG' ||
    tok === 'Upper' ||
    tok === 'Bottom' ||
    tok === 'Floor' ||
    tok === 'Angle' ||
    tok === 'Door' ||
    tok === 'Hanger' ||
    tok === 'Diamond' ||
    tok === 'Poste' ||
    tok === 'HT' ||
    tok === 'M' ||
    tok === '/' ||
    tok === 'V' ||
    tok === 'U' ||
    tok === 'A' ||
    tok === '-' ||
    tok === 'Z' ||
    tok === '0' ||
    tok === '9' ||
    tok === 'Cup' ||
    tok === 'Tube' ||
    tok === 'Ring' ||
    tok === 'COC' ||
    tok === 'SOS' ||
    tok === 'S' ||
    tok === 'C'
  );
}

function normalizePh(num) {
  return `PH${String(num).padStart(3, '0')}`;
}

function slug(s) {
  return s
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 40);
}

function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Manual product names from PDF (PH code -> display name) */
const PH_NAMES = {
  PH001: 'SS Elbow',
  PH002: 'SS SQ Elbow',
  PH003: 'SS Flange',
  PH004: 'SS Flat Flange',
  PH005: 'SS SQ Flat Flange Cover',
  PH006: 'SS Cover',
  PH007: 'SS SQ Cover',
  PH008: 'SS RT Cover',
  PH009: 'SS SQ Ball Set',
  PH010: 'SS Ball Set Gold',
  PH011: 'SS Cylindrical Hinge',
  PH012: 'SS Hinges',
  PH013: 'SS Half Sphere',
  PH014: 'SS Ball Set Gold',
  PH015: 'SS Hinge',
  PH016: 'SS Hinge',
  PH017: 'SS Hinge #304',
  PH018: 'SS Cender Post',
  PH019: 'SS End Post',
  PH020: 'SS Glass Holder Wall Flat',
  PH021: 'SS Cabinet Handle',
  PH022: 'SS Handle',
  PH023: 'SS Square Round Ball',
  PH024: 'SS Buckle',
  PH025: 'SS Footing',
  PH026: 'SS Barrel Bolt #304',
  PH027: 'SS Expansion Bolt #304',
  PH028: 'SS Advertising Bolt',
  PH029: 'SS Hole Saw',
  PH030: 'SS Drill Bit',
  PH031: 'SS Leaves Wheel',
  PH032: 'SS Scotch Bride',
  PH033: 'SS Liha Sanding Paper',
  PH034: 'SS Sanding Disc',
  PH035: 'SS Tig Clean Gel',
  PH036: 'SS Barrel Bolt #202',
  PH037: 'SS Welding Machine',
  PH038: 'SS Bending Machine',
  PH039: 'SS Gloves',
  PH040: 'SS Gas Meter',
  PH041: 'SS Filler Roll #304',
  PH042: 'SS Tungsten',
  PH043: 'SS Flap Disc',
  PH044: 'SS Flap Disc M',
  PH045: 'SS Buffing Disc',
  PH046: 'SS Nylon Disc',
  PH047: 'SS Buffing Cloth',
  PH048: 'SS Grinding Stone',
  PH049: 'SS Buffing Wax BBB',
  PH050: 'SS Cutting Disc',
  PH051: 'SS Mounted Wheel',
  PH052: 'SS Glass Clip Round #304',
  PH053: 'SS Glass Clip SQ #304',
  PH054: 'SS Glass Clip Round Flat/Round #304',
  PH055: 'SS Glass Clip SQ Flat/Round #304',
  PH056: 'SS Design SOS Flat #304',
  PH057: 'SS Design S Flat #304',
  PH058: 'SS Design S 3D #304',
  PH059: 'SS Design Flat #304',
  PH060: 'SS Design Tube #304',
  PH061: 'SS Design COC 3D #304',
  PH062: 'SS Design SOS 3D #304',
  PH063: 'SS Design 3D #304 750mm',
  PH064: 'SS Design 3D #304 750mm',
  PH065: 'SS Design 3D #304 750mm',
  PH066: 'SS Design Flat #304 750mm',
  PH067: 'SS Design 3D #304 750mm',
  PH068: 'SS Design Flat #304 750mm',
  PH069: 'SS Design Flat 3D #304',
  PH070: 'SS Design Flat #304',
  PH071: 'SS Design Flat #202/304',
  PH072: 'SS Design Flat #202/304',
  PH073: 'SS Design Flat #202/304',
  PH074: 'SS Design Flat #202/304',
  PH075: 'SS Design Flat #202/304',
  PH076: 'SS Design Flat #202/304',
  PH077: 'SS Design Flat #202/304',
  PH078: 'SS Design 3D #304 600mm',
  PH079: 'SS Design 3D #304 750mm',
  PH080: 'SS Design 3D #304',
  PH081: 'SS Design 3D #304',
  PH082: 'SS Design SQ 3D #304 750mm',
  PH083: 'SS Design SQ 3D #304 750mm',
  PH084: 'SS Design 3D #304 850mm',
  PH085: 'SS Design 3D #304 850mm',
  PH086: 'SS Design 3D #304 850mm',
  PH087: 'SS Design 3D #304 850mm',
  PH088: 'SS Poste Holder #304',
  PH089: 'SS Glass Clip #304',
  PH090: 'SS Welding Rod Nihon',
  PH098: 'SS TIG Handle Set',
  PH099: 'SS Handle Switch',
  PH100: 'SS Ceramic Cap',
  PH101: 'SS TIG Handle',
  PH102: 'SS Handle Tail',
  PH103: 'SS Cooled Clip',
  PH104: 'SS Glass Clip #304',
  PH105: 'SS Glass Clip #304',
  PH106: 'SS Glass Clip #304',
  PH107: 'SS Glass Clip #304',
  PH108: 'SS Glass Clip #304',
  PH109: 'SS HT Cover',
  PH110: 'SS Upper Patch Glass Door Fittings #304',
  PH111: 'SS Bottom Patch Glass Door Fittings #304',
  PH112: 'SS Bending Patch Glass Door Fittings #304',
  PH113: 'SS Lock Glass Door Fittings #304',
  PH114: 'SS Floor Spring Glass Door Fittings #304',
  PH115: 'SS Glass Clip 304',
  PH116: 'SS Glass Clip 304',
  PH117: 'SS Glass Clip #304',
  PH118: 'SS Glass Clip #304',
  PH119: 'SS Floor Drain #304',
  PH120: 'SS Hanger Wheel Diamond Design #304',
  PH121: 'SS Trash Can',
  PH122: 'SS Handle #304',
  PH123: 'SS Handle #304',
  PH124: 'SS Piano Hinge Bracket Holder',
  PH125: 'SS Faucet #304',
  PH126: 'SS Faucet #304',
  PH127: 'SS Rollers #202',
  PH128: 'SS Lock #304',
  PH129: 'SS Floor Drain #304',
  PH130: 'SS Angle Valve #304',
  PH131: 'SS Door Lock #304',
  PH132: 'SS Flexible Hose',
  PH133: 'SS Sink Strainer / Hose',
  PH134: 'SS Bidet Spray #304',
  PH135: 'SS Bracket Holder',
  PH136: 'SS Handle #304',
  PH137: 'SS Non Woven Wheel',
  PH138: 'SS Mountain Wheel #304',
  PH139: 'SS Cabinet Hinges #202',
  PH140: 'SS Drawer Slide',
  PH141: 'SS Swivel Rollers #304',
  PH142: 'SS Ball Catches #304',
  PH143: 'SS Letters / Numbers #304',
  PH144: 'SS Disc Padlock #304',
  PH145: 'SS Denim Wheel #304',
  PH146: 'SS Flap Wheel',
  PH147: 'SS Spring Barrel Bolt',
  PH148: 'SS Glass Stand Holder',
  PH149: 'SS Glass Stand Holder #304',
  PH150: 'SS Design 3D #304 850mm',
  PH151: 'SS Design 3D #304 750mm',
  PH152: 'SS Design 3D #304 750mm',
  PH153: 'SS Design 3D #304 750mm',
  PH154: 'SS Design 3D #304 750mm',
  PH155: 'SS Design 3D #304 750mm',
  PH156: 'SS Design 3D #304 750mm',
  PH157: 'SS Design 3D #304 750mm',
  PH158: 'SS Design 3D #304 750mm',
};

/**
 * Structured variant data manually transcribed from PH-ACC-Price1.pdf.
 * Each entry: { ph, variants: [{ size, p202?, p304?, price?, grade? }] }
 */
const CATALOG = [
  {
    ph: 'PH001',
    variants: [
      { size: '1/2', p202: 12, p304: 15 },
      { size: '5/8', p202: 13, p304: 17 },
      { size: '3/4', p202: 14, p304: 22 },
      { size: '7/8', p202: 15, p304: 24 },
      { size: '1', p202: 16, p304: 27 },
      { size: '1-1/4', p202: 22, p304: 34 },
      { size: '1-1/2', p202: 24, p304: 40 },
      { size: '1-3/4', p202: 32, p304: 51 },
      { size: '2', p202: 35, p304: 53 },
      { size: '2-1/2', p202: 50, p304: 87 },
      { size: '3', p202: 80, p304: 120 },
      { size: '4', p202: 170, p304: 260 },
    ],
  },
  {
    ph: 'PH002',
    variants: [
      { size: '1x1', p202: 42, p304: 50 },
      { size: '1-1/4x1-1/4', p202: 50, p304: 65 },
      { size: '1-1/2x1-1/2', p202: 70, p304: 80 },
      { size: '2x2', p202: 90, p304: 110 },
      { size: '3/4', p202: 29, p304: 48 },
      { size: '7/8', p202: 33, p304: 55 },
      { size: '1', p202: 38, p304: 63 },
      { size: '1-1/4', p202: 42, p304: 65 },
      { size: '1-1/2', p202: 50, p304: 70 },
      { size: '1-3/4', p202: 60, p304: 93 },
      { size: '2', p202: 65, p304: 100 },
      { size: '2-1/2', p202: 90, p304: 135 },
    ],
  },
  {
    ph: 'PH003',
    variants: [
      { size: '3/4', p202: 20, p304: 25 },
      { size: '1', p202: 20, p304: 30 },
      { size: '1-1/4', p202: 22, p304: 38 },
      { size: '1-1/2', p202: 33, p304: 43 },
      { size: '1-3/4', p202: 38, p304: 50 },
      { size: '2', p202: 44, p304: 65 },
      { size: '2-1/2', p202: 53, p304: 75 },
      { size: '3', p202: 60, p304: 85 },
      { size: '4', p202: 150, p304: null },
      { size: '1-1/2x1-1/2', p202: null, p304: 260, grade: '304' },
      { size: '2x2', p202: null, p304: 280, grade: '304' },
    ],
  },
  {
    ph: 'PH004',
    variants: [
      { size: '1/4', p202: 8, p304: 12 },
      { size: '5/16', p202: 10, p304: 15 },
      { size: '3/8', p202: 12, p304: 20 },
      { size: '1/2', p202: 20, p304: 35 },
      { size: '5/8', p202: 35, p304: 45 },
      { size: '3/4', p202: 44, p304: 55 },
      { size: '7/8', p202: 57, p304: 68 },
      { size: '1', p202: 70, p304: 85 },
    ],
  },
  {
    ph: 'PH005',
    variants: [
      { size: '1x2', p202: null, p304: 130, grade: '304' },
      { size: '1-1/2x1-1/2', p202: null, p304: 130, grade: '304' },
      { size: '2x2', p202: null, p304: 130, grade: '304' },
      { size: 'Cover 40', price: 40, grade: '304' },
    ],
  },
  {
    ph: 'PH006',
    variants: [
      { size: '3', p202: 42, p304: 72 },
      { size: '4', price: 100, grade: '304' },
    ],
  },
  {
    ph: 'PH007',
    variants: [
      { size: '3/4x3/4', price: 16, grade: '304' },
      { size: '1x1', price: 18, grade: '304' },
      { size: '1-1/4x1-1/4', price: 24, grade: '304' },
      { size: '1-1/2x1-1/2', price: 25, grade: '304' },
      { size: '2x2', price: 27, grade: '304' },
      { size: '1x1-1/2', price: 25, grade: '304' },
      { size: '1x2', price: 25, grade: '304' },
      { size: '1x3', price: 37, grade: '304' },
      { size: '2x3', price: 37, grade: '304' },
      { size: '2x4', price: 50, grade: '304' },
    ],
  },
  {
    ph: 'PH008',
    variants: [
      { size: '1-1/2', p202: 50, p304: 75 },
      { size: '2', p202: 55, p304: 90 },
      { size: '2-1/2', p202: 75, p304: 110 },
      { size: '3', p202: 100, p304: 155 },
    ],
  },
  {
    ph: 'PH009',
    variants: [{ size: '2x2', p202: 60, p304: 100 }],
  },
  {
    ph: 'PH010',
    variants: [
      { size: '3/4 Gold', price: 25, grade: '304' },
      { size: '1 Gold', price: 26, grade: '304' },
    ],
  },
  {
    ph: 'PH011',
    variants: [
      { size: '3/4', p202: 17, p304: 24 },
      { size: '1', p202: 19, p304: 25 },
      { size: '3/4 Gold', price: 27, grade: '304' },
      { size: '1 Gold', price: 29, grade: '304' },
    ],
  },
  {
    ph: 'PH012',
    variants: [
      { size: '3x3x2.5', price: 90 },
      { size: '3x4x3.0', price: 100 },
      { size: '4x4x3.0', price: 135 },
      { size: '3x1.2', price: 55 },
      { size: '4x2.0', price: 80 },
      { size: '5x3.0', price: 190 },
    ],
  },
  {
    ph: 'PH013',
    variants: [
      { size: '3/4', p202: 8, p304: 12 },
      { size: '7/8', p202: 9, p304: 13 },
      { size: '1', p202: 10, p304: 14 },
      { size: '1-1/4', p202: 11, p304: 17 },
      { size: '1-1/2', p202: 17, p304: 20 },
      { size: '1-3/4', p202: 20, p304: 30 },
      { size: '2', p202: 22, p304: 34 },
      { size: '2-1/2', p202: 28, p304: 45 },
      { size: '3', p202: 42, p304: 55 },
      { size: '4', p202: 70, p304: 85 },
    ],
  },
  {
    ph: 'PH014',
    variants: [
      { size: '3/4', p202: 16, p304: 30 },
      { size: '7/8', p202: 16, p304: 30 },
      { size: '1', p202: 16, p304: 30 },
    ],
  },
  {
    ph: 'PH015',
    variants: [
      { size: '3/4', p202: 13, p304: 26 },
      { size: '7/8', p202: 13, p304: 26 },
      { size: '1', p202: 13, p304: 26 },
    ],
  },
  { ph: 'PH016', variants: [{ size: 'Standard', p202: 13, p304: 26 }] },
  { ph: 'PH017', variants: [{ size: 'Standard', price: 62, grade: '304' }] },
  {
    ph: 'PH018',
    variants: [
      { size: '3/4', p202: 30, p304: 42 },
      { size: '7/8', p202: 30, p304: 45 },
      { size: '1', p202: 32, p304: 50 },
    ],
  },
  {
    ph: 'PH019',
    variants: [
      { size: '3/4', p202: 30, p304: 42 },
      { size: '7/8', p202: 30, p304: 45 },
      { size: '1', p202: 32, p304: 50 },
    ],
  },
  {
    ph: 'PH020',
    variants: [
      { size: '1x1', price: 10, grade: '304' },
      { size: '1-1/4x1-1/4', price: 12, grade: '304' },
      { size: '1-1/2x1-1/2', price: 14, grade: '304' },
      { size: '1x1-1/2', price: 14, grade: '304' },
      { size: '1x2', price: 18, grade: '304' },
      { size: '2x2', price: 20, grade: '304' },
      { size: 'Glass Flat', price: 120, grade: '304' },
      { size: 'Glass Round', price: 120, grade: '304' },
      { size: 'Wall Flat', price: 120, grade: '304' },
      { size: 'Wall Round', price: 120, grade: '304' },
    ],
  },
  {
    ph: 'PH021',
    variants: [
      { size: '100mm', p202: 30, p304: null },
      { size: '150mm', price: 35, grade: '304' },
      { size: '100mm/150mm', price: 60, grade: '304' },
      { size: '80mm combo', price: 80, grade: '304' },
    ],
  },
  {
    ph: 'PH022',
    variants: [
      { size: '1', p202: 10, p304: null },
      { size: '1-1/2', p202: 12, p304: null },
      { size: '2', p202: 18, p304: null },
      { size: '2-1/2', p202: 22, p304: null },
      { size: '3', p202: 25, p304: null },
      { size: '200mm', price: 38, grade: '304' },
    ],
  },
  {
    ph: 'PH023',
    variants: [
      { size: 'Square 125', price: 125, grade: '304' },
      { size: 'Round 125', price: 125, grade: '304' },
      { size: '4', price: 36, grade: '304' },
    ],
  },
  {
    ph: 'PH024',
    variants: [
      { size: '#1', p202: 20, p304: 28 },
      { size: '#2', p202: 24, p304: 40 },
      { size: '#3', p202: 28, p304: 50 },
      { size: '1-1/2', p202: 36, p304: null },
      { size: '1-1/2x1-1/2', price: 60, grade: '304' },
      { size: '2', price: 70, grade: '304' },
      { size: '2x2', price: 110, grade: '304' },
    ],
  },
  {
    ph: 'PH025',
    variants: [
      { size: '6inch', price: 180 },
      { size: '8inch', price: 240 },
      { size: '10inch', price: 380 },
    ],
  },
  {
    ph: 'PH026',
    variants: [
      { size: '8inch', price: 210, grade: '304' },
      { size: '12inch', price: 280, grade: '304' },
      { size: '8x60', price: 13, grade: '304' },
      { size: '8x70', price: 15, grade: '304' },
      { size: '8x80', price: 16, grade: '304' },
      { size: '8x100', price: 22, grade: '304' },
      { size: '10x70', price: 25, grade: '304' },
      { size: '10x80', price: 27, grade: '304' },
      { size: '10x100', price: 30, grade: '304' },
    ],
  },
  {
    ph: 'PH027',
    variants: [
      { size: '3/4x20', price: 72, grade: '304' },
      { size: '3/4x30', price: 78, grade: '304' },
      { size: '3/4x40', price: 92, grade: '304' },
      { size: '3/4x50', price: 100, grade: '304' },
      { size: '1x20', price: 88, grade: '304' },
      { size: '1x30', price: 100, grade: '304' },
      { size: '1x40', price: 120, grade: '304' },
      { size: '1x50', price: 130, grade: '304' },
    ],
  },
  {
    ph: 'PH028',
    variants: [
      { size: '1/2', price: 75, grade: '304' },
      { size: '5/8', price: 90, grade: '304' },
      { size: '3/4', price: 105, grade: '304' },
      { size: '7/8', price: 115, grade: '304' },
      { size: '1', price: 145, grade: '304' },
      { size: '1-1/4', price: 175, grade: '304' },
      { size: '1-1/2', price: 220, grade: '304' },
      { size: '1-3/4', price: 265, grade: '304' },
      { size: '2', price: 300, grade: '304' },
      { size: '4Inch', price: 105, grade: '202' },
    ],
  },
  {
    ph: 'PH029',
    variants: [{ size: 'Standard', price: 300 }],
  },
  {
    ph: 'PH030',
    variants: [
      { size: '1/8', price: 23 },
      { size: '5/32', price: 29 },
      { size: '3/16', price: 40 },
      { size: '1/4', price: 60 },
      { size: '5/16', price: 100 },
      { size: '3/8', price: 120 },
      { size: '1/2', price: 220 },
    ],
  },
  {
    ph: 'PH031',
    variants: [
      { size: '1x5 #120', price: 145 },
      { size: '1x5 #320', price: 175 },
      { size: '2x5 #120', price: 315 },
      { size: '2x5 #320', price: 325 },
      { size: '2x6', price: 230 },
      { size: '40x80', price: 100 },
    ],
  },
  {
    ph: 'PH032',
    variants: [
      { size: '5x8 #120', price: 18 },
      { size: '#240', price: 8.5 },
      { size: '#360', price: 8.5 },
      { size: '#400', price: 8.5 },
    ],
  },
  {
    ph: 'PH033',
    variants: [
      { size: '#800', price: 8.5 },
      { size: '#1000', price: 8.5 },
    ],
  },
  {
    ph: 'PH034',
    variants: [
      { size: '#40', price: 10 },
      { size: '#60', price: 10 },
      { size: '#80', price: 10 },
      { size: '#100', price: 10 },
    ],
  },
  { ph: 'PH035', variants: [{ size: 'Standard', price: 155 }] },
  {
    ph: 'PH036',
    variants: [
      { size: '4Inch', price: 105, grade: '202' },
      { size: '6Inch', price: 115, grade: '202' },
    ],
  },
  {
    ph: 'PH037',
    variants: [
      { size: '#200', price: 9000 },
      { size: '#250', price: 11000 },
    ],
  },
  { ph: 'PH038', variants: [{ size: 'Standard', price: 30000 }] },
  { ph: 'PH039', variants: [{ size: 'Standard', price: 40 }] },
  { ph: 'PH040', variants: [{ size: 'Standard', price: 450 }] },
  {
    ph: 'PH041',
    variants: [
      { size: '1.6', price: 320, grade: '304' },
      { size: '2.0', price: 320, grade: '304' },
      { size: 'Roll 320', price: 320 },
    ],
  },
  {
    ph: 'PH042',
    variants: [
      { size: '1.6', price: 30, grade: '304' },
      { size: '2.0', price: 53, grade: '304' },
      { size: '2.5', price: 68, grade: '304' },
      { size: '#80', price: 12 },
      { size: '#120', price: 12 },
      { size: '#240', price: 12 },
      { size: '#320', price: 12 },
    ],
  },
  {
    ph: 'PH043',
    variants: [
      { size: '#60', price: 18 },
      { size: '#80', price: 18 },
      { size: '#120', price: 18 },
      { size: '#240', price: 18 },
      { size: '#320', price: 18 },
      { size: '#400', price: 18 },
    ],
  },
  {
    ph: 'PH044',
    variants: [
      { size: '80mm', price: 58, grade: '304' },
      { size: '100mm', price: 70, grade: '304' },
      { size: '1inch', price: 10 },
      { size: '4inch', price: 15 },
    ],
  },
  {
    ph: 'PH045',
    variants: [
      { size: '80mm', price: 32, grade: '304' },
      { size: '100mm', price: 38, grade: '304' },
      { size: '1Inch', price: 8 },
      { size: '4Inch', price: 18 },
    ],
  },
  {
    ph: 'PH046',
    variants: [
      { size: '6Inch', price: 105 },
      { size: '80mm Silver', price: 72, grade: '304' },
      { size: '100mm Silver', price: 77, grade: '304' },
      { size: '80mm Gold', price: 77, grade: '304' },
      { size: '100mm Gold', price: 82, grade: '304' },
    ],
  },
  {
    ph: 'PH047',
    variants: [
      { size: '4Inch', price: 15 },
      { size: '6Inch', price: 35 },
      { size: '80mm Flat', price: 29, grade: '304' },
      { size: '100mm Flat', price: 34, grade: '304' },
      { size: '120mm Flat', price: 45, grade: '304' },
    ],
  },
  {
    ph: 'PH048',
    variants: [
      { size: '3mm', price: 18 },
      { size: '6mm', price: 25 },
    ],
  },
  {
    ph: 'PH049',
    variants: [{ size: 'BBB', price: 330 }],
  },
  {
    ph: 'PH050',
    variants: [
      { size: '4Inch', price: 8.5 },
      { size: '14Inch', price: 90 },
      { size: '4Inch FH', price: 6 },
    ],
  },
  {
    ph: 'PH051',
    variants: [
      { size: '20x40', price: 8 },
      { size: '25x40', price: 10 },
      { size: '30x40', price: 12 },
    ],
  },
  {
    ph: 'PH052',
    variants: [{ size: 'Round', price: 42, grade: '304' }],
  },
  {
    ph: 'PH053',
    variants: [{ size: 'SQ', price: 47, grade: '304' }],
  },
  {
    ph: 'PH054',
    variants: [{ size: 'Flat/Round', price: 70, grade: '304' }],
  },
  {
    ph: 'PH055',
    variants: [{ size: 'Flat/Round', price: 75, grade: '304' }],
  },
  {
    ph: 'PH056',
    variants: [
      { size: '80mm', price: 75, grade: '304' },
      { size: '100mm', price: 85, grade: '304' },
    ],
  },
  {
    ph: 'PH057',
    variants: [
      { size: '80mm', price: 58, grade: '304' },
      { size: '100mm', price: 70, grade: '304' },
    ],
  },
  {
    ph: 'PH058',
    variants: [
      { size: '80mm', price: 32, grade: '304' },
      { size: '100mm', price: 38, grade: '304' },
      { size: '80mm Silver', price: 72, grade: '304' },
      { size: '100mm Silver', price: 77, grade: '304' },
    ],
  },
  {
    ph: 'PH059',
    variants: [
      { size: '80mm Gold', price: 77, grade: '304' },
      { size: '100mm Gold', price: 82, grade: '304' },
    ],
  },
  {
    ph: 'PH060',
    variants: [
      { size: '16x100', price: 40, grade: '304' },
      { size: '16x120', price: 52, grade: '304' },
    ],
  },
  {
    ph: 'PH061',
    variants: [
      { size: '80mm', price: 85, grade: '304' },
      { size: '100mm', price: 100, grade: '304' },
    ],
  },
  {
    ph: 'PH062',
    variants: [
      { size: '80mm', price: 110, grade: '304' },
      { size: '100mm', price: 120, grade: '304' },
    ],
  },
  {
    ph: 'PH063',
    variants: [{ size: '750mm 3D', price: 280, grade: '304' }],
  },
  {
    ph: 'PH064',
    variants: [{ size: '750mm 3D', price: 280, grade: '304' }],
  },
  {
    ph: 'PH065',
    variants: [{ size: '750mm 3D', price: 300, grade: '304' }],
  },
  {
    ph: 'PH066',
    variants: [{ size: '750mm Flat', price: 320, grade: '304' }],
  },
  {
    ph: 'PH067',
    variants: [{ size: '750mm 3D', price: 300, grade: '304' }],
  },
  {
    ph: 'PH068',
    variants: [{ size: '750mm Flat', price: 320, grade: '304' }],
  },
  {
    ph: 'PH069',
    variants: [
      { size: '600mm 3D', price: 300, grade: '304' },
      { size: '750mm 3D', price: 220, grade: '304' },
    ],
  },
  {
    ph: 'PH070',
    variants: [
      { size: '100mm', p202: 20, p304: 30 },
      { size: '120mm', p202: 25, p304: 35 },
    ],
  },
  {
    ph: 'PH071',
    variants: [
      { size: '100mm', p202: 20, p304: 30 },
      { size: '120mm', p202: 25, p304: 35 },
    ],
  },
  {
    ph: 'PH072',
    variants: [
      { size: '100mm', p202: 20, p304: 30 },
      { size: '120mm', p202: 25, p304: 35 },
    ],
  },
  {
    ph: 'PH073',
    variants: [
      { size: '100mm', p202: 25, p304: 35 },
      { size: '120mm', p202: 30, p304: 40 },
    ],
  },
  {
    ph: 'PH074',
    variants: [
      { size: '100mm', p202: 20, p304: 30 },
      { size: '120mm', p202: 25, p304: 35 },
    ],
  },
  {
    ph: 'PH075',
    variants: [
      { size: '100mm', p202: 20, p304: 30 },
      { size: '120mm', p202: 25, p304: 35 },
    ],
  },
  {
    ph: 'PH076',
    variants: [
      { size: '100mm', p202: 20, p304: 30 },
      { size: '120mm', p202: 25, p304: 35 },
    ],
  },
  {
    ph: 'PH077',
    variants: [
      { size: '100mm', p202: 20, p304: 30 },
      { size: '120mm', p202: 25, p304: 35 },
    ],
  },
  {
    ph: 'PH078',
    variants: [{ size: '600mm 3D', price: 300, grade: '304' }],
  },
  {
    ph: 'PH079',
    variants: [{ size: '750mm 3D', price: 220, grade: '304' }],
  },
  {
    ph: 'PH080',
    variants: [{ size: '750mm 3D', price: 300, grade: '304' }],
  },
  {
    ph: 'PH081',
    variants: [{ size: '750mm 3D', price: 220, grade: '304' }],
  },
  {
    ph: 'PH082',
    variants: [{ size: '750mm SQ 3D', price: 220, grade: '304' }],
  },
  {
    ph: 'PH083',
    variants: [{ size: '750mm SQ 3D', price: 220, grade: '304' }],
  },
  {
    ph: 'PH084',
    variants: [{ size: '850mm 3D', price: 1200, grade: '304' }],
  },
  {
    ph: 'PH085',
    variants: [{ size: '850mm 3D', price: 1200, grade: '304' }],
  },
  {
    ph: 'PH086',
    variants: [{ size: '850mm 3D', price: 1350, grade: '304' }],
  },
  {
    ph: 'PH087',
    variants: [{ size: '850mm 3D', price: 1350, grade: '304' }],
  },
  {
    ph: 'PH088',
    variants: [{ size: '5mm', price: 150, grade: '304' }],
  },
  {
    ph: 'PH089',
    variants: [
      { size: 'Single Side', price: 60, grade: '304' },
      { size: 'Double Side', price: 95, grade: '304' },
      { size: 'L Side', price: 100, grade: '304' },
      { size: 'Size 2', price: 45, grade: '304' },
    ],
  },
  {
    ph: 'PH090',
    variants: [
      { size: '2.0', price: 630 },
      { size: '2.5', price: 550 },
    ],
  },
  { ph: 'PH098', variants: [{ size: 'Set', price: 1200 }] },
  {
    ph: 'PH099',
    variants: [
      { size: 'Big', price: 7 },
      { size: 'Small', price: 6 },
    ],
  },
  {
    ph: 'PH100',
    variants: [
      { size: '#1', price: 7 },
      { size: '#4', price: 10 },
      { size: '#6', price: 12 },
    ],
  },
  { ph: 'PH101', variants: [{ size: 'Standard', price: 115 }] },
  {
    ph: 'PH102',
    variants: [
      { size: '#1', price: 12 },
      { size: '#2', price: 16 },
      { size: '#3', price: 18 },
    ],
  },
  {
    ph: 'PH103',
    variants: [
      { size: '1.6', price: 9 },
      { size: '2.0', price: 9 },
      { size: '2.5', price: 9 },
    ],
  },
  { ph: 'PH104', variants: [{ size: 'Standard', price: 85, grade: '304' }] },
  { ph: 'PH105', variants: [{ size: 'Standard', price: 67, grade: '304' }] },
  { ph: 'PH106', variants: [{ size: 'Standard', price: 60, grade: '304' }] },
  { ph: 'PH107', variants: [{ size: 'Standard', price: 60, grade: '304' }] },
  { ph: 'PH108', variants: [{ size: 'Standard', price: 85, grade: '304' }] },
  { ph: 'PH109', variants: [{ size: '2-1/2', price: 55, grade: '304' }] },
  { ph: 'PH110', variants: [{ size: 'Standard', price: 300, grade: '304' }] },
  { ph: 'PH111', variants: [{ size: 'Standard', price: 300, grade: '304' }] },
  { ph: 'PH112', variants: [{ size: 'Standard', price: 470, grade: '304' }] },
  {
    ph: 'PH113',
    variants: [
      { size: '#1', price: 600, grade: '304' },
      { size: '#2', price: 450, grade: '304' },
    ],
  },
  { ph: 'PH114', variants: [{ size: 'Standard', price: 1500, grade: '304' }] },
  { ph: 'PH115', variants: [{ size: '304', price: 600 }] },
  { ph: 'PH116', variants: [{ size: '304', price: 600 }] },
  { ph: 'PH117', variants: [{ size: 'Standard', price: 500, grade: '304' }] },
  { ph: 'PH118', variants: [{ size: 'Standard', price: 800, grade: '304' }] },
  {
    ph: 'PH119',
    variants: [
      { size: '100mmx2', price: 170, grade: '304' },
      { size: '120mmx2', price: 190, grade: '304' },
      { size: '100mmx3', price: 210, grade: '304' },
      { size: '120mmx3', price: 220, grade: '304' },
    ],
  },
  {
    ph: 'PH120',
    variants: [
      { size: '4Wheels', price: 265, grade: '304' },
      { size: '8Wheels', price: 400, grade: '304' },
    ],
  },
  {
    ph: 'PH121',
    variants: [
      { size: '8L', price: 450, grade: '202' },
      { size: '12L', price: 700, grade: '202' },
    ],
  },
  {
    ph: 'PH122',
    variants: [
      { size: '32x300', price: 380, grade: '304' },
      { size: '32x600', price: 480, grade: '304' },
      { size: '32x300 alt', price: 350, grade: '304' },
      { size: '32x600 alt', price: 450, grade: '304' },
      { size: '32x900', price: 700, grade: '304' },
      { size: '32x1200', price: 950, grade: '304' },
    ],
  },
  {
    ph: 'PH124',
    variants: [
      { size: '1', p202: 75, p304: 135 },
      { size: '1-1/4', p202: 80, p304: 155 },
      { size: '1-1/2', p202: 100, p304: 170 },
      { size: '2', p202: 140, p304: 255 },
      { size: '1.8m', price: 255, grade: '304' },
    ],
  },
  { ph: 'PH125', variants: [{ size: 'Standard', price: 220, grade: '304' }] },
  {
    ph: 'PH126',
    variants: [
      { size: '#1', price: 310, grade: '304' },
      { size: '#2 360°', price: 400, grade: '304' },
      { size: '270 variant', price: 270, grade: '304' },
    ],
  },
  {
    ph: 'PH127',
    variants: [
      { size: '12Inch', price: 180, grade: '202' },
      { size: '14Inch', price: 210, grade: '304' },
      { size: '16Inch', price: 240, grade: '304' },
      { size: '18Inch', price: 270, grade: '304' },
      { size: '20Inch', price: 300, grade: '304' },
    ],
  },
  { ph: 'PH128', variants: [{ size: 'Standard', price: 365, grade: '304' }] },
  { ph: 'PH129', variants: [{ size: '125', price: 125, grade: '304' }] },
  {
    ph: 'PH130',
    variants: [
      { size: 'Single Side', price: 90, grade: '304' },
      { size: 'Double Side', price: 120, grade: '304' },
    ],
  },
  { ph: 'PH131', variants: [{ size: 'Standard', price: 365, grade: '304' }] },
  {
    ph: 'PH132',
    variants: [
      { size: '500mm', price: 40, grade: '202' },
      { size: '600mm', price: 46, grade: '202' },
    ],
  },
  { ph: 'PH133', variants: [{ size: 'Standard', price: 85, grade: '202' }] },
  { ph: 'PH134', variants: [{ size: 'Standard', price: 300, grade: '304' }] },
  {
    ph: 'PH135',
    variants: [
      { size: '6Inch', price: 52, grade: '202' },
      { size: '8Inch', price: 63, grade: '202' },
      { size: '10Inch', price: 72, grade: '202' },
      { size: '12Inch', price: 80, grade: '202' },
    ],
  },
  { ph: 'PH136', variants: [{ size: '1x200x400', price: 360, grade: '304' }] },
  { ph: 'PH137', variants: [{ size: 'Standard', price: 13 }] },
  {
    ph: 'PH138',
    variants: [
      { size: '22x48 V', price: 220, grade: '304' },
      { size: '30x68 V', price: 410, grade: '304' },
      { size: '22x48 U', price: 220, grade: '304' },
      { size: '30x68 U', price: 410, grade: '304' },
    ],
  },
  { ph: 'PH139', variants: [{ size: 'Standard', price: 30, grade: '202' }] },
  { ph: 'PH140', variants: [{ size: 'Standard', price: 58, grade: '304' }] },
  {
    ph: 'PH141',
    variants: [
      { size: '22x48 V', price: 450, grade: '304' },
      { size: '31x58 V', price: 500, grade: '304' },
      { size: '30x68 V', price: 640, grade: '304' },
      { size: '22x48 U', price: 450, grade: '304' },
      { size: '31x58 U', price: 500, grade: '304' },
      { size: '30x68 U', price: 640, grade: '304' },
    ],
  },
  {
    ph: 'PH142',
    variants: [
      { size: '50mm', price: 135, grade: '304' },
      { size: '70mm', price: 160, grade: '304' },
    ],
  },
  { ph: 'PH143', variants: [{ size: '100mm', price: 45, grade: '304' }] },
  {
    ph: 'PH144',
    variants: [
      { size: '60mm', price: 180, grade: '304' },
      { size: '70mm', price: 200, grade: '304' },
      { size: '80mm', price: 220, grade: '304' },
      { size: '90mm', price: 350, grade: '304' },
    ],
  },
  { ph: 'PH145', variants: [{ size: '6Inch', price: 50, grade: '304' }] },
  {
    ph: 'PH146',
    variants: [
      { size: '2Inch #80', price: 27 },
      { size: '2Inch #120', price: 27 },
      { size: '2Inch #240', price: 27 },
      { size: '2Inch #320', price: 27 },
      { size: '2Inch #202', price: 25 },
      { size: '3Inch', price: 33, grade: '202' },
    ],
  },
  {
    ph: 'PH147',
    variants: [
      { size: '3Inch', price: 50, grade: '202' },
      { size: '4Inch', price: 60, grade: '202' },
    ],
  },
  {
    ph: 'PH148',
    variants: [{ size: 'Silver', price: 600 }],
  },
  {
    ph: 'PH149',
    variants: [
      { size: 'Silver', price: 600 },
      { size: 'Black', price: 650, grade: '304' },
    ],
  },
  {
    ph: 'PH150',
    variants: [{ size: '850mm 3D', price: 350, grade: '304' }],
  },
  {
    ph: 'PH151',
    variants: [{ size: '750mm 3D', price: 320, grade: '304' }],
  },
  {
    ph: 'PH152',
    variants: [{ size: '750mm 3D', price: 340, grade: '304' }],
  },
  {
    ph: 'PH153',
    variants: [{ size: '750mm 3D', price: 340, grade: '304' }],
  },
  {
    ph: 'PH154',
    variants: [{ size: '750mm 3D', price: 360, grade: '304' }],
  },
  {
    ph: 'PH155',
    variants: [{ size: '750mm 3D', price: 340, grade: '304' }],
  },
  {
    ph: 'PH156',
    variants: [{ size: '750mm 3D', price: 340, grade: '304' }],
  },
  {
    ph: 'PH157',
    variants: [{ size: '750mm 3D', price: 360, grade: '304' }],
  },
  {
    ph: 'PH158',
    variants: [{ size: '750mm 3D', price: 340, grade: '304' }],
  },
];

let barcodeSeq = 8903001001001;
const rows = [];
const usedSkus = new Set();

function uniqueSku(base) {
  let sku = base.replace(/--+/g, '-').slice(0, 64);
  if (!usedSkus.has(sku)) {
    usedSkus.add(sku);
    return sku;
  }
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`.replace(/--+/g, '-').slice(0, 64);
    if (!usedSkus.has(candidate)) {
      usedSkus.add(candidate);
      return candidate;
    }
  }
  throw new Error(`Could not allocate unique SKU for ${base}`);
}

function addRow(ph, baseName, variant) {
  const grades = [];
  if (variant.p202 != null) grades.push({ grade: '202', price: variant.p202 });
  if (variant.p304 != null) grades.push({ grade: '304', price: variant.p304 });
  if (variant.price != null) {
    grades.push({ grade: variant.grade || '', price: variant.price });
  }
  if (grades.length === 0) return;

  for (const g of grades) {
    const sizeSlug = slug(variant.size || 'STD');
    const gradeSlug = g.grade ? `-${g.grade}` : '';
    const sku = uniqueSku(`SS-ACC-${ph}-${sizeSlug}${gradeSlug}`);
    const name = `${baseName} ${variant.size}${g.grade ? ` (${g.grade})` : ''}`.trim();
    rows.push({
      sku,
      name,
      category: CATEGORY,
      unit: 'pc',
      unitPrice: g.price,
      barcode: String(barcodeSeq++),
      grade: g.grade || '',
      size: variant.size,
      description: `${baseName} — ${ph} price list`,
      stock: 0,
    });
  }
}

for (const item of CATALOG) {
  const baseName = PH_NAMES[item.ph] || item.ph;
  for (const v of item.variants) {
    addRow(item.ph, baseName, v);
  }
}

const header =
  'SKU,Name,Category,Unit,UnitPrice,Barcode,Grade,Size,Description,StockQuantity';
const csvLines = [header];
for (const r of rows) {
  csvLines.push(
    [
      escapeCsv(r.sku),
      escapeCsv(r.name),
      escapeCsv(r.category),
      escapeCsv(r.unit),
      r.unitPrice,
      escapeCsv(r.barcode),
      escapeCsv(r.grade),
      escapeCsv(r.size),
      escapeCsv(r.description),
      r.stock,
    ].join(',')
  );
}

const outPath = new URL('./accessories-catalog.csv', import.meta.url);
fs.writeFileSync(outPath, csvLines.join('\n') + '\n', 'utf8');
console.log(`Wrote ${rows.length} product rows to accessories-catalog.csv`);
console.log(`PH groups: ${CATALOG.length}`);
