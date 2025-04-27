/**
 * processData.js  –  Bullet-proof CSV ➜ network-JSON
 * ---------------------------------------------------
 * • Handles 9-digit IDs.
 * • Merges multi-group nodes (`group:"2,3"`).
 * • Computes link depth *inside each Group separately*.
 * • Always writes output to  src/data/network_data.json
 *   (creates  src/data/  if it doesn’t exist, overwrites file if it does).
 *
 * USAGE
 *   node processData.js  [in.csv]
 *   default in.csv = out.csv
 */

const fs   = require("fs");
const path = require("path");
const csv  = require("csv-parser");

/*----------------------------------------------------
  CONFIG
----------------------------------------------------*/
const TYPE_NAMES = [
  "first", "second", "third", "fourth", "fifth",
  "sixth", "seventh", "eighth", "ninth", "tenth"
];
const UNKNOWN = {
  major: "Unknown", school: "Unknown",
  year : "Unknown", language: "Unknown"
};

/*----------------------------------------------------
  CLI params & fixed output path
----------------------------------------------------*/
const inCsv   = path.resolve(process.argv[2] || "out.csv");
const outDir  = path.resolve("src", "data");
const outJson = path.join(outDir, "network_data.json");

/*----------------------------------------------------
  Ensure  src/data/  exists
----------------------------------------------------*/
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

/*----------------------------------------------------
  1)  READ CSV
----------------------------------------------------*/
function readCSV (file) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(file)
      .pipe(csv())
      .on("data", d => rows.push(d))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

/*----------------------------------------------------
  2)  TARJAN  (strongly-connected components)
----------------------------------------------------*/
function tarjan(nodes, adj) {
  let index = 0, compCnt = 0;
  const idx=new Map(), low=new Map(), onStk=new Map(), comp=new Map();
  const stack = [];

  function strong(v) {
    idx.set(v, index); low.set(v, index); index++;
    stack.push(v); onStk.set(v, true);

    (adj.get(v) || []).forEach(w => {
      if (!idx.has(w)) { strong(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (onStk.get(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
    });

    if (low.get(v) === idx.get(v)) {
      let w; do { w = stack.pop(); onStk.set(w,false); comp.set(w,compCnt); }
      while (w !== v);
      compCnt++;
    }
  }

  nodes.forEach(n => { if (!idx.has(n)) strong(n); });
  return { comp, count: compCnt };
}

/*----------------------------------------------------
  3)  DEPTH per-GROUP
----------------------------------------------------*/
function linksForGroup(edgeList) {
  /* 3.1  adjacency --------------------------------------------------*/
  const nodeSet = new Set(), adj = new Map();
  edgeList.forEach(e => {
    nodeSet.add(e.src); nodeSet.add(e.tgt);
    if (!adj.has(e.src)) adj.set(e.src, []);
    adj.get(e.src).push(e.tgt);
  });

  /* 3.2  components -------------------------------------------------*/
  const { comp, count:cmpCnt } = tarjan([...nodeSet], adj);

  /* 3.3  component graph & longest-path depth -----------------------*/
  const indeg = Array(cmpCnt).fill(0);
  const cAdj  = Array.from({length:cmpCnt}, ()=>new Set());
  edgeList.forEach(({src,tgt}) => {
    const cS=comp.get(src), cT=comp.get(tgt);
    if (cS!==cT && !cAdj[cS].has(cT)) { cAdj[cS].add(cT); indeg[cT]++; }
  });

  const depth = Array(cmpCnt).fill(0), q=[];
  indeg.forEach((d,i)=>{ if(!d) q.push(i); });
  while(q.length){
    const c=q.shift();
    cAdj[c].forEach(nxt=>{
      if(depth[nxt]<depth[c]+1) depth[nxt]=depth[c]+1;
      if(--indeg[nxt]==0) q.push(nxt);
    });
  }

  /* 3.4  links with type -------------------------------------------*/
  return edgeList.map(({src,tgt,group})=>{
    const d = depth[comp.get(src)]+1;
    const idx = Math.min(d-1, TYPE_NAMES.length-1);
    return { source:src, target:tgt, type:TYPE_NAMES[idx], group };
  });
}

/*----------------------------------------------------
  4)  MAIN
----------------------------------------------------*/
async function buildNetwork() {
  const rows = await readCSV(inCsv);

  /* 4.1  sort rows (Group asc, timestamp asc) */
  rows.sort((a,b)=>{
    const gA=Number(a.Group||0), gB=Number(b.Group||0);
    if(gA!==gB) return gA-gB;
    return new Date(a.Timestamp)-new Date(b.Timestamp);
  });

  /* 4.2  nodes & edges --------------------------------------------*/
  const nodeMap=new Map();
  const ensureNode=(id,fromRow,row)=>{
    if(!id) return;
    if(!nodeMap.has(id)){
      nodeMap.set(id,{
        id,
        major:   fromRow?row.Major:UNKNOWN.major,
        school:  fromRow?row.School:UNKNOWN.school,
        year:    fromRow?String(row["Year (Class of )"]||row.year||""):UNKNOWN.year,
        language:fromRow?row["Languages You Speak (Rank by Frequency)"]:UNKNOWN.language,
        _groups:new Set()
      });
    }
    (row.Group||"").toString().split(/[, ]+/).filter(Boolean)
      .forEach(g=>nodeMap.get(id)._groups.add(g));
  };

  const edges=[];
  rows.forEach(r=>{
    const src=(r.UNI||"").trim();
    const tgt=(r["Next Person(s) UNI"]||"").trim();
    const grp=(r.Group||"").toString().trim();
    if(!src) return;
    ensureNode(src,true,r);
    if(tgt) ensureNode(tgt,false,{Group:grp});
    if(tgt) edges.push({src,tgt,group:grp});
  });

  /* 4.3  bucket by group & compute depth ---------------------------*/
  const byGroup=new Map();
  edges.forEach(e=>{
    if(!byGroup.has(e.group)) byGroup.set(e.group,[]);
    byGroup.get(e.group).push(e);
  });

  const links=[];
  for(const [,list] of byGroup) links.push(...linksForGroup(list));

  /* 4.4  final node list ------------------------------------------*/
  const nodes=[...nodeMap.values()].map(n=>{
    const out={...n};
    out.group=[...out._groups].sort((a,b)=>a-b).join(",");
    delete out._groups;
    return out;
  });

  return {nodes, links};
}

/*----------------------------------------------------
  5)  RUN
----------------------------------------------------*/
buildNetwork()
  .then(net=>{
    fs.writeFileSync(outJson, JSON.stringify(net,null,2));    // overwrite if exists
    console.log(`✓  ${net.nodes.length} nodes & ${net.links.length} links ➜  ${outJson}`);
  })
  .catch(err=>{ console.error(err); process.exit(1); });