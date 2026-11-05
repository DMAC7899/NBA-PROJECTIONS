const fs = require('fs');
const vm = require('vm');
const path = require('path');

const scriptSrc = fs.readFileSync(path.join(__dirname, 'current_script_nov05.js'), 'utf8');

// Extract current app-data JSON straight from index.html to make sure we test exactly what's on disk.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="app-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!m) { console.error('APP-DATA NOT FOUND'); process.exit(1); }
const appDataText = m[1];

function makeStubEl() {
  const el = {
    textContent: '',
    innerHTML: '',
    value: '',
    dataset: {},
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: {},
    children: [],
    options: [],
    selected: false,
    addEventListener(){},
    removeEventListener(){},
    appendChild(){ return el; },
    remove(){},
    querySelector(sel){ return makeStubEl(); },
    querySelectorAll(sel){ return []; },
    setAttribute(){},
    getAttribute(){ return null; },
    cloneNode(){ return makeStubEl(); },
  };
  return el;
}

const elCache = {};
const stubDocument = {
  getElementById(id) {
    if (id === 'app-data') {
      return { textContent: appDataText };
    }
    if (!elCache[id]) elCache[id] = makeStubEl();
    return elCache[id];
  },
  querySelectorAll(sel) { return []; },
  querySelector(sel) { return makeStubEl(); },
  createElement(tag) { return makeStubEl(); },
  addEventListener(){},
  body: makeStubEl(),
};

const sandbox = {
  document: stubDocument,
  window: {},
  console: console,
  Math: Math,
  JSON: JSON,
  Object: Object,
  Array: Array,
  Date: Date,
  Set: Set,
  Map: Map,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  String: String,
  Number: Number,
  localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const context = vm.createContext(sandbox);

// Expose the functions/data we need for the sweep (vm top-level const/function decls don't auto-
// attach to the sandbox global object, per this project's established pattern).
const exposerLines = `
globalThis.__computeProjection = computeProjection;
globalThis.__TEAMS = TEAMS;
globalThis.__PLAYERS = PLAYERS;
globalThis.__LEAGUE_AVG = LEAGUE_AVG;
`;

const fullSrc = scriptSrc + '\n' + exposerLines;

try {
  vm.runInContext(fullSrc, context, { filename: 'current_script_nov05.js' });
} catch (e) {
  console.error('SCRIPT_EXECUTION_ERROR:', e.stack || e.message);
  process.exit(1);
}

const computeProjection = sandbox.__computeProjection;
const TEAMS = sandbox.__TEAMS;
const PLAYERS = sandbox.__PLAYERS;

if (typeof computeProjection !== 'function') {
  console.error('computeProjection not found on sandbox');
  process.exit(1);
}

const STAT_KEYS = ['min','pts','trb','ast','tpm','stl','blk','tov','fgp','ftp'];
let totalRuns = 0;
let errorCount = 0;
let nanCount = 0;
const errorSamples = [];
const nanSamples = [];

for (const player of PLAYERS) {
  const teamAbbr = player.t;
  const team = TEAMS[teamAbbr];
  if (!team) {
    errorCount++;
    errorSamples.push(`Player ${player.n} (id=${player.id}) has unknown team '${teamAbbr}'`);
    continue;
  }
  const sch = team.sch || [];
  for (const game of sch) {
    totalRuns++;
    let result;
    try {
      result = computeProjection(player, game, teamAbbr);
    } catch (e) {
      errorCount++;
      if (errorSamples.length < 30) errorSamples.push(`${player.n} (id=${player.id}) vs ${game.opp} on ${game.date}: ${e.message}`);
      continue;
    }
    if (result === null || result === undefined) continue; // null is a valid "no data" return
    for (const key of STAT_KEYS) {
      const v = result[key];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        nanCount++;
        if (nanSamples.length < 30) nanSamples.push(`${player.n} (id=${player.id}) vs ${game.opp} on ${game.date}: ${key}=${v}`);
      }
    }
  }
}

console.log(`Total player-game runs: ${totalRuns}`);
console.log(`Errors thrown: ${errorCount}`);
console.log(`NaN/non-finite values: ${nanCount}`);
if (errorSamples.length) {
  console.log('--- ERROR SAMPLES ---');
  errorSamples.forEach(s => console.log('  ' + s));
}
if (nanSamples.length) {
  console.log('--- NAN SAMPLES ---');
  nanSamples.forEach(s => console.log('  ' + s));
}

if (errorCount > 0 || nanCount > 0) {
  console.log('REGRESSION_SWEEP: FAIL');
  process.exit(1);
} else {
  console.log('REGRESSION_SWEEP: PASS');
}
