const VANTA_SHEET_ID  = "1eimdR6Vgm5O1E_fjFJ17IwK0bZwXX0KNqxhfmkXJ-jI";
const VANTA_STATE_TAB = "_vanta_state";

const PORTFOLIO_COLS = {
  "#": "rowNum", "Entries": "name", "Origination Channel": "origination",
  "Inception Year": "inceptionYear", "Lead": "lead", "Stage": "stage",
  "Phase": "phase", "Phase Gate Evidence Link": "phaseGateLink",
  "Rating (1-5)": "rating", "Capital Needed (₦)": "capitalNeeded",
  "Capital Deployed (₦)": "capitalDeployed", "Capital Source": "capitalSource",
  "Value Metrics Choice (1)": "valueMetric1", "Column1": "valueMetric1Label",
  "Value Metric Result (1)": "valueMetricResult1",
  "Value Metrics Choice (2)": "valueMetric2", "Value Metric Result (2)": "valueMetricResult2",
  "Value Metrics Choice (3)": "valueMetric3", "Value Metric Result (3)": "valueMetricResult3",
  "Trium Value Realization Type": "valueRealizationType",
  "Trium Value Realization Timeline": "valueRealizationTimeline",
  "Theme / Thesis Fit": "sector", "Problem Statement": "description",
  "Target Customer": "targetCustomer", "Value Proposition": "valueProposition",
  "Strategic Partner Dependency": "strategicPartnerDependency",
  "Regulatory / Compliance Flag": "regulatoryFlag",
  "Expected Path to Value": "expectedRevenue",
  "Most Important Value Metric": "mostImportantMetric",
  "Key Metrics (stage-appropriate)": "keyMetrics",
  "Milestones Achieved": "milestones", "Next Milestones": "nextStep",
};

const SERVICES_COLS = {
  "#": "rowNum", "Initiative Name": "name", "Stage": "stage", "Phase": "phase",
  "Origination Channel": "origination", "Monthly Update": "monthlyUpdate",
  "Client / Partner Name": "client", "Client Point of Contact": "clientContact",
  "Trium Engagement Lead": "triumLead", "Engagement Type": "engagementType",
  "Fee Structure": "feeStructure", "Deal Value (₦'000)": "dealValue",
  "Scope Summary": "description", "Key Deliverables Achieved": "milestones",
  "Next Deliverables": "nextStep", "Blockers / Dependencies": "blockers",
};

const PORTFOLIO_IDS = ["Entries","Initiatives","Initiative Name"];
const SERVICES_IDS  = ["Initiative Name","Initiatives","Entries"];
const NUMBER_FIELDS = new Set(["rating","capitalNeeded","capitalDeployed","inceptionYear"]);
const SKIP_FIELDS   = new Set(["rowNum"]);

async function getFreshToken() {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body: new URLSearchParams({
      grant_type:"refresh_token", refresh_token:process.env.GOOGLE_REFRESH_TOKEN,
      client_id:process.env.GOOGLE_CLIENT_ID, client_secret:process.env.GOOGLE_CLIENT_SECRET,
    }),
  });
  const d = await r.json();
  if (!r.ok||!d.access_token) throw new Error(`Token refresh failed: ${d.error_description||d.error}`);
  return d.access_token;
}

async function sheetsReq(token, path, method="GET", body=null) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${VANTA_SHEET_ID}${path}`, {
    method, headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message||`Sheets error ${r.status}`);
  return d;
}

function findHeaderRow(rows, ids) {
  for (let i=0;i<Math.min(40,rows.length);i++) {
    const row=(rows[i]||[]).map(c=>String(c||"").trim());
    if (ids.some(id=>row.includes(id))) return i;
  }
  return -1;
}

function parseTab(values, colMap, ids) {
  if (!values||!values.length) return {items:[],headerIdx:-1,headers:[]};
  const headerIdx=findHeaderRow(values,ids);
  if (headerIdx===-1) return {items:[],headerIdx:-1,headers:[]};
  const headers=(values[headerIdx]||[]).map(h=>String(h||"").trim());
  const nameCol=headers.findIndex(h=>ids.includes(h));
  const items=[];
  for (let r=headerIdx+1;r<values.length;r++) {
    const row=values[r]||[];
    const name=String(row[nameCol]||"").trim();
    if (!name||name.startsWith("=")||name==="#"||name==="—"||name==="Total"||name.length>150) continue;
    const obj={id:`sheet_r${r}`,sheetRow:r+1,sheetRowIndex:r};
    headers.forEach((h,i)=>{
      const field=colMap[h];
      if (!field||SKIP_FIELDS.has(field)) return;
      const raw=row[i];
      const val=(raw!==undefined&&raw!==null&&String(raw).trim()!=="")?String(raw).trim():null;
      if (NUMBER_FIELDS.has(field)&&val!==null) {
        const n=parseFloat(val.replace(/[₦,\s]/g,""));
        obj[field]=isNaN(n)?null:n;
      } else { obj[field]=val; }
    });
    if (!obj.name) obj.name=name;
    // Normalize: if Stage column says "Sunsetted", remap to Pretotype + Sunsetted phase
    if (obj.stage==="Sunsetted") { obj.stage="Pretotype"; if (!obj.phase) obj.phase="Sunsetted"; }
    items.push(obj);
  }
  return {items,headerIdx,headers};
}

function buildRow(item, headers, colMap) {
  return headers.map(h=>{
    if (SKIP_FIELDS.has(colMap[h])) return "";
    const field=colMap[h];
    if (!field) return "";
    const v=item[field];
    return (v!==null&&v!==undefined)?String(v):"";
  });
}

async function getSheetMeta(token) {
  const meta=await sheetsReq(token,"");
  return meta.sheets||[];
}

async function readTab(token, sheets, tabName, colMap, ids) {
  const sheet=sheets.find(s=>s.properties.title.trim()===tabName.trim());
  if (!sheet) { console.error(`Tab not found: ${tabName}`); return {items:[],headerIdx:-1,headers:[]}; }
  const title=sheet.properties.title;
  try {
    const d=await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${VANTA_SHEET_ID}/values/${encodeURIComponent(title)}`,
      {headers:{Authorization:`Bearer ${token}`}}
    ).then(async r=>{
      const d=await r.json();
      if (!r.ok) throw new Error(d.error?.message||`Error ${r.status}`);
      return d;
    });
    console.log(`Tab "${title}": ${d.values?.length||0} rows`);
    return parseTab(d.values||[],colMap,ids);
  } catch(e) {
    console.error(`Error reading "${tabName}":`,e.message);
    return {items:[],headerIdx:-1,headers:[]};
  }
}

async function appendToTab(token, sheets, tabName, item, colMap, ids) {
  const sheet=sheets.find(s=>s.properties.title.trim()===tabName.trim());
  if (!sheet) throw new Error(`Tab "${tabName}" not found`);
  const title=sheet.properties.title;
  // Get headers
  const headRes=await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${VANTA_SHEET_ID}/values/${encodeURIComponent(title)}!1:5`,
    {headers:{Authorization:`Bearer ${token}`}}
  ).then(r=>r.json());
  const allRows=headRes.values||[];
  const headerIdx=findHeaderRow(allRows,ids);
  if (headerIdx===-1) throw new Error(`Header not found in "${tabName}"`);
  const headers=(allRows[headerIdx]||[]).map(h=>String(h||"").trim());
  const row=buildRow(item,headers,colMap);
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${VANTA_SHEET_ID}/values/${encodeURIComponent(title)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({values:[row]})}
  ).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error?.message);return d;});
}

async function deleteRow(token, sheets, tabName, sheetRow) {
  const sheet=sheets.find(s=>s.properties.title.trim()===tabName.trim());
  if (!sheet) throw new Error(`Tab "${tabName}" not found`);
  const sheetId=sheet.properties.sheetId;
  await sheetsReq(token,":batchUpdate","POST",{
    requests:[{deleteDimension:{range:{
      sheetId, dimension:"ROWS",
      startIndex:sheetRow-1, endIndex:sheetRow
    }}}]
  });
}

async function readVantaState(token) {
  try {
    const d=await sheetsReq(token,`/values/${encodeURIComponent(VANTA_STATE_TAB)}!A1`);
    if (!d.values?.[0]?.[0]) return {};
    return JSON.parse(d.values[0][0]);
  } catch { return {}; }
}

async function ensureVantaStateTab(token) {
  try {
    const meta=await sheetsReq(token,"");
    const exists=meta.sheets?.some(s=>s.properties?.title===VANTA_STATE_TAB);
    if (!exists) await sheetsReq(token,":batchUpdate","POST",{requests:[{addSheet:{properties:{title:VANTA_STATE_TAB,hidden:true}}}]});
  } catch(e){console.error("ensureVantaStateTab:",e.message);}
}

async function writeVantaState(token,vantaState) {
  await ensureVantaStateTab(token);
  await sheetsReq(token,`/values/${encodeURIComponent(VANTA_STATE_TAB)}!A1?valueInputOption=RAW`,"PUT",{values:[[JSON.stringify(vantaState)]]});
}

function detectDuplicates(items) {
  const counts={};
  items.forEach(p=>{const k=(p.name||"").toLowerCase().trim();counts[k]=(counts[k]||0)+1;});
  return Object.keys(counts).filter(k=>counts[k]>1)
    .map(k=>items.find(p=>(p.name||"").toLowerCase().trim()===k)?.name||k);
}

module.exports = async function handler(req,res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method==="OPTIONS") return res.status(204).end();
  if (!process.env.GOOGLE_REFRESH_TOKEN) return res.status(500).json({error:"Google credentials not configured."});

  let token;
  try { token=await getFreshToken(); }
  catch(err) { return res.status(500).json({error:`Auth failed: ${err.message}`}); }

  try {
    if (req.method==="GET") {
      const { tab } = req.query;
      const sheets=await getSheetMeta(token);
      console.log("Sheets:",sheets.map(s=>s.properties.title));

      // Support per-tab import via ?tab=portfolio|bank|services
      if (tab==="portfolio") {
        const po=await readTab(token,sheets,"Portfolio Overview",PORTFOLIO_COLS,PORTFOLIO_IDS);
        return res.status(200).json({portfolio:po.items,debug:{count:po.items.length}});
      }
      if (tab==="bank") {
        const bk=await readTab(token,sheets,"Bank",PORTFOLIO_COLS,PORTFOLIO_IDS);
        return res.status(200).json({bank:bk.items,debug:{count:bk.items.length}});
      }
      if (tab==="services") {
        const sv=await readTab(token,sheets,"Services",SERVICES_COLS,SERVICES_IDS);
        return res.status(200).json({services:sv.items,debug:{count:sv.items.length}});
      }

      // Full load
      const [po,svc,bank,vantaState]=await Promise.all([
        readTab(token,sheets,"Portfolio Overview",PORTFOLIO_COLS,PORTFOLIO_IDS),
        readTab(token,sheets,"Services",SERVICES_COLS,SERVICES_IDS),
        readTab(token,sheets,"Bank",PORTFOLIO_COLS,PORTFOLIO_IDS),
        readVantaState(token),
      ]);

      const hidden=vantaState["__hidden"]||{};

      const portfolio=po.items
        .filter(item=>!hidden[item.name])
        .map(item=>({
          rag:"Amber",ragDriver:"",assessmentStatus:"not_assessed",
          assessmentScore:null,burnRate:null,revenueMTD:null,
          source:"internal",daysInStage:null,fullName:item.name,
          ...(vantaState[item.name]||{}),
          ...item,
          ...Object.fromEntries(Object.entries(vantaState[item.name]||{}).filter(([k])=>!["id","sheetRow"].includes(k))),
        }));

      const services=svc.items.map(item=>({
        rag:"Amber",nextStep:item.nextStep||"",
        ...(vantaState["svc_"+item.name]||{}),
        ...item,
        ...Object.fromEntries(Object.entries(vantaState["svc_"+item.name]||{}).filter(([k])=>!["id","sheetRow"].includes(k))),
      }));

      const bankItems=bank.items
        .filter(item=>!hidden[item.name])
        .map(item=>({...(vantaState["bank_"+item.name]||{}),...item}));

      return res.status(200).json({
        portfolio, services, bank:bankItems,
        duplicates:detectDuplicates(portfolio),
        debug:{portfolioCount:po.items.length,servicesCount:svc.items.length,bankCount:bank.items.length},
      });
    }

    if (req.method==="POST") {
      const {action,vantaState,item,fromTab,toTab}=req.body;

      // Save vanta-side state (RAG, assessment, etc.)
      if (action==="saveVantaState") {
        await writeVantaState(token,vantaState);
        return res.status(200).json({status:"ok"});
      }

      // Hide an item (mark in _vanta_state, never delete from sheet)
      if (action==="hideItem") {
        const vs=await readVantaState(token);
        vs["__hidden"]=vs["__hidden"]||{};
        vs["__hidden"][item.name]=true;
        await writeVantaState(token,vs);
        return res.status(200).json({status:"ok"});
      }

      // Move item between tabs (copy to dest, delete from source)
      if (action==="moveItem") {
        const sheets=await getSheetMeta(token);
        const srcTabName = fromTab==="portfolio"?"Portfolio Overview":"Bank";
        const dstTabName = toTab==="portfolio"?"Portfolio Overview":"Bank";
        const srcColMap  = PORTFOLIO_COLS;
        const srcIds     = PORTFOLIO_IDS;
        // 1. Append to destination tab
        await appendToTab(token,sheets,dstTabName,item,srcColMap,srcIds);
        // 2. Delete from source tab
        if (item.sheetRow) await deleteRow(token,sheets,srcTabName,item.sheetRow);
        return res.status(200).json({status:"ok"});
      }

      // Add idea to Bank tab (from Idea Intake)
      if (action==="addToBank") {
        const sheets=await getSheetMeta(token);
        await appendToTab(token,sheets,"Bank",item,PORTFOLIO_COLS,PORTFOLIO_IDS);
        return res.status(200).json({status:"ok"});
      }

      return res.status(400).json({error:`Unknown action: ${action}`});
    }

    return res.status(405).json({error:"Method not allowed"});
  } catch(err) {
    console.error("State error:",err.message);
    return res.status(500).json({error:err.message});
  }
};

