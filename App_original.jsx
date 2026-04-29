import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

// ── Sync helpers ──────────────────────────────────────────────────────────────
const VANTA_SHEET_ID = "1eimdR6Vgm5O1E_fjFJ17IwK0bZwXX0KNqxhfmkXJ-jI";

// Fields stored in Google Sheet (structural)
const SHEET_FIELDS = new Set(["name","fullName","origination","inceptionYear","lead","stage","phase","phaseGateLink","rating","capitalNeeded","capitalDeployed","valueMetric1","valueMetric1Label","valueMetricResult1","valueMetric2","valueMetricResult2","valueMetric3","valueMetricResult3","sector","description","targetCustomer","valueProposition","strategicPartnerDependency","regulatoryFlag","expectedRevenue","mostImportantMetric","keyMetrics","milestones","nextStep"]);

// Fields stored in _vanta_state tab (Vanta-specific)
const VANTA_ONLY_FIELDS = ["rag","ragDriver","assessmentStatus","assessmentScore","burnRate","revenueMTD","source","daysInStage"];

function buildVantaState(portfolio) {
  const state = {};
  portfolio.forEach(p => {
    state[p.name] = {};
    VANTA_ONLY_FIELDS.forEach(f => { if (p[f] !== undefined) state[p.name][f] = p[f]; });
  });
  return state;
}

// ── CONFIG ────────────────────────────────────────────────────────────────────
const ADMIN_PIN      = "trium2026";
const TRIASSESS_URL  = "https://triumassess.netlify.app";

// ── PORTFOLIO DATA ────────────────────────────────────────────────────────────
const INIT_PORTFOLIO = [
  { id:1,  name:"Fiducia",     fullName:"Fiducia – Supply chain finance",                                    origination:"Trium",           inceptionYear:2022, lead:"Lemboye",           stage:"Venture/Platform (Built)",    phase:"Live",           rating:3, capitalNeeded:null,       capitalDeployed:3510705525, sector:"Trade Finance",           description:"Supply chain finance providing working capital to suppliers through anchor buyers.", targetCustomer:"SMEs, Large Corporates", expectedRevenue:"Revenue share on invoice discounting", rag:"Green", ragDriver:"Product", milestones:"Live and generating revenue. Revenue MTD: ₦95.4m", nextStep:"Revenue growth and partner expansion", burnRate:null, runway:null, revenueMTD:95450, daysInStage:null, assessmentStatus:"assessed", assessmentScore:null, source:"internal" },
  { id:2,  name:"Sigma",       fullName:"Sigma (NGX Invest) – Capital Market Digital Gateway",              origination:"Trium",           inceptionYear:2025, lead:"Seyi Ahmed",        stage:"Venture/Platform (Built)",    phase:"Live",           rating:3, capitalNeeded:null,       capitalDeployed:88960714,   sector:"Capital Market",          description:"Digital gateway enabling retail and institutional investors to access capital market products via NGX.", targetCustomer:"Retail investors, Institutional investors", expectedRevenue:"Transaction fees, platform licensing", rag:"Amber", ragDriver:"GTM", milestones:"Live. Independent audit of NGX accounts authorized.", nextStep:"Audit NGX accounts; African expansion", burnRate:null, runway:null, revenueMTD:null, daysInStage:null, assessmentStatus:"assessed", assessmentScore:null, source:"internal" },
  { id:3,  name:"Oxygen X",    fullName:"Oxygen X",                                                         origination:"Access Holdings", inceptionYear:2025, lead:"Lemboye",           stage:"Venture/Platform (Invested)", phase:"IC",             rating:3, capitalNeeded:1500000000, capitalDeployed:0,           sector:"Financial Inclusion",     description:"Credit infrastructure platform targeting underserved segments using alternative data.", targetCustomer:"Mass market consumers, SMEs", expectedRevenue:"Interest income, transaction fees", rag:"Amber", ragDriver:"People", milestones:"IC stage — investment committee review pending", nextStep:"IC approval and capital deployment", burnRate:null, runway:null, revenueMTD:null, daysInStage:45, assessmentStatus:"assessed", assessmentScore:null, source:"internal" },
  { id:4,  name:"Sparkle MFB", fullName:"Sparkle MFB",                                                      origination:"Access Holdings", inceptionYear:2020, lead:"Lemboye",           stage:"Venture/Platform (Invested)", phase:"Live",           rating:1, capitalNeeded:null,       capitalDeployed:180400000,  sector:"Financial Inclusion",     description:"Lifestyle and financial ecosystem for Nigeria's retailers, SMEs, and individuals.", targetCustomer:"Retail consumers, SMEs", expectedRevenue:"Revenue share", rag:"Red", ragDriver:"GTM", milestones:"Live. Performance below expectations.", nextStep:"Strategic review", burnRate:null, runway:null, revenueMTD:null, daysInStage:null, assessmentStatus:"assessed", assessmentScore:null, source:"internal" },
  { id:5,  name:"Pi",          fullName:"Pi – Capital Market identity infrastructure",                       origination:"Trium",           inceptionYear:2025, lead:"Seyi Ahmed",        stage:"Pretotype",                   phase:"In-development", rating:3, capitalNeeded:70000000,   capitalDeployed:0,           sector:"Capital Market",          description:"Investors submit KYC repeatedly across disconnected market participants. Pi is a unified identity layer.", targetCustomer:"Retail investors, Institutional investors", expectedRevenue:"SaaS licensing", rag:"Amber", ragDriver:"Product", milestones:"Awaiting SEC ratification", nextStep:"NIMC and CAC consortium engagement", burnRate:null, runway:null, revenueMTD:null, daysInStage:120, assessmentStatus:"assessed", assessmentScore:null, source:"internal" },
  { id:6,  name:"Elysium",     fullName:"Elysium – Employee Benefits Management Platform",                   origination:"Trium",           inceptionYear:2025, lead:"Seyi Ahmed",        stage:"Pretotype",                   phase:"In-development", rating:4, capitalNeeded:40000000,   capitalDeployed:0,           sector:"HR Tech",                 description:"Nigerian employers manage benefits across disconnected providers. Elysium unifies them.", targetCustomer:"Mid-sized corporates", expectedRevenue:"SaaS subscription per employee", rag:"Amber", ragDriver:"People", milestones:"VbaaS engagement with Access ARM Pensions in progress", nextStep:"Funding & Co-Development Sign-off", burnRate:null, runway:null, revenueMTD:null, daysInStage:90, assessmentStatus:"assessed", assessmentScore:null, source:"internal" },
  { id:7,  name:"ESTRA",       fullName:"ESTRA – State probate digitalization & marketplace",                origination:"Trium",           inceptionYear:2025, lead:"Elizabeth Olagunju",stage:"Pretotype",                   phase:"In-development", rating:3, capitalNeeded:70400000,   capitalDeployed:0,           sector:"GovTech / LegalTech",     description:"Nigeria's probate process is fully manual and paper-heavy. ESTRA digitizes and creates a marketplace.", targetCustomer:"Legal trustees, Homeowners", expectedRevenue:"Transaction fee per document", rag:"Amber", ragDriver:"GTM", milestones:"Seeking pilot state partnership", nextStep:"Pilot state partnership", burnRate:null, runway:null, revenueMTD:null, daysInStage:85, assessmentStatus:"assessed", assessmentScore:null, source:"internal" },
  { id:8,  name:"NII",         fullName:"National Insurance Interchange – Centralised API-first registry",  origination:"Coronation Group", inceptionYear:2025, lead:"Seyi Ahmed",        stage:"Pretotype",                   phase:"In-development", rating:5, capitalNeeded:null,       capitalDeployed:0,           sector:"InsurTech / GovTech",     description:"Nigeria lacks a unified source of truth for insurance. NII creates a centralised, API-first insurance registry.", targetCustomer:"Insurance companies, NAICOM", expectedRevenue:"API access licensing", rag:"Green", ragDriver:"Product", milestones:"Securing NAICOM leadership buy-in", nextStep:"Formal regulatory presentation to NAICOM", burnRate:null, runway:null, revenueMTD:null, daysInStage:60, assessmentStatus:"assessed", assessmentScore:75, source:"internal" },
  { id:9,  name:"Aleph Null",  fullName:"Aleph Null – Digital Asset Custody Service",                       origination:"Trium",           inceptionYear:2022, lead:"Mosa Issachar",     stage:"MVP",                         phase:"In-development", rating:3, capitalNeeded:2140900000, capitalDeployed:13676000,   sector:"Digital Assets",          description:"Nigeria lacks a regulated domestic custodian for crypto. Aleph Null provides SEC-regulated digital asset custody.", targetCustomer:"HNIs, Retail investors", expectedRevenue:"Custody fees, transaction fees", rag:"Amber", ragDriver:"Tech", milestones:"Beta testing phase commencing", nextStep:"Onboard QA testing partner", burnRate:null, runway:null, revenueMTD:null, daysInStage:180, assessmentStatus:"assessed", assessmentScore:null, source:"internal" },
  { id:10, name:"Sana",        fullName:"Sana – Marketplace for fractional ownership of high-value assets", origination:"Coronation Group", inceptionYear:2025, lead:"Mosa Issachar",     stage:"Idea",                        phase:"IC",             rating:3, capitalNeeded:null,       capitalDeployed:0,           sector:"Alternative Investments", description:"High-value alternative assets in Nigeria accessible only to HNIs. Sana enables regulated fractional ownership.", targetCustomer:"Retail investors, HNIs", expectedRevenue:"Transaction fees", rag:"Amber", ragDriver:"GTM", milestones:"Decision on pilot asset class pending", nextStep:"IC review", burnRate:null, runway:null, revenueMTD:null, daysInStage:45, assessmentStatus:"awaiting", assessmentScore:null, source:"internal" },
  { id:11, name:"TrustCore",   fullName:"TrustCore – Trust Service Provider for digital trade documents",    origination:"Trium",           inceptionYear:2026, lead:"Olanrewaju Taiwo",  stage:"Idea",                        phase:"IC",             rating:4, capitalNeeded:null,       capitalDeployed:0,           sector:"Trade Finance / LegalTech",description:"Cross-border trade in Nigeria remains paper-based. TrustCore provides digital trust services.", targetCustomer:"Corporate finance teams, Large corporates", expectedRevenue:"Transaction fee per document", rag:"Amber", ragDriver:"Product", milestones:"eMudhra identified as preferred tech partner", nextStep:"IC Approval; partnership proposal to eMudhra", burnRate:null, runway:null, revenueMTD:null, daysInStage:30, assessmentStatus:"awaiting", assessmentScore:null, source:"internal" },
  { id:12, name:"ECE",         fullName:"Event Contract Exchange – Platform for trading real world events",  origination:"OSAPT",           inceptionYear:2026, lead:"Olanrewaju Taiwo",  stage:"Idea",                        phase:"IC",             rating:3, capitalNeeded:null,       capitalDeployed:0,           sector:"Alternative Finance",     description:"Nigeria lacks a regulated market for event-contingent financial contracts.", targetCustomer:"Institutional investors, Retail traders", expectedRevenue:"Trading fees", rag:"Amber", ragDriver:"GTM", milestones:"SA support for SEC buy-in; SEC workshop planned", nextStep:"IC approval", burnRate:null, runway:null, revenueMTD:null, daysInStage:30, assessmentStatus:"not_assessed", assessmentScore:null, source:"internal" },
  { id:13, name:"NIDHE",       fullName:"Nigeria Digital Health Infrastructure",                             origination:"OSAPT",           inceptionYear:2026, lead:"Seyi Ahmed",        stage:"Idea",                        phase:"IC",             rating:4, capitalNeeded:null,       capitalDeployed:0,           sector:"HealthTech",              description:"Nigeria's health sector is fragmented. NIDHE creates a national digital health ecosystem.", targetCustomer:"Federal Ministry of Health, HMOs", expectedRevenue:"Government SaaS concession", rag:"Amber", ragDriver:"People", milestones:"Executive order pending; IC submission completed", nextStep:"IC approval", burnRate:null, runway:null, revenueMTD:null, daysInStage:30, assessmentStatus:"not_assessed", assessmentScore:null, source:"internal" },
  { id:14, name:"Delta",       fullName:"Delta – USSD channel for stock trading",                            origination:"Trium",           inceptionYear:2021, lead:"Seyi Ahmed",        stage:"Sunsetted",                   phase:"Sunsetted",      rating:1, capitalNeeded:null,       capitalDeployed:0,           sector:"Capital Market",          description:"Stock trading inaccessible via USSD. Sunsetted due to regulatory challenges.", targetCustomer:"Mass market consumers", expectedRevenue:"N/A", rag:"Red", ragDriver:"Product", milestones:"Sunsetted", nextStep:"N/A", burnRate:null, runway:null, revenueMTD:null, daysInStage:null, assessmentStatus:"assessed", assessmentScore:null, source:"internal" },
  { id:15, name:"Epsilon",     fullName:"Epsilon – Digital escrow payments platform",                        origination:"Trium",           inceptionYear:2022, lead:"Seyi Ahmed",        stage:"Sunsetted",                   phase:"Sunsetted",      rating:0, capitalNeeded:null,       capitalDeployed:0,           sector:"Financial Inclusion",     description:"Digital escrow platform. Sunsetted due to market timing.", targetCustomer:"E-commerce platforms", expectedRevenue:"N/A", rag:"Red", ragDriver:"GTM", milestones:"Sunsetted", nextStep:"N/A", burnRate:null, runway:null, revenueMTD:null, daysInStage:null, assessmentStatus:"assessed", assessmentScore:null, source:"internal" },
];

const INIT_BANK = [
  { id:"b1",  name:"Corosync",       sector:"AI / ERP",             description:"AI tool for identifying strategic partnership opportunities." },
  { id:"b2",  name:"UniScore",       sector:"Credit Infrastructure", description:"Unified credit score built from bureau, fintech, and telco data." },
  { id:"b3",  name:"Aura AI",        sector:"AI",                   description:"AI-powered platform for local-language customer support." },
  { id:"b4",  name:"Travel Africa",  sector:"Travel-tech",          description:"End-to-end travel booking platform for Africa." },
  { id:"b5",  name:"ScendCentra",    sector:"Financial Inclusion",  description:"Multi-currency virtual account for global payments." },
  { id:"b6",  name:"PayNaija Direct",sector:"Financial Inclusion",  description:"Direct bank-to-bank online payments without cards." },
  { id:"b7",  name:"Farmzy",         sector:"Agritech",             description:"Marketplace linking consumers and retailers to fresh food suppliers." },
  { id:"b8",  name:"FreitGo",        sector:"Logistics",            description:"Digital freight forwarding and shipment management platform." },
  { id:"b9",  name:"E-Court",        sector:"GovTech",              description:"E-Court Management System — court processes digitized." },
  { id:"b10", name:"LandRegistry",   sector:"GovTech",              description:"Digital Land Registry & title/property verification system." },
  { id:"b11", name:"PowerHer Africa",sector:"Financial Inclusion",  description:"Community hubs providing women with financial services." },
  { id:"b12", name:"EarnNow",        sector:"HR Tech",              description:"Employee Pay On-Demand — instant access to earned wages." },
];

const INIT_SERVICES = [
  { id:"s1", name:"Detty Fusion",      stage:"MVP",       phase:"Live",           origination:"Access Bank", client:"Access Bank", clientContact:"Ijeoma Rita", triumLead:"Reva Attah",  engagementType:"Payment Aggregator", feeStructure:"Revenue Share", dealValue:"Nill", monthlyUpdate:"Trium has completed the collaboration signing process. Agreement pending execution by Access Bank.", nextStep:"Execute collaboration agreement", rag:"Amber" },
  { id:"s2", name:"USSD for Insurance",stage:"Pretotype", phase:"In-Development", origination:"CIL",         client:"CIL",         clientContact:"Olawunmi Kolawole", triumLead:"Seyi Ahmed", engagementType:"Co-Build", feeStructure:"Revenue Share", dealValue:"Nill", monthlyUpdate:"Project in follow-up phase. Coronation feasibility review response pending.", nextStep:"Await Coronation feasibility review", rag:"Red" },
];

const INIT_DECISIONS = [
  { id:"d1", venture:"Elysium",   decision:"Funding & Co-Development Sign-off",   context:"VbaaS engagement requires sign-off with Access ARM Pensions for funding.", deadline:"2026-04-26", owner:"Seyi Ahmed",       status:"Pending" },
  { id:"d2", venture:"TrustCore", decision:"IC Approval to advance to pretotype", context:"Investment Committee Approval required to advance idea to pretotype.",      deadline:"2026-05-26", owner:"Olanrewaju Taiwo", status:"Pending" },
];

const INIT_ACTIONS = [
  { id:"a1", action:"Authorize independent audit of NGX accounts to validate Trium's revenue share.",           venture:"Sigma",    owner:"Trium Finance", dueDate:"2026-03-28", priority:"High",   status:"Pending" },
  { id:"a2", action:"Initiate high-level engagement with NIMC and CAC for consortium partnership discussions.", venture:"Pi",       owner:"Seyi Ahmed",    dueDate:"2026-04-29", priority:"High",   status:"Pending" },
  { id:"a3", action:"Approve onboarding of independent QA testing partner; commence beta testing.",             venture:"Aleph Null",owner:"Mosa Issachar", dueDate:"2026-04-30", priority:"Medium", status:"Pending" },
  { id:"a4", action:"Convene strategic review with Federal Ministry of Health for executive order alignment.",  venture:"NIDHE",    owner:"Seyi Ahmed",    dueDate:"2026-05-01", priority:"High",   status:"Pending" },
  { id:"a5", action:"Secure NAICOM leadership buy-in through formal regulatory presentation.",                  venture:"NII",      owner:"Seyi Ahmed",    dueDate:"2026-05-02", priority:"High",   status:"On Track" },
];

// ── CRM CONTACT DATA ─────────────────────────────────────────────────────────
const INIT_INVESTORS = [
  { id:"i1", name:"Access Holdings Plc", type:"Strategic Partner", contactPerson:"Herbert Wigwe", email:"group.ceo@accessbankplc.com", phone:"+234 1 2802500", relationship:"Active", stage:"Portfolio Partner", lastContact:"2026-04-10", warmth:"Warm", notes:"Primary holding partner. Key sponsor of Oxygen X and Sparkle MFB. Ongoing engagement via Access Mobility.", ventures:["Oxygen X","Sparkle MFB","Detty Fusion"], totalCommitted:1680400000 },
  { id:"i2", name:"Coronation Group",    type:"Strategic Partner", contactPerson:"Aigboje Aig-Imoukhuede", email:"aig-imoukhuede@coronationgroup.com", phone:"+234 1 4617000", relationship:"Active", stage:"Portfolio Partner", lastContact:"2026-04-05", warmth:"Warm", notes:"Co-originator of NII and Sana. Exploring Project Delta revival. Feasibility review for USSD Insurance pending.", ventures:["NII","Sana","USSD for Insurance"], totalCommitted:0 },
  { id:"i3", name:"OSAPT",              type:"Government Agency", contactPerson:"Seyi Adesanya", email:"info@osapt.gov.ng", phone:"+234 9 2900000", relationship:"Active", stage:"Co-creator", lastContact:"2026-03-28", warmth:"Warm", notes:"Co-originator of ECE and NIDHE. Federal government agency partnership critical for regulatory enablement.", ventures:["ECE","NIDHE"], totalCommitted:0 },
  { id:"i4", name:"eMudhra",            type:"Technology Partner", contactPerson:"V. Sriram", email:"v.sriram@emudhra.com", phone:"+91 80 6921 8888", relationship:"Prospect", stage:"Prospect", lastContact:"2026-04-01", warmth:"Cold", notes:"Identified as preferred tech partner for TrustCore. Partnership proposal pending IC approval.", ventures:["TrustCore"], totalCommitted:0 },
  { id:"i5", name:"NAICOM",            type:"Regulator", contactPerson:"Commissioner for Insurance", email:"info@naicom.gov.ng", phone:"+234 9 4600200", relationship:"Active", stage:"Engagement", lastContact:"2026-04-08", warmth:"Warm", notes:"Key regulator for NII. Formal regulatory presentation being prepared to secure NAICOM buy-in.", ventures:["NII"], totalCommitted:0 },
  { id:"i6", name:"NGX Group",         type:"Strategic Partner", contactPerson:"Temi Popoola", email:"info@ngxgroup.com", phone:"+234 1 2642871", relationship:"Active", stage:"Live Partnership", lastContact:"2026-04-12", warmth:"Hot", notes:"Active partner on Sigma (NGX Invest). Independent audit of NGX accounts authorized. African expansion discussions ongoing.", ventures:["Sigma"], totalCommitted:88960714 },
];

const INIT_ENGAGEMENTS = [
  { id:"e1", contact:"Access Holdings Plc", contactPerson:"Herbert Wigwe", type:"Board Meeting",       date:"2026-04-10", venture:"Oxygen X",    summary:"IC presentation review. Discussed capital deployment timeline and go-to-market strategy.", outcome:"Follow-up IC session scheduled for May.", nextAction:"Prepare detailed capital deployment plan", nextDate:"2026-05-05", status:"Completed", triumpLead:"Lemboye" },
  { id:"e2", contact:"Coronation Group",    contactPerson:"Olawunmi Kolawole", type:"Follow-up Call",  date:"2026-04-05", venture:"USSD for Insurance", summary:"Chased Coronation feasibility review response. Review still in progress.", outcome:"Promised response by end of April.", nextAction:"Follow up if no response by April 30", nextDate:"2026-04-30", status:"Pending", triumpLead:"Seyi Ahmed" },
  { id:"e3", contact:"NGX Group",          contactPerson:"Temi Popoola",    type:"Working Session",    date:"2026-04-12", venture:"Sigma",       summary:"Reviewed audit requirements for NGX accounts. Discussed African expansion roadmap.", outcome:"Audit team identified. Timeline agreed.", nextAction:"Engage audit firm and share NDA", nextDate:"2026-04-25", status:"In Progress", triumpLead:"Seyi Ahmed" },
  { id:"e4", contact:"NAICOM",             contactPerson:"Commissioner for Insurance", type:"Regulatory Meeting", date:"2026-04-08", venture:"NII", summary:"Initial engagement to brief NAICOM on NII concept and centralised insurance registry opportunity.", outcome:"Commissioner expressed interest. Formal presentation requested.", nextAction:"Prepare formal regulatory presentation deck", nextDate:"2026-05-02", status:"In Progress", triumpLead:"Seyi Ahmed" },
  { id:"e5", contact:"eMudhra",            contactPerson:"V. Sriram",       type:"Discovery Call",     date:"2026-04-01", venture:"TrustCore",   summary:"Explored eMudhra's digital trust capabilities and API infrastructure relevant to TrustCore.", outcome:"eMudhra confirmed interest. Partnership proposal requested.", nextAction:"Draft partnership proposal post-IC approval", nextDate:"2026-05-15", status:"Pending", triumpLead:"Olanrewaju Taiwo" },
];

const INIT_FUNDRAISING = [
  { id:"f1", venture:"Aleph Null",  round:"Seed",         targetAmount:2140900000, raisedAmount:13676000,  stage:"In Progress", lead:"Trium",           investors:"TBD", probability:40, expectedClose:"2026-Q3", notes:"SEC regulatory approval pending. Beta testing commencing. Pitch deck ready.", status:"Active" },
  { id:"f2", venture:"Oxygen X",    round:"Series A",     targetAmount:1500000000, raisedAmount:0,         stage:"IC Review",   lead:"Access Holdings", investors:"Access Holdings", probability:65, expectedClose:"2026-Q2", notes:"IC presentation completed. Capital deployment subject to IC approval.", status:"Active" },
  { id:"f3", venture:"Elysium",     round:"Co-development",targetAmount:40000000,  raisedAmount:0,         stage:"Negotiation", lead:"Trium",           investors:"Access ARM Pensions", probability:70, expectedClose:"2026-Q2", notes:"VbaaS engagement terms under negotiation. Funding & sign-off pending.", status:"Active" },
  { id:"f4", venture:"Pi",          round:"Seed",         targetAmount:70000000,   raisedAmount:0,         stage:"Pipeline",    lead:"Trium",           investors:"TBD", probability:50, expectedClose:"2026-Q4", notes:"Awaiting SEC ratification before fundraising begins.", status:"Pipeline" },
  { id:"f5", venture:"ESTRA",       round:"Seed",         targetAmount:70400000,   raisedAmount:0,         stage:"Pipeline",    lead:"Trium",           investors:"TBD", probability:35, expectedClose:"2026-Q3", notes:"Pilot state partnership required before investor conversations.", status:"Pipeline" },
];

// ── CRM DATA (placeholder — inactive) ────────────────────────────────────────
const CRM_CATEGORIES = [
  { name:"Venture Pipeline", weight:25, criteria:[
    { name:"Idea Pipeline Management",    weight:7,  desc:"Ability to capture, prioritise, stage, and track venture ideas from concept to incubation." },
    { name:"Idea Validation Workflow",    weight:7,  desc:"Support for hypothesis tracking, market validation, customer discovery, and go/no-go gates." },
    { name:"Stage-Gate / Funnel Visibility",weight:6,desc:"Define venture stages with movement rules and dashboards." },
    { name:"Deal / Opportunity Management",weight:5, desc:"Track partnerships, venture opportunities, inbound proposals, and strategic deals." },
  ]},
  { name:"Investment & Strategy", weight:20, criteria:[
    { name:"Investment Tracking",         weight:6,  desc:"Track internal investments, funding rounds, tranche releases, and capital deployment." },
    { name:"Portfolio Monitoring",        weight:5,  desc:"Track venture KPIs, milestones, risks, and progress across portfolio companies." },
    { name:"Strategic Planning Support",  weight:5,  desc:"Support for OKRs, strategic initiatives, venture objectives, and review cadence." },
    { name:"Scenario / Decision Support", weight:4,  desc:"Scorecards, investment memos, and decision workflows." },
  ]},
  { name:"Investor Relations", weight:20, criteria:[
    { name:"Investor Database",           weight:5,  desc:"Centralised investor and LP contact management with relationship history." },
    { name:"Investor Engagement Tracking",weight:5,  desc:"Track meetings, touchpoints, fundraising discussions, and follow-ups." },
    { name:"Investor Reporting",          weight:5,  desc:"Periodic updates, reporting packs, and segmented LP communications." },
    { name:"Fundraising Pipeline",        weight:5,  desc:"Visibility into capital raise pipeline, stage, probability, and next actions." },
  ]},
  { name:"Fund Accounting", weight:4, criteria:[
    { name:"Capital Call & Distribution", weight:2,  desc:"Manage capital calls, LP commitments, distributions, and financial reporting." },
    { name:"Fund Performance Tracking",   weight:2,  desc:"Track fund-level metrics: NAV, IRR, capital calls, distributions." },
  ]},
  { name:"Integration & Data", weight:9, criteria:[
    { name:"API / Integration Capability",weight:4,  desc:"Ability to integrate with email, calendar, and other internal tools." },
    { name:"Third-Party Ecosystem",       weight:3,  desc:"Available integrations for Outlook, Calendar, BI, and finance tools." },
    { name:"Data Structure Flexibility",  weight:2,  desc:"Customisable to Trium and portfolio company brand and workflows." },
  ]},
  { name:"Usability", weight:4, criteria:[
    { name:"Ease of Use",                 weight:3,  desc:"Simple UI, fast adoption, desktop notifications, minimal admin burden." },
    { name:"Mobile / Remote Access",      weight:1,  desc:"Quality of mobile access and remote usability." },
  ]},
  { name:"Security & Compliance", weight:5, criteria:[
    { name:"Security Controls",           weight:3,  desc:"Encryption, roles/permissions, SSO, audit trails, data privacy." },
    { name:"Compliance",                  weight:2,  desc:"Support for NDPC and relevant enterprise compliance expectations." },
  ]},
  { name:"Implementation & Support", weight:6, criteria:[
    { name:"Implementation Effort",       weight:3,  desc:"Ease and speed of deployment, migration, and configuration." },
    { name:"Vendor Support & Training",   weight:3,  desc:"Responsiveness, onboarding, training, help centre, and customer success." },
  ]},
  { name:"Cost", weight:5, criteria:[
    { name:"Licensing Cost",              weight:3,  desc:"Subscription cost relative to expected value." },
    { name:"Implementation / Customisation Cost",weight:2,desc:"One-time setup, migration, and customisation cost." },
  ]},
  { name:"Vendor Strength", weight:2, criteria:[
    { name:"Market Reputation",           weight:1,  desc:"Track record, references, and credibility in relevant sectors." },
    { name:"Product Roadmap",             weight:1,  desc:"Evidence of continued innovation and roadmap fit." },
  ]},
];

// ── STAGE / STYLE CONSTANTS ───────────────────────────────────────────────────
const STAGES = ["Idea","Pretotype","MVP","Venture/Platform (Built)","Venture/Platform (Invested)"];
const STAGE_META = {
  "Idea":                        { short:"Idea",     color:"#7F77DD", lightBg:"#EEEDFE", lightText:"#3C3489", darkBg:"#1e0a3c", darkText:"#c4b5fd" },
  "Pretotype":                   { short:"Pretotype",color:"#BA7517", lightBg:"#FAEEDA", lightText:"#633806", darkBg:"#1c1509", darkText:"#fbbf24" },
  "MVP":                         { short:"MVP",      color:"#1D9E75", lightBg:"#E1F5EE", lightText:"#085041", darkBg:"#052e16", darkText:"#34d399" },
  "Venture/Platform (Built)":    { short:"Venture",  color:"#185FA5", lightBg:"#E6F1FB", lightText:"#0C447C", darkBg:"#0c1a2e", darkText:"#38bdf8" },
  "Venture/Platform (Invested)": { short:"Invested", color:"#534AB7", lightBg:"#EEEDFE", lightText:"#3C3489", darkBg:"#1e0a3c", darkText:"#a78bfa" },
  "Sunsetted":                   { short:"Sunsetted",color:"#888780", lightBg:"#F1EFE8", lightText:"#5F5E5A", darkBg:"#111827", darkText:"#9ca3af" },
};
const RAG_META = {
  Green:{ dot:"#1D9E75", lightBg:"#E1F5EE", lightText:"#085041", darkBg:"#052e16", darkText:"#34d399" },
  Amber:{ dot:"#BA7517", lightBg:"#FAEEDA", lightText:"#633806", darkBg:"#1c1509", darkText:"#fbbf24" },
  Red:  { dot:"#E24B4A", lightBg:"#FCEBEB", lightText:"#791F1F", darkBg:"#1c0a0a", darkText:"#f87171" },
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmt = (n) => { if (!n||n===0||n==="N/A") return "—"; if (n>=1e9) return `₦${(n/1e9).toFixed(1)}bn`; if (n>=1e6) return `₦${(n/1e6).toFixed(1)}m`; if (n>=1e3) return `₦${(n/1e3).toFixed(0)}k`; return `₦${n}`; };
const daysDue = (d) => d ? Math.ceil((new Date(d)-new Date())/86400000) : null;
const isOverdue = (d) => d && new Date(d) < new Date();
const LS = { get:(k)=>{ try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch{return null;} }, set:(k,v)=>{ try{localStorage.setItem(k,JSON.stringify(v));}catch{} } };
const newAudit = (field,oldVal,newVal,ideaId) => ({ id:Date.now(), timestamp:new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}), field, oldVal:String(oldVal||"").slice(0,80), newVal:String(newVal||"").slice(0,80), ideaId });

async function callClaude(prompt, maxTokens=1200) {
  const res = await fetch("/api/claude",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:maxTokens, messages:[{role:"user",content:prompt}] }) });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message||"API error");
  return data.content?.map(b=>b.text||"").join("")||"";
}
function parseJSON(t) { const c=t.replace(/```json|```/g,"").trim(); try{return JSON.parse(c);}catch{const m=c.match(/[\[{][\s\S]*[\]}]/);if(m)return JSON.parse(m[0]);throw new Error("Parse error");} }

function healthScore(p) {
  const active=p.filter(x=>x.phase?.toLowerCase()!=="sunsetted");
  const advanced=active.filter(x=>["MVP","Venture/Platform (Built)","Venture/Platform (Invested)"].includes(x.stage));
  const pretotypes=active.filter(x=>x.stage==="Pretotype");
  const deployed=active.filter(x=>x.capitalDeployed>0);
  const sectors=new Set(active.map(x=>(x.sector||"").split("/")[0].trim()));
  let s=Math.round((advanced.length/Math.max(active.length,1))*35);
  s+=Math.min(25,pretotypes.length*5);
  s+=Math.round((deployed.length/Math.max(active.length,1))*20);
  s+=Math.min(10,sectors.size*1.5);
  s+=10;
  return Math.min(100,Math.round(s));
}

// ── THEME HOOK ────────────────────────────────────────────────────────────────
function useTheme() {
  const [theme,setTheme]=useState(()=>LS.get("vanta_theme")||"light");
  useEffect(()=>{ document.documentElement.setAttribute("data-theme",theme); LS.set("vanta_theme",theme); },[theme]);
  return { dark:theme==="dark", toggle:()=>setTheme(t=>t==="dark"?"light":"dark") };
}

// ── STYLE HELPERS ─────────────────────────────────────────────────────────────
const card   = { background:"var(--card)", border:"1px solid var(--cardBorder)", borderRadius:12, padding:"20px 22px" };
const cardSm = { ...card, borderRadius:9, padding:"14px 16px" };
const lbl    = { fontSize:12, fontWeight:600, color:"var(--textMuted)", marginBottom:6, display:"block", letterSpacing:"0.4px", textTransform:"uppercase" };
const IS     = { width:"100%", background:"var(--inputBg)", border:"1px solid var(--cardBorder)", borderRadius:8, padding:"9px 12px", fontSize:14, color:"var(--text)", fontFamily:"inherit", outline:"none", resize:"vertical" };
const btn = (primary,danger) => ({
  background: danger?"var(--redBg)":primary?"var(--accent)":"transparent",
  color: danger?"var(--red)":primary?"#fff":"var(--textMuted)",
  border: danger?"1px solid var(--red)":primary?"none":"1px solid var(--cardBorder)",
  borderRadius:8, padding:"9px 18px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"opacity 0.15s",
});

// ── UI PRIMITIVES ─────────────────────────────────────────────────────────────
function StageBadge({stage,dark}) {
  const m=STAGE_META[stage]||STAGE_META["Sunsetted"];
  return <span style={{background:dark?m.darkBg:m.lightBg,color:dark?m.darkText:m.lightText,fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,display:"inline-block"}}>{m.short}</span>;
}
function RagBadge({rag,dark}) {
  const r=RAG_META[rag]||RAG_META["Amber"];
  return <span style={{background:dark?r.darkBg:r.lightBg,color:dark?r.darkText:r.lightText,fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,display:"inline-block"}}>{rag||"—"}</span>;
}
function RatingDots({rating}) {
  return <span style={{display:"inline-flex",gap:3}}>{[1,2,3,4,5].map(i=><span key={i} style={{width:7,height:7,borderRadius:"50%",display:"inline-block",background:i<=(rating||0)?"var(--gold)":"var(--cardBorder)"}}/>)}</span>;
}
function AssessmentBadge({status,score}) {
  if (status==="assessed"&&score) return <span style={{background:"var(--tealBg)",color:"var(--teal)",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20}}>Assessed · {score}</span>;
  if (status==="awaiting") return <span style={{background:"var(--goldBg)",color:"var(--gold)",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20}}>⏳ Awaiting Assessment</span>;
  return <span style={{background:"var(--inputBg)",color:"var(--textMuted)",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20}}>Not assessed</span>;
}

function StatCard({label,value,sub,color}) {
  return <div style={{background:"var(--card)",border:"1px solid var(--cardBorder)",borderRadius:10,padding:"18px 20px",textAlign:"center"}}>
    <div style={{fontSize:12,fontWeight:600,color:"var(--textMuted)",letterSpacing:"0.4px",textTransform:"uppercase",marginBottom:8}}>{label}</div>
    <div style={{fontSize:28,fontWeight:700,color:color||"var(--text)",lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:13,color:"var(--textMuted)",marginTop:6}}>{sub}</div>}
  </div>;
}

function EditableCell({value,onChange,type="text",options,isAdmin}) {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(value||"");
  if (!isAdmin) return <span style={{fontSize:14,color:"var(--text)"}}>{value||"—"}</span>;
  if (!editing) return <span onClick={()=>{setDraft(value||"");setEditing(true);}} style={{cursor:"pointer",fontSize:14,color:"var(--text)",borderBottom:"1px dashed var(--cardBorder)"}}>
    {value||<em style={{color:"var(--textMuted)"}}>click to edit</em>}
  </span>;
  return <span style={{display:"inline-flex",gap:6,alignItems:"center"}}>
    {options?<select value={draft} onChange={e=>setDraft(e.target.value)} style={{...IS,width:"auto",padding:"4px 8px",fontSize:13}}>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>:<input value={draft} onChange={e=>setDraft(e.target.value)} type={type} style={{...IS,width:160,padding:"4px 8px",fontSize:13,resize:"none"}} autoFocus/>}
    <button onClick={()=>{onChange(draft);setEditing(false);}} style={{...btn(true),padding:"3px 10px",fontSize:12}}>✓</button>
    <button onClick={()=>setEditing(false)} style={{...btn(false),padding:"3px 8px",fontSize:12,opacity:0.6}}>✕</button>
  </span>;
}

// ── ORIGINATION CHART ────────────────────────────────────────────────────────
function OriginationChart({ portfolio, compact = false }) {
  const SEGMENTS = [
    { key:"venture",  label:"Venture", color:"#185FA5", test: p => p.stage?.includes("Venture") || p.stage?.includes("Platform") },
    { key:"mvp",      label:"MVP",     color:"#1D9E75", test: p => p.stage === "MVP" },
    { key:"pretotype",label:"Pretotype",color:"#BA7517",test: p => p.stage === "Pretotype" },
    { key:"idea",     label:"Idea",    color:"#7F77DD", test: p => p.stage === "Idea" },
    { key:"sunsetted",label:"Sunsetted",color:"#888780",test: p => p.stage === "Sunsetted" },
  ];

  const channels = [...new Set(portfolio.map(p => p.origination).filter(Boolean))];
  const rows = channels.map(ch => {
    const items = portfolio.filter(p => p.origination === ch);
    const counts = {};
    SEGMENTS.forEach(s => { counts[s.key] = items.filter(s.test).length; });
    return { ch, counts, total: items.length };
  }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);

  if (rows.length === 0) return null;
  const maxTotal = Math.max(...rows.map(r => r.total));
  const barH = compact ? 22 : 28;
  const gap   = compact ? 10 : 14;

  return (
    <div>
      {/* Legend */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:compact?10:14 }}>
        {SEGMENTS.filter(s => rows.some(r => r.counts[s.key] > 0)).map(s => (
          <div key={s.key} style={{ display:"flex", alignItems:"center", gap:5, fontSize:compact?11:12, color:"var(--textMuted)" }}>
            <div style={{ width:10, height:10, borderRadius:2, background:s.color }}/>
            {s.label}
          </div>
        ))}
      </div>

      {/* Bars */}
      <div style={{ display:"grid", gap:gap }}>
        {rows.map(r => (
          <div key={r.ch}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <span style={{ fontSize:compact?11:13, fontWeight:600, color:"var(--text)" }}>{r.ch}</span>
              <span style={{ fontSize:compact?10:12, color:"var(--textMuted)" }}>{r.total} initiative{r.total !== 1 ? "s" : ""}</span>
            </div>
            {/* Stacked bar */}
            <div style={{ display:"flex", height:barH, borderRadius:6, overflow:"hidden", background:"var(--inputBg)", width:"100%" }}>
              {SEGMENTS.map(s => {
                const count = r.counts[s.key];
                if (!count) return null;
                const pct = (count / maxTotal) * 100;
                return (
                  <div key={s.key} title={`${s.label}: ${count}`}
                    style={{ width:`${pct}%`, background:s.color, display:"flex", alignItems:"center", justifyContent:"center", minWidth: count > 0 ? 20 : 0, transition:"width 0.3s" }}>
                    {count > 0 && pct > 5 && (
                      <span style={{ fontSize:compact?9:11, fontWeight:700, color:"#fff" }}>{count}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Total row */}
      {!compact && (
        <div style={{ marginTop:14, paddingTop:10, borderTop:"1px solid var(--cardBorder)", display:"flex", gap:16, flexWrap:"wrap" }}>
          {SEGMENTS.filter(s => rows.some(r => r.counts[s.key] > 0)).map(s => {
            const total = rows.reduce((sum, r) => sum + r.counts[s.key], 0);
            const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
            return (
              <div key={s.key} style={{ fontSize:12, color:"var(--textMuted)" }}>
                <span style={{ fontWeight:700, color:s.color }}>{total}</span> {s.label}
                <span style={{ fontSize:11, marginLeft:4 }}>({Math.round((total/grandTotal)*100)}%)</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({portfolio,dark,decisions,actions,onSelectIdea,onNav,onImport}) {
  const [fStage,setFStage]   = useState("All");
  const [fLead,setFLead]     = useState("All");
  const [fRag,setFRag]       = useState("All");
  const [sortBy,setSortBy]   = useState("default");
  const [showSunset,setShowSunset] = useState(true);
  const [search,setSearch]   = useState("");

  const isSunset = p => p.phase?.toLowerCase()==="sunsetted";
  const active   = portfolio.filter(p=>!isSunset(p));
  const totalDep = portfolio.reduce((s,p)=>s+(p.capitalDeployed||0),0);
  const totalNeed= portfolio.reduce((s,p)=>s+(p.capitalNeeded||0),0);
  const ventureCount = portfolio.filter(p=>p.stage?.includes("Venture")||p.stage?.includes("Platform")).length;
  const leads = ["All",...new Set(portfolio.map(p=>p.lead).filter(Boolean))];

  const filtered = portfolio.filter(p=>{
    if (!showSunset && isSunset(p)) return false;
    const q=search.toLowerCase();
    return (!q||p.name.toLowerCase().includes(q)||(p.description||"").toLowerCase().includes(q))
      &&(fStage==="All"||p.stage===fStage)
      &&(fLead==="All"||p.lead===fLead)
      &&(fRag==="All"||p.rag===fRag);
  });

  const sortedFiltered = [...filtered].sort((a,b)=>{
    if(sortBy==="name")    return a.name.localeCompare(b.name);
    if(sortBy==="capital") return (b.capitalDeployed||0)-(a.capitalDeployed||0);
    if(sortBy==="rating")  return (b.rating||0)-(a.rating||0);
    return 0;
  });

  // Group by stage
  const byStage = STAGES.map(stage=>({
    stage, meta:STAGE_META[stage],
    ideas: sortedFiltered.filter(p=>p.stage===stage),
  })).filter(g=>g.ideas.length>0);

  const stageFinancials = STAGES.map(s=>({
    stage:s, meta:STAGE_META[s],
    count:   portfolio.filter(p=>p.stage===s).length,
    activeCount: portfolio.filter(p=>p.stage===s&&!isSunset(p)).length,
    deployed:portfolio.filter(p=>p.stage===s).reduce((t,p)=>t+(p.capitalDeployed||0),0),
    needed:  portfolio.filter(p=>p.stage===s).reduce((t,p)=>t+(p.capitalNeeded||0),0),
  })).filter(s=>s.count>0);

  // Brief description helper — short tagline from valueProposition or description
  const tagline = p => {
    const raw = p.valueProposition || p.description || "";
    if (!raw) return "";
    const first = raw.split(/[.;\n]/)[0].trim();
    return first.slice(0, 50) + (first.length > 50 ? "…" : "");
  };

  return <div>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}>
      <div>
        <div style={{fontSize:26,fontWeight:700,fontFamily:"'DM Serif Display',serif"}}>Portfolio Dashboard</div>
        <div style={{fontSize:13,color:"var(--textMuted)",marginTop:2}}>Trium Limited · {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div>
      </div>
      {onImport&&<ImportButton tab="portfolio" onImport={onImport} label="Refresh Portfolio"/>}
    </div>

    {/* Stat cards */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:10,marginBottom:12}}>
      {[
        ["Total Initiatives",  portfolio.length, active.length+" active",       "var(--text)"],
        ["Active Initiatives", active.length,    (portfolio.length-active.length)+" sunsetted","var(--teal)"],
        ["Ventures",           ventureCount,     "Built & invested",             "var(--accent)"],
        ["Capital Deployed",   fmt(totalDep),    "Lifetime",                     "var(--accent)"],
        ["Capital Pipeline",   fmt(totalNeed),   "Target raise",                 "var(--gold)"],
      ].map(([label,value,sub,color])=>(
        <div key={label} style={{background:"var(--card)",border:"1px solid var(--cardBorder)",borderRadius:10,padding:"11px 13px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--textMuted)",letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:4}}>{label}</div>
          <div style={{fontSize:19,fontWeight:700,color,lineHeight:1.1}}>{value}</div>
          <div style={{fontSize:11,color:"var(--textDim)",marginTop:2}}>{sub}</div>
        </div>
      ))}
    </div>

    {/* Stage distribution — compact */}
    <div style={{...card,marginBottom:12,padding:"10px 14px"}}>
      <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",gap:1,marginBottom:6}}>
        {STAGES.map(s=>{const c=portfolio.filter(p=>p.stage===s).length;const pct=(c/portfolio.length)*100;const m=STAGE_META[s];return pct>0?<div key={s} title={s+": "+c} style={{width:pct+"%",background:m.color}}/>:null;})}
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {stageFinancials.map(({stage,meta,count,deployed})=>(
          <div key={stage} style={{display:"flex",alignItems:"center",gap:4,fontSize:11}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:meta.color,flexShrink:0}}/>
            <span style={{color:"var(--textMuted)"}}>{meta.short}</span>
            <span style={{fontWeight:700,color:"var(--text)"}}>{count}</span>
            {deployed>0&&<span style={{color:"var(--accent)"}}>· {fmt(deployed)}</span>}
          </div>
        ))}
      </div>
    </div>

    {/* Filters */}
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...IS,width:180,resize:"none",padding:"5px 10px",fontSize:12}} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <select value={fStage} onChange={e=>setFStage(e.target.value)} style={{...IS,width:"auto",fontSize:12,cursor:"pointer",resize:"none",padding:"5px 10px"}}>
        <option value="All">All stages</option>
        {STAGES.map(s=><option key={s} value={s}>{STAGE_META[s]?.short||s}</option>)}
      </select>
      <select value={fLead} onChange={e=>setFLead(e.target.value)} style={{...IS,width:"auto",fontSize:12,cursor:"pointer",resize:"none",padding:"5px 10px"}}>
        {leads.map(l=><option key={l} value={l}>{l==="All"?"All leads":l}</option>)}
      </select>
      <select value={fRag} onChange={e=>setFRag(e.target.value)} style={{...IS,width:"auto",fontSize:12,cursor:"pointer",resize:"none",padding:"5px 10px"}}>
        {["All","Green","Amber","Red"].map(r=><option key={r} value={r}>{r==="All"?"All RAG":r}</option>)}
      </select>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...IS,width:"auto",fontSize:12,cursor:"pointer",resize:"none",padding:"5px 10px"}}>
        <option value="default">Default</option><option value="name">Name A–Z</option>
        <option value="capital">Capital ↓</option><option value="rating">Rating ↓</option>
      </select>
      <button onClick={()=>setShowSunset(s=>!s)} style={{...btn(showSunset),fontSize:12,padding:"5px 12px"}}>{showSunset?"Hide sunsetted":"Show sunsetted"}</button>
      {(search||fStage!=="All"||fLead!=="All"||fRag!=="All")&&<button onClick={()=>{setSearch("");setFStage("All");setFLead("All");setFRag("All");}} style={{...btn(false),fontSize:12,padding:"4px 10px",opacity:0.6}}>Clear</button>}
      <span style={{fontSize:12,color:"var(--textMuted)",marginLeft:"auto"}}>{filtered.length} initiatives</span>
    </div>

    {/* Initiatives — one column per stage, all side by side */}
    <div style={{display:"grid",gridTemplateColumns:"repeat("+byStage.length+",minmax(0,1fr))",gap:10,marginBottom:16,alignItems:"start"}}>
      {STAGES.map(stage=>{
        const meta  = STAGE_META[stage];
        const ideas = sortedFiltered.filter(p=>p.stage===stage);
        if (ideas.length===0) return null;
        return <div key={stage}>
          {/* Stage column header */}
          <div style={{background:meta.color,borderRadius:"9px 9px 0 0",padding:"9px 12px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{meta.short}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",marginTop:1}}>
              {ideas.filter(p=>!isSunset(p)).length} active
              {ideas.filter(p=>isSunset(p)).length>0?" · "+ideas.filter(p=>isSunset(p)).length+" sunsetted":""}
            </div>
          </div>
          {/* Initiative rows */}
          <div style={{border:"1px solid var(--cardBorder)",borderTop:"none",borderRadius:"0 0 9px 9px",overflow:"hidden"}}>
            {ideas.map((idea,idx)=>{
              const r      = RAG_META[idea.rag]||RAG_META["Amber"];
              const sunset = isSunset(idea);
              const tag    = tagline(idea);
              return <div key={idea.id}
                onClick={()=>onSelectIdea(idea)}
                style={{padding:"11px 12px",borderBottom:idx<ideas.length-1?"1px solid var(--cardBorder)":"none",
                  cursor:"pointer",opacity:sunset?0.4:1,
                  borderLeft:"3px solid "+meta.color,background:"var(--card)"}}
                onMouseEnter={e=>e.currentTarget.style.background="var(--inputBg)"}
                onMouseLeave={e=>e.currentTarget.style.background="var(--card)"}>
                {/* Name — inline tagline + RAG dot */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,marginBottom:6}}>
                  <div style={{fontSize:12,lineHeight:1.3,flex:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                    <span style={{fontWeight:700,color:"var(--text)"}}>{idea.name}</span>
                    {tag&&<span style={{color:"var(--textMuted)",fontWeight:400}}> — {tag}</span>}
                  </div>
                  <div style={{width:6,height:6,borderRadius:"50%",background:r.dot,flexShrink:0}}/>
                </div>
                {/* Phase + lead tags */}
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
                  {idea.phase&&<span style={{fontSize:9,fontWeight:600,background:"var(--inputBg)",color:"var(--textMuted)",padding:"1px 7px",borderRadius:20}}>{idea.phase}</span>}
                  {sunset&&<span style={{fontSize:9,fontWeight:700,background:"#F1EFE8",color:"#888780",padding:"1px 7px",borderRadius:20}}>Sunsetted</span>}
                  {idea.lead&&<span style={{fontSize:9,color:"var(--textMuted)"}}>Lead: {idea.lead}</span>}
                  {idea.capitalDeployed>0&&<span style={{fontSize:9,fontWeight:700,color:"var(--accent)",marginLeft:"auto"}}>{fmt(idea.capitalDeployed)}</span>}
                </div>
                {/* Update + Next update */}
                {idea.milestones&&<div style={{fontSize:11,color:"var(--textMuted)",marginBottom:4,lineHeight:1.4}}>
                  <span style={{fontWeight:600,color:"var(--text)"}}>Update: </span>{idea.milestones.slice(0,90)}{idea.milestones.length>90?"…":""}
                </div>}
                {idea.nextStep&&<div style={{fontSize:11,color:"var(--accent)",lineHeight:1.4}}>
                  <span style={{fontWeight:600}}>Next update: </span>{idea.nextStep.slice(0,75)}{idea.nextStep.length>75?"…":""}
                </div>}
              </div>;
            })}
          </div>
        </div>;
      })}
    </div>


    {/* Financial summary — BELOW initiatives */}
    <div style={{...card,padding:"11px 14px"}}>
      <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Financial summary by stage</div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{borderBottom:"1px solid var(--cardBorder)"}}>
          {["Stage","Total","Active","Deployed","Needed","Gap"].map(h=>(
            <th key={h} style={{padding:"5px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--textMuted)",textTransform:"uppercase",letterSpacing:"0.4px"}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {stageFinancials.map(({stage,meta,count,activeCount,deployed,needed})=>(
            <tr key={stage} style={{borderBottom:"1px solid var(--cardBorder)"}}>
              <td style={{padding:"6px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:"50%",background:meta.color}}/><span style={{fontWeight:600}}>{meta.short}</span></div></td>
              <td style={{padding:"6px 10px",fontWeight:700}}>{count}</td>
              <td style={{padding:"6px 10px",color:"var(--teal)"}}>{activeCount}</td>
              <td style={{padding:"6px 10px",color:"var(--accent)",fontWeight:600}}>{deployed>0?fmt(deployed):"—"}</td>
              <td style={{padding:"6px 10px",color:"var(--gold)",fontWeight:600}}>{needed>0?fmt(needed):"—"}</td>
              <td style={{padding:"6px 10px",color:"var(--textMuted)"}}>{needed>deployed&&needed>0?fmt(needed-deployed):"—"}</td>
            </tr>
          ))}
          <tr style={{borderTop:"2px solid var(--cardBorder)",fontWeight:700}}>
            <td style={{padding:"7px 10px"}}>Total</td>
            <td style={{padding:"7px 10px"}}>{portfolio.length}</td>
            <td style={{padding:"7px 10px",color:"var(--teal)"}}>{active.length}</td>
            <td style={{padding:"7px 10px",color:"var(--accent)"}}>{fmt(totalDep)}</td>
            <td style={{padding:"7px 10px",color:"var(--gold)"}}>{fmt(totalNeed)}</td>
            <td style={{padding:"7px 10px",color:"var(--textMuted)"}}>{totalNeed>totalDep?fmt(totalNeed-totalDep):"—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>;
}


// ── PER-TAB IMPORT BUTTON ─────────────────────────────────────────────────────
function ImportButton({ tab, onImport, label }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const doImport = async () => {
    setLoading(true); setStatus("");
    try {
      const res = await fetch(`/api/state?tab=${tab}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      onImport(data);
      const count = data.portfolio?.length || data.bank?.length || data.services?.length || 0;
      setStatus(`✓ ${count} items loaded`);
      setTimeout(() => setStatus(""), 3000);
    } catch(e) { setStatus("✕ " + e.message); }
    setLoading(false);
  };
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <button onClick={doImport} disabled={loading}
        style={{...btn(false),fontSize:12,padding:"6px 14px",color:"var(--accent)",border:"1px solid var(--accent)40"}}>
        {loading ? "Loading…" : `↻ ${label || "Refresh from Sheet"}`}
      </button>
      {status && <span style={{fontSize:12,color:status.startsWith("✓")?"var(--teal)":"var(--red)"}}>{status}</span>}
    </div>
  );
}

// ── BANK VIEW ────────────────────────────────────────────────────────────────
function BankView({bank,isAdmin,onMoveToDashboard,onImport}) {
  const [search,setSearch]=useState("");
  const [fSector,setFSector]=useState("All");
  const [expanded,setExpanded]=useState(null);
  const sectors=["All",...new Set(bank.map(p=>(p.sector||"").split("/")[0].trim()).filter(Boolean))];
  const filtered=bank.filter(p=>{
    const q=search.toLowerCase();
    return (!q||p.name.toLowerCase().includes(q)||(p.description||"").toLowerCase().includes(q)||(p.sector||"").toLowerCase().includes(q))
      &&(fSector==="All"||(p.sector||"").includes(fSector));
  });
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:12}}>
      <div>
        <div style={{fontSize:26,fontWeight:700,fontFamily:"'DM Serif Display',serif"}}>Idea Bank</div>
        <div style={{fontSize:13,color:"var(--textMuted)",marginTop:3}}>{bank.length} ideas in reserve — loaded from Bank tab in Google Sheets</div>
      </div>
      <ImportButton tab="bank" onImport={d=>{if(d.bank)onImport(d.bank);}} label="Refresh Bank"/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      <input style={{...IS,width:220,resize:"none"}} placeholder="Search ideas…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <select value={fSector} onChange={e=>setFSector(e.target.value)} style={{...IS,width:"auto",cursor:"pointer",resize:"none"}}>
        {sectors.map(o=><option key={o} value={o}>{o==="All"?"All sectors":o}</option>)}
      </select>
      <span style={{fontSize:12,color:"var(--textMuted)",alignSelf:"center",marginLeft:"auto"}}>{filtered.length} results</span>
    </div>
    <div style={{display:"grid",gap:12}}>
      {filtered.map(b=>{
        const isExp=expanded===b.id;
        return <div key={b.id} style={{...card,borderLeft:"3px solid var(--purple)",cursor:"pointer"}} onClick={()=>setExpanded(isExp?null:b.id)}>
          {/* Header row */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span style={{fontWeight:700,fontSize:15}}>{b.name}</span>
                {b.phase&&<span style={{fontSize:10,fontWeight:600,background:"var(--inputBg)",color:"var(--textMuted)",padding:"1px 8px",borderRadius:20}}>{b.phase}</span>}
              </div>
              <div style={{fontSize:12,color:"var(--textMuted)"}}>{b.sector}</div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {b.origination&&<span style={{fontSize:11,color:"var(--textMuted)",background:"var(--inputBg)",padding:"2px 9px",borderRadius:20}}>{b.origination}</span>}
              <span style={{fontSize:11,color:"var(--textMuted)"}}>{isExp?"▲":"▼"}</span>
            </div>
          </div>
          {/* Always visible — tagline */}
          <div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.5,marginBottom:isExp?10:0}}>
            {(b.valueProposition||b.description||"").slice(0,120)}{(b.valueProposition||b.description||"").length>120?"…":""}
          </div>
          {/* Expanded full details */}
          {isExp&&<div style={{borderTop:"1px solid var(--cardBorder)",paddingTop:14,marginTop:8}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:12}}>
              {[["Lead",b.lead],["Inception Year",b.inceptionYear],["Rating",b.rating?b.rating+"/5":"—"],
                ["Capital Needed",b.capitalNeeded?fmt(b.capitalNeeded):"—"],["Capital Source",b.capitalSource],
                ["Origination",b.origination]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l}><div style={lbl}>{l}</div><div style={{fontSize:13}}>{v}</div></div>
              ))}
            </div>
            {b.description&&<div style={{marginBottom:10}}><div style={lbl}>Problem Statement</div><div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.6}}>{b.description}</div></div>}
            {b.valueProposition&&<div style={{marginBottom:10}}><div style={lbl}>Value Proposition</div><div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.6}}>{b.valueProposition}</div></div>}
            {b.targetCustomer&&<div style={{marginBottom:10}}><div style={lbl}>Target Customer</div><div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.6}}>{b.targetCustomer}</div></div>}
            {b.expectedRevenue&&<div style={{marginBottom:10}}><div style={lbl}>Expected Path to Value</div><div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.6}}>{b.expectedRevenue}</div></div>}
            {b.strategicPartnerDependency&&<div style={{marginBottom:10}}><div style={lbl}>Strategic Partner Dependency</div><div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.6}}>{b.strategicPartnerDependency}</div></div>}
            {b.regulatoryFlag&&<div style={{marginBottom:10,padding:"8px 12px",background:"var(--goldBg)",borderRadius:7}}><div style={{...lbl,color:"var(--gold)"}}>Regulatory / Compliance Flag</div><div style={{fontSize:13,color:"var(--gold)"}}>{b.regulatoryFlag}</div></div>}
            {(b.milestones||b.nextStep)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:12}}>
              {b.milestones&&<div><div style={lbl}>Milestones</div><div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.5}}>{b.milestones}</div></div>}
              {b.nextStep&&<div><div style={{...lbl,color:"var(--accent)"}}>Next Step</div><div style={{fontSize:13,color:"var(--accent)",lineHeight:1.5}}>{b.nextStep}</div></div>}
            </div>}
            {isAdmin&&<button onClick={e=>{e.stopPropagation();onMoveToDashboard(b);}}
              style={{...btn(true),fontSize:13,padding:"7px 18px",marginTop:6}}>
              Move to Portfolio →
            </button>}
          </div>}
        </div>;
      })}
      {filtered.length===0&&<div style={{fontSize:14,color:"var(--textMuted)",padding:"20px 0",textAlign:"center"}}>No ideas match your filters</div>}
    </div>
  </div>;
}


// ── INITIATIVE PROFILE ────────────────────────────────────────────────────────
function InitiativeProfile({idea,dark,isAdmin,onBack,onUpdate,onHide,onMoveToBank,auditLog}) {
  const [promoting,setPromoting]=useState(false);
  const [demoting,setDemoting]=useState(false);
  const [confirmRemove,setConfirmRemove]=useState(false);
  const [sending,setSending]=useState(false);
  const [sendStatus,setSendStatus]=useState({err:"",ok:""});
  const m=STAGE_META[idea.stage]||STAGE_META["Sunsetted"];
  const idx=STAGES.indexOf(idea.stage);
  const nextStage=idx>=0&&idx<STAGES.length-1?STAGES[idx+1]:null;
  const prevStage=idx>0?STAGES[idx-1]:null;
  const ideaAudit=auditLog.filter(e=>e.ideaId===idea.id).slice(-5).reverse();

  const upd=(field)=>(val)=>onUpdate(idea.id,{[field]:val},field,idea[field],val);

  const sendToTriumAssess=async()=>{
    setSending(true);setSendStatus({err:"",ok:""});
    try{
      const res=await fetch("/api/sheets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idea})});
      const data=await res.json();
      if (!res.ok) throw new Error(data.error||"Failed");
      onUpdate(idea.id,{assessmentStatus:"awaiting"},"assessmentStatus",idea.assessmentStatus,"awaiting");
      setSendStatus({err:"",ok:"✓ Sent to TriumAssess — assessors will see it in the dropdown."});
    }catch(e){setSendStatus({err:"Failed: "+e.message,ok:""});}
    setSending(false);
  };

  return <div>
    <button onClick={onBack} style={{...btn(false),marginBottom:20,fontSize:13}}>← Back to repository</button>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}>
      <div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
          <StageBadge stage={idea.stage} dark={dark}/>
          <span style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,border:`1px solid ${idea.phase==="Live"?"var(--teal)":"var(--gold)"}`,color:idea.phase==="Live"?"var(--teal)":"var(--gold)"}}>{idea.phase||"—"}</span>
          <AssessmentBadge status={idea.assessmentStatus} score={idea.assessmentScore}/>
          {idea.source==="external"&&<span style={{background:"var(--purpleBg)",color:"var(--purple)",fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20}}>External idea</span>}
        </div>
        <div style={{fontSize:22,fontWeight:700,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>{idea.fullName||idea.name}</div>
        <div style={{fontSize:14,color:"var(--textMuted)"}}>{idea.sector} · {idea.origination} · Est. {idea.inceptionYear}</div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {isAdmin&&nextStage&&<button onClick={()=>setPromoting(true)} style={{...btn(true),fontSize:14}}>Promote to {STAGE_META[nextStage]?.short} →</button>}
          {isAdmin&&prevStage&&<button onClick={()=>setDemoting(true)} style={{...btn(false),fontSize:13}}>← Demote to {STAGE_META[prevStage]?.short}</button>}
          {isAdmin&&onMoveToBank&&<button onClick={()=>onMoveToBank(idea)} style={{...btn(false),fontSize:13,color:"var(--purple)",border:"1px solid var(--purple)40"}}>Move to Bank</button>}
          {isAdmin&&<button onClick={()=>setConfirmRemove(true)} style={{...btn(false,true),fontSize:13}}>Remove</button>}
        {isAdmin&&idea.assessmentStatus!=="awaiting"&&<button onClick={sendToTriumAssess} disabled={sending} style={{...btn(false),fontSize:13,color:"var(--teal)",border:"1px solid var(--teal)40"}}>{sending?"Sending…":"Send to TriumAssess ↗"}</button>}
      </div>
    </div>

    {promoting&&<div style={{...card,marginBottom:18,background:dark?m.darkBg:m.lightBg,border:`1px solid ${m.color}40`}}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>Promote {idea.name} to {nextStage}?</div>
      <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:12}}>Ensure all phase gate requirements are met before promoting.</div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>{upd("stage")(nextStage);setPromoting(false);}} style={{...btn(true),fontSize:14}}>Confirm</button>
        <button onClick={()=>setPromoting(false)} style={{...btn(false),fontSize:14}}>Cancel</button>
      </div>
    </div>}
    {demoting&&prevStage&&<div style={{...card,marginBottom:18,background:"var(--goldBg)",border:"1px solid var(--gold)40"}}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:6,color:"var(--gold)"}}>Demote {idea.name} to {STAGE_META[prevStage]?.short}?</div>
      <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:12}}>This moves the initiative back one stage. Confirm this is intentional.</div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>{upd("stage")(prevStage);setDemoting(false);}} style={{...btn(false),fontSize:14,color:"var(--gold)",border:"1px solid var(--gold)"}}>Confirm Demote</button>
        <button onClick={()=>setDemoting(false)} style={{...btn(false),fontSize:14}}>Cancel</button>
      </div>
    </div>}
    {confirmRemove&&<div style={{...card,marginBottom:18,background:"var(--redBg)",border:"1px solid var(--red)40"}}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:6,color:"var(--red)"}}>Remove {idea.name} from Vanta?</div>
      <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:12}}>This hides the initiative from Vanta. The row in Google Sheets is preserved.</div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>{onHide&&onHide(idea);setConfirmRemove(false);}} style={{...btn(false,true),fontSize:14}}>Yes, remove</button>
        <button onClick={()=>setConfirmRemove(false)} style={{...btn(false),fontSize:14}}>Cancel</button>
      </div>
    </div>}

    {sendStatus.ok&&<div style={{fontSize:13,color:"var(--teal)",background:"var(--tealBg)",padding:"10px 14px",borderRadius:8,marginBottom:14}}>{sendStatus.ok}</div>}
    {sendStatus.err&&<div style={{fontSize:13,color:"var(--red)",background:"var(--redBg)",padding:"10px 14px",borderRadius:8,marginBottom:14}}>{sendStatus.err}</div>}

    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={card}>
          <div style={{fontWeight:700,marginBottom:16,fontSize:16}}>Core Details</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {[["lead","Lead"],["origination","Origination"],["inceptionYear","Inception Year"],["sector","Sector"],["targetCustomer","Target Customer"],["expectedRevenue","Expected Revenue"]].map(([f,l])=>(
              <div key={f}><span style={lbl}>{l}</span><EditableCell value={idea[f]||""} onChange={upd(f)} isAdmin={isAdmin}/></div>
            ))}
          </div>
        </div>
        <div style={card}>
          <div style={{fontWeight:700,marginBottom:12,fontSize:16}}>Description</div>
          <div style={{fontSize:14,color:"var(--textMuted)",lineHeight:1.7}}>{idea.description||"—"}</div>
        </div>
        <div style={card}>
          <div style={{fontWeight:700,marginBottom:14,fontSize:16}}>Progress & Next Steps</div>
          <div style={{marginBottom:14}}><span style={lbl}>Current Milestones</span><EditableCell value={idea.milestones||""} onChange={upd("milestones")} isAdmin={isAdmin}/></div>
          <span style={lbl}>Next Step</span><EditableCell value={idea.nextStep||""} onChange={upd("nextStep")} isAdmin={isAdmin}/>
        </div>
        {ideaAudit.length>0&&<div style={card}>
          <div style={{fontWeight:700,marginBottom:12,fontSize:16}}>Audit Trail</div>
          {ideaAudit.map((e,i)=><div key={i} style={{fontSize:12,color:"var(--textMuted)",padding:"5px 0",borderBottom:"1px solid var(--cardBorder)"}}>
            <span style={{fontWeight:600,color:"var(--text)"}}>{e.field}</span> changed to "<span style={{color:"var(--accent)"}}>{e.newVal.slice(0,40)}</span>" · {e.timestamp}
          </div>)}
        </div>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={card}>
          <div style={{fontWeight:700,marginBottom:14,fontSize:16}}>Financials</div>
          <div style={{marginBottom:12}}><span style={lbl}>Capital Deployed (₦)</span><EditableCell value={idea.capitalDeployed>0?String(idea.capitalDeployed):""} onChange={v=>upd("capitalDeployed")(parseFloat(v)||0)} type="number" isAdmin={isAdmin}/></div>
          <div style={{marginBottom:12}}><span style={lbl}>Monthly Burn (₦)</span><EditableCell value={idea.burnRate?String(idea.burnRate):""} onChange={v=>upd("burnRate")(parseFloat(v)||null)} type="number" isAdmin={isAdmin}/></div>
          <div><span style={lbl}>Revenue MTD (₦000)</span><EditableCell value={idea.revenueMTD?String(idea.revenueMTD):""} onChange={v=>upd("revenueMTD")(parseFloat(v)||null)} type="number" isAdmin={isAdmin}/></div>
          {idea.burnRate>0&&idea.capitalDeployed>0&&<div style={{marginTop:10,padding:"8px 11px",background:"var(--accentBg)",borderRadius:7,fontSize:13,color:"var(--accent)"}}>Runway: ~{Math.round(idea.capitalDeployed/idea.burnRate)} months at current burn</div>}
        </div>
        <div style={card}>
          <div style={{fontWeight:700,marginBottom:14,fontSize:16}}>Status</div>
          <div style={{marginBottom:12}}><span style={lbl}>RAG Status</span><EditableCell value={idea.rag||"Amber"} onChange={upd("rag")} options={["Green","Amber","Red"]} isAdmin={isAdmin}/></div>
          <div style={{marginBottom:12}}><span style={lbl}>RAG Driver</span><EditableCell value={idea.ragDriver||""} onChange={upd("ragDriver")} options={["Product","Tech","GTM","People","Legal/Regulatory","Other"]} isAdmin={isAdmin}/></div>
          <div style={{marginBottom:12}}><span style={lbl}>Phase</span><EditableCell value={idea.phase||""} onChange={upd("phase")} options={["IC","In-development","Live","Sunsetted","Reserved","Awaiting Review"]} isAdmin={isAdmin}/></div>
          <div>
            <span style={lbl}>Internal Rating</span>
            {isAdmin?<div style={{display:"flex",gap:8,marginTop:4}}>
              {[1,2,3,4,5].map(i=><div key={i} onClick={()=>upd("rating")(i)} style={{width:30,height:30,borderRadius:"50%",background:i<=(idea.rating||0)?"var(--gold)":"var(--inputBg)",border:`1px solid ${i<=(idea.rating||0)?"var(--gold)":"var(--cardBorder)"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:i<=(idea.rating||0)?"#fff":"var(--textMuted)",fontWeight:600}}>{i}</div>)}
            </div>:<RatingDots rating={idea.rating}/>}
          </div>
        </div>
        <div style={card}>
          <div style={{fontWeight:700,marginBottom:12,fontSize:16}}>Assessment</div>
          <div style={{marginBottom:10}}><span style={lbl}>Assessment Status</span>
            {isAdmin?<EditableCell value={idea.assessmentStatus||"not_assessed"} onChange={upd("assessmentStatus")} options={["not_assessed","awaiting","assessed"]} isAdmin={isAdmin}/>:<AssessmentBadge status={idea.assessmentStatus} score={idea.assessmentScore}/>}
          </div>
          <div style={{marginBottom:12}}><span style={lbl}>Assessment Score</span>
            {isAdmin?<EditableCell value={idea.assessmentScore?String(idea.assessmentScore):""} onChange={v=>upd("assessmentScore")(v?parseFloat(v):null)} type="number" isAdmin={isAdmin}/>:<span style={{fontSize:14}}>{idea.assessmentScore||"—"}</span>}
          </div>
          <a href={TRIASSESS_URL} target="_blank" rel="noreferrer" style={{display:"block",padding:"9px 12px",background:"var(--accentBg)",borderRadius:8,fontSize:13,color:"var(--accent)",fontWeight:600,textAlign:"center"}}>Open TriumAssess ↗</a>
        </div>
      </div>
    </div>
  </div>;
}

// ── INTAKE ────────────────────────────────────────────────────────────────────
function Intake({onAdd}) {
  const [mode,setMode]=useState("text");
  const [text,setText]=useState("");
  const [file,setFile]=useState(null);
  const [extracting,setExtracting]=useState(false);
  const [extracted,setExtracted]=useState(null);
  const [err,setErr]=useState("");
  const [saved,setSaved]=useState(false);
  const [sending,setSending]=useState(false);
  const [sendOk,setSendOk]=useState("");
  const fileRef=useRef();

  const SOURCES=["Trium internal","Access Holdings","Coronation Group","OSAPT","External submission","Ecosystem referral","Other"];
  const PROMPT=(content)=>`Extract structured information from this business idea. Reply ONLY with JSON:
{"name":"<short codename>","fullName":"<full idea name>","problem":"<core problem>","solution":"<proposed solution>","sector":"<industry>","targetCustomer":"<target customers>","goToMarket":"<go-to-market>","monetization":"<revenue model>","similarSolutions":"<competitors>","description":"<1-2 sentence problem statement>"}
Content:\n${content.slice(0,4000)}`;

  const doExtract=async(content)=>{
    setExtracting(true);setErr("");setExtracted(null);setSaved(false);setSendOk("");
    try{ setExtracted(parseJSON(await callClaude(PROMPT(content)))); }
    catch(e){setErr("Extraction failed: "+e.message);}
    setExtracting(false);
  };
  const setEF=k=>e=>setExtracted(ex=>({...ex,[k]:e.target.value}));

  const saveIdea=(sendNow)=>async()=>{
    const idea={
      id:"ext_"+Date.now(), name:extracted.name||"Unnamed", fullName:extracted.fullName||extracted.name,
      origination:extracted.source||"External", inceptionYear:new Date().getFullYear(),
      lead:"—", stage:"Idea", phase:"Awaiting Review", rating:null, capitalDeployed:0,
      sector:extracted.sector||"", description:extracted.problem||"",
      targetCustomer:extracted.targetCustomer||"", expectedRevenue:extracted.monetization||"",
      solution:extracted.solution||"", similarSolutions:extracted.similarSolutions||"",
      goToMarket:extracted.goToMarket||"", additionalContext:extracted.additionalContext||"",
      milestones:"Uploaded via Idea Intake", nextStep:"Review and assess in TriumAssess",
      source:"external", rag:"Amber", burnRate:null, runway:null, revenueMTD:null,
      assessmentStatus: sendNow?"awaiting":"not_assessed", assessmentScore:null,
    };
    onAdd(idea);
    setSending(true);
    try{
      // Always write to Bank tab in Vanta Google Sheet
      await fetch("/api/state",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"addToBank",item:idea})});
      if (sendNow) {
        const res=await fetch("/api/sheets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idea,target:"bank"})});
        const data=await res.json();
        if (!res.ok) throw new Error(data.error||"Failed");
        setSendOk("✓ Idea saved to Bank tab in Google Sheets and sent to TriumAssess for assessment.");
      } else {
        setSendOk("✓ Idea saved to Bank tab in Google Sheets.");
      }
    }catch(e){setSendOk("Added locally, but sheet sync failed: "+e.message);}
    setSending(false);
    setSaved(true);setExtracted(null);setText("");setFile(null);
  };

  return <div>
    <div style={{fontSize:26,fontWeight:700,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>Idea Intake</div>
    <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:20}}>Upload an external idea via text or document — AI extracts and structures it, then auto-enters the pipeline at Idea stage</div>

    {saved&&<div style={{...card,marginBottom:18,background:"var(--tealBg)",border:"1px solid var(--teal)40"}}>
      <div style={{fontWeight:700,color:"var(--teal)",marginBottom:4,fontSize:15}}>✓ Idea added to pipeline</div>
      <div style={{fontSize:14,color:"var(--textMuted)"}}>{sendOk||"Idea is now in the Repository at Idea stage."}</div>
    </div>}

    <div style={{display:"inline-flex",gap:4,background:"var(--inputBg)",borderRadius:10,padding:4,marginBottom:22,border:"1px solid var(--cardBorder)"}}>
      {[["text","✏ Enter text"],["file","📎 Upload file"]].map(([id,lbl])=>(
        <button key={id} onClick={()=>{setMode(id);setExtracted(null);setErr("");setSaved(false);setSendOk("");}}
          style={{...btn(mode===id),padding:"8px 22px",borderRadius:8,fontSize:14,border:"none"}}>{lbl}</button>
      ))}
    </div>

    {mode==="text"&&<div style={{...card,marginBottom:16}}>
      <span style={lbl}>Paste idea content — pitch text, problem statement, any document</span>
      <textarea value={text} onChange={e=>setText(e.target.value)} style={{...IS,minHeight:180,lineHeight:1.7,marginBottom:14}} placeholder="Paste the full content here. Include problem, solution, target market, revenue model, and competition. More context = better extraction."/>
      <button onClick={()=>doExtract(text)} disabled={extracting||!text.trim()} style={{...btn(true),fontSize:14}}>{extracting?"Extracting…":"Extract & structure →"}</button>
    </div>}

    {mode==="file"&&<div style={{...card,marginBottom:16,borderStyle:"dashed",textAlign:"center",padding:"36px 20px",cursor:"pointer"}} onClick={()=>fileRef.current?.click()}>
      <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>{file?file.name:"Click to upload a document"}</div>
      <div style={{fontSize:13,color:"var(--textMuted)",marginBottom:14}}>PDF, Word (.docx), PowerPoint, or plain text</div>
      {file&&<button onClick={async e=>{
          e.stopPropagation();
          // Read file as text — for PDF send as base64 to Claude
          const isPDF = file.type==="application/pdf"||file.name.endsWith(".pdf");
          if (isPDF) {
            const ab = await file.arrayBuffer();
            const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
            setExtracting(true);setErr("");setExtracted(null);setSaved(false);setSendOk("");
            try {
              const res = await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},
                body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,messages:[{role:"user",content:[
                  {type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},
                  {type:"text",text:`Extract structured information from this document. Reply ONLY with JSON:
{"name":"<short codename>","fullName":"<full idea name>","problem":"<core problem>","solution":"<proposed solution>","sector":"<industry>","targetCustomer":"<target customers>","goToMarket":"<go-to-market>","monetization":"<revenue model>","similarSolutions":"<competitors>","description":"<1-2 sentence problem statement>"}`}
                ]}]})});
              const data = await res.json();
              if (data.error) throw new Error(data.error.message);
              setExtracted(parseJSON(data.content?.map(b=>b.text||"").join("")||""));
            } catch(e){setErr("PDF extraction failed: "+e.message);}
            setExtracting(false);
          } else {
            const t = await file.text(); doExtract(t);
          }
        }} disabled={extracting} style={{...btn(true),fontSize:14}}>{extracting?"Extracting…":"Extract & structure →"}</button>}
      <input ref={fileRef} type="file" accept=".txt,.pdf,.docx,.pptx" style={{display:"none"}} onChange={e=>{setFile(e.target.files?.[0]);setErr("");}}/>
    </div>}

    {err&&<div style={{fontSize:14,color:"var(--red)",padding:"10px 14px",background:"var(--redBg)",borderRadius:8,marginBottom:14}}>{err}</div>}

    {extracted&&<div style={card}>
      <div style={{fontWeight:700,marginBottom:4,fontSize:16}}>Review extracted fields</div>
      <div style={{fontSize:13,color:"var(--textMuted)",marginBottom:18}}>Edit any field before adding to the pipeline.</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        {[["name","Short name / codename"],["fullName","Full idea name"],["sector","Sector"],["targetCustomer","Target customers"]].map(([k,l])=>(
          <div key={k}><label style={lbl}>{l}</label><input style={{...IS,resize:"none"}} value={extracted[k]||""} onChange={setEF(k)}/></div>
        ))}
      </div>
      <div style={{marginBottom:14}}>
        <label style={lbl}>Source / Origination</label>
        <select value={extracted.source||"External submission"} onChange={setEF("source")} style={{...IS,resize:"none",cursor:"pointer"}}>
          {SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {[["problem","Problem statement"],["solution","Proposed solution"],["monetization","Revenue / monetization model"],["similarSolutions","Similar / existing solutions"],["goToMarket","Go-to-market strategy"],["additionalContext","Additional context or notes"]].map(([k,l])=>(
        <div key={k} style={{marginBottom:12}}><label style={lbl}>{l}</label><textarea style={{...IS,minHeight:60}} value={extracted[k]||""} onChange={setEF(k)}/></div>
      ))}
      <div style={{display:"flex",gap:12,marginTop:14,flexWrap:"wrap"}}>
        <button onClick={saveIdea(false)} style={{...btn(false),fontSize:14}}>Add to pipeline only →</button>
        <button onClick={saveIdea(true)} disabled={sending} style={{...btn(true),fontSize:14}}>{sending?"Sending…":"Add to pipeline + Send to TriumAssess →"}</button>
      </div>
      <div style={{fontSize:12,color:"var(--textMuted)",marginTop:8}}>"Send to TriumAssess" writes the idea to the TriumAssess Google Sheet — assessors will see it in their dropdown immediately.</div>
    </div>}
  </div>;
}

// ── FINANCIAL SUMMARY ─────────────────────────────────────────────────────────
function FinancialSummary({portfolio,isAdmin,onUpdate}) {
  const totalDep=portfolio.reduce((s,p)=>s+(p.capitalDeployed||0),0);
  const totalRev=portfolio.reduce((s,p)=>s+(p.revenueMTD||0),0);
  return <div>
    <div style={{fontSize:26,fontWeight:700,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>Financial Summary</div>
    <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:20}}>Capital deployment, burn rates, and revenue tracking</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:20}}>
      <StatCard label="Total Capital Deployed" value={fmt(totalDep)} color="var(--accent)"/>
      <StatCard label="Revenue MTD" value={totalRev>0?fmt(totalRev*1000):"—"} color="var(--teal)"/>
      <StatCard label="Active Initiatives" value={portfolio.filter(p=>p.phase?.toLowerCase()!=="sunsetted").length}/>
    </div>
    <div style={{...card,padding:0,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr style={{borderBottom:"1px solid var(--cardBorder)"}}>
          {["Initiative","Stage","Capital Deployed","Monthly Burn","Runway","Revenue MTD","RAG"].map(h=><th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--textMuted)",letterSpacing:"0.4px",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>)}
        </tr></thead>
        <tbody>{portfolio.filter(p=>p.phase?.toLowerCase()!=="sunsetted").map(p=>{
          const runway=p.burnRate>0&&p.capitalDeployed>0?Math.round(p.capitalDeployed/p.burnRate):null;
          return <tr key={p.id} style={{borderBottom:"1px solid var(--cardBorder)"}}>
            <td style={{padding:"12px 16px",fontWeight:700,fontSize:14}}>{p.name}</td>
            <td style={{padding:"12px 16px"}}><StageBadge stage={p.stage} dark={false}/></td>
            <td style={{padding:"12px 16px",color:p.capitalDeployed>0?"var(--accent)":"var(--textDim)",fontWeight:p.capitalDeployed>0?700:400}}>{p.capitalDeployed>0?fmt(p.capitalDeployed):"—"}</td>
            <td style={{padding:"12px 16px",color:"var(--textMuted)"}}>{p.burnRate>0?fmt(p.burnRate):"N/A"}</td>
            <td style={{padding:"12px 16px",color:runway!==null&&runway<3?"var(--red)":runway!==null&&runway<6?"var(--gold)":"var(--textMuted)"}}>{runway!==null?`${runway}mo`:"N/A"}</td>
            <td style={{padding:"12px 16px",color:"var(--textMuted)"}}>{p.revenueMTD>0?`₦${p.revenueMTD}k`:"N/A"}</td>
            <td style={{padding:"12px 16px"}}><RagBadge rag={p.rag} dark={false}/></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}

// ── RISK RADAR ────────────────────────────────────────────────────────────────
function RiskRadar({portfolio,decisions,actions}) {
  const flags=[];
  portfolio.forEach(p=>{
    if (p.rag==="Red") flags.push({name:p.name,type:"Red RAG",sev:"critical",detail:"Marked Red — requires immediate attention"});
    if (p.daysInStage>180) flags.push({name:p.name,type:"Stalled",sev:"high",detail:`${p.daysInStage} days in ${STAGE_META[p.stage]?.short||p.stage} with no movement`});
    if (p.capitalDeployed>0&&p.burnRate>0&&(p.capitalDeployed/p.burnRate)<3) flags.push({name:p.name,type:"Low runway",sev:"critical",detail:`Only ~${Math.round(p.capitalDeployed/p.burnRate)} months runway remaining`});
    if (p.stage!=="Sunsetted"&&(!p.lead||p.lead==="—")) flags.push({name:p.name,type:"No lead",sev:"medium",detail:"No lead assigned — accountability gap"});
  });
  actions.forEach(a=>{ if (isOverdue(a.dueDate)&&a.status!=="Closed") flags.push({name:a.venture,type:"Overdue action",sev:"high",detail:`"${a.action.slice(0,55)}…" — overdue`}); });
  decisions.forEach(d=>{ if (isOverdue(d.deadline)&&d.status==="Pending") flags.push({name:d.venture,type:"Overdue decision",sev:"critical",detail:`"${d.decision}" — overdue`}); });
  const sevColor={critical:"var(--red)",high:"var(--gold)",medium:"var(--accent)"};
  const sevBg={critical:"var(--redBg)",high:"var(--goldBg)",medium:"var(--accentBg)"};
  const sorted=[...flags].sort((a,b)=>["critical","high","medium"].indexOf(a.sev)-["critical","high","medium"].indexOf(b.sev));
  return <div>
    <div style={{fontSize:26,fontWeight:700,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>Risk Radar</div>
    <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:20}}>All portfolio risk flags in one place — updated in real time</div>
    {sorted.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:"var(--textMuted)",fontSize:15}}><div style={{fontSize:20,marginBottom:8}}>✓ No risk flags</div>Portfolio looks healthy across all monitored dimensions.</div>}
    <div style={{display:"grid",gap:10}}>
      {sorted.map((f,i)=><div key={i} style={{...cardSm,borderLeft:`3px solid ${sevColor[f.sev]}`,display:"flex",alignItems:"flex-start",gap:14}}>
        <div style={{background:sevBg[f.sev],color:sevColor[f.sev],fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,flexShrink:0,textTransform:"uppercase",letterSpacing:"0.3px"}}>{f.sev}</div>
        <div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
            <span style={{fontWeight:700,fontSize:14}}>{f.name}</span>
            <span style={{fontSize:12,color:"var(--textMuted)",background:"var(--inputBg)",padding:"1px 8px",borderRadius:20}}>{f.type}</span>
          </div>
          <div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.5}}>{f.detail}</div>
        </div>
      </div>)}
    </div>
  </div>;
}

// ── MONTHLY REPORT ────────────────────────────────────────────────────────────
function MonthlyReport({portfolio,decisions,actions}) {
  const [report,setReport]=useState("");const [loading,setLoading]=useState(false);const [err,setErr]=useState("");
  const generate=async()=>{
    setLoading(true);setErr("");
    try{
      const active=portfolio.filter(p=>p.phase?.toLowerCase()!=="sunsetted");
      const totalDep=portfolio.reduce((s,p)=>s+(p.capitalDeployed||0),0);
      const summary=portfolio.map(p=>`${p.name} | ${p.stage} | ${p.rag} | Lead:${p.lead||"—"} | Deployed:${fmt(p.capitalDeployed)} | ${p.milestones?.slice(0,80)||""}`).join("\n");
      const text=await callClaude(`You are writing the monthly portfolio review for Trium Limited, a Nigerian venture builder. Write a professional MPR narrative for ${new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})}.

Data: Active initiatives: ${active.length}. Total capital deployed: ${fmt(totalDep)}.
Portfolio:\n${summary}
Pending decisions: ${decisions.map(d=>`${d.venture}: ${d.decision} (${d.status})`).join("; ")}
Open actions: ${actions.filter(a=>a.status!=="Closed").slice(0,5).map(a=>`${a.venture}: ${a.action.slice(0,60)}`).join("; ")}

Structure: 1. Portfolio Health Summary  2. Stage Movements & Progress  3. Capital Deployment Status  4. Key Decisions Required  5. Risks & Items Requiring Attention  6. Recommended Actions

Write in formal professional English. Be specific about initiative names. 3-4 sentences per section.`,2048);
      setReport(text);
    }catch(e){setErr("Could not generate: "+e.message);}
    setLoading(false);
  };
  const download=()=>{ const blob=new Blob([report],{type:"text/plain"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`Trium_Portfolio_Report_${new Date().toISOString().slice(0,7)}.txt`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},1000); };
  return <div>
    <div style={{fontSize:26,fontWeight:700,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>Monthly Portfolio Report</div>
    <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:20}}>AI-generated narrative based on your current portfolio data</div>
    <div style={{display:"flex",gap:10,marginBottom:20}}>
      <button onClick={generate} disabled={loading} style={{...btn(true),fontSize:14}}>{loading?"Generating…":report?"↻ Regenerate":"Generate report →"}</button>
      {report&&<button onClick={download} style={{...btn(false),fontSize:14}}>Download .txt</button>}
    </div>
    {err&&<div style={{fontSize:13,color:"var(--red)",padding:"10px 14px",background:"var(--redBg)",borderRadius:8,marginBottom:14}}>{err}</div>}
    {report&&<div style={{...card,lineHeight:1.8}}>{report.split("\n").map((l,i)=><p key={i} style={{marginBottom:l.trim()?8:4,fontSize:14,color:l.match(/^\d\./)||l.match(/^#+/)?"var(--text)":"var(--textMuted)",fontWeight:l.match(/^\d\./)||l.match(/^#+/)?700:400}}>{l}</p>)}</div>}
  </div>;
}

// ── AI ASK ────────────────────────────────────────────────────────────────────
function AiAsk({portfolio,decisions,actions}) {
  const [question,setQuestion]=useState("");const [answer,setAnswer]=useState("");const [loading,setLoading]=useState(false);const [history,setHistory]=useState([]);
  const SUGGESTIONS=["Which ideas have been in Pretotype the longest?","What is our total capital exposure?","Which initiatives have no lead assigned?","Summarise all Red RAG initiatives","Which decisions are most overdue?","What is our sector concentration?"];
  const ask=async(q)=>{
    if (!q.trim()) return;setLoading(true);setAnswer("");
    const ctx=portfolio.map(p=>`${p.name}|${p.stage}|${p.rag}|Lead:${p.lead||"—"}|Sector:${p.sector}|Rating:${p.rating||"—"}|Deployed:${fmt(p.capitalDeployed)}|Days:${p.daysInStage||"—"}|Milestones:${(p.milestones||"").slice(0,80)}`).join("\n");
    try{const r=await callClaude(`You are a venture portfolio analyst for Trium Limited. Answer this question using ONLY the portfolio data. Be specific, factual, and concise. Reference initiative names.\n\nPortfolio:\n${ctx}\n\nPending decisions: ${decisions.map(d=>`${d.venture}:${d.decision}(${d.status})`).join("; ")}\n\nQuestion: ${q}\n\nAnswer in 3-6 sentences.`);setHistory(h=>[{q,a:r,time:new Date().toLocaleTimeString()},...h.slice(0,9)]);setAnswer(r);}
    catch(e){setAnswer("Error: "+e.message);}
    setLoading(false);
  };
  return <div>
    <div style={{fontSize:26,fontWeight:700,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>AI Portfolio Assistant</div>
    <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:20}}>Ask any question about your portfolio — AI answers using your actual data</div>
    <div style={{...card,marginBottom:16}}>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <input style={{...IS,resize:"none",flex:1}} value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!loading&&ask(question)} placeholder="Ask anything about your portfolio…"/>
        <button onClick={()=>ask(question)} disabled={loading||!question.trim()} style={{...btn(true),whiteSpace:"nowrap",fontSize:14}}>{loading?"Thinking…":"Ask →"}</button>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {SUGGESTIONS.slice(0,4).map((s,i)=><button key={i} onClick={()=>{setQuestion(s);ask(s);}} style={{fontSize:12,padding:"4px 11px",background:"var(--inputBg)",border:"1px solid var(--cardBorder)",borderRadius:20,cursor:"pointer",color:"var(--textMuted)"}}>{s.slice(0,42)}{s.length>42?"…":""}</button>)}
      </div>
    </div>
    {answer&&<div style={{...card,marginBottom:16,borderLeft:"3px solid var(--accent)"}}><div style={{fontSize:11,fontWeight:700,color:"var(--textMuted)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.4px"}}>Answer</div><div style={{fontSize:14,lineHeight:1.7}}>{answer}</div></div>}
    {history.length>0&&<div style={card}><div style={{fontWeight:700,marginBottom:14,fontSize:16}}>Recent questions</div>{history.slice(0,5).map((h,i)=><div key={i} style={{marginBottom:12,paddingBottom:12,borderBottom:i<history.length-1?"1px solid var(--cardBorder)":"none"}}><div style={{fontSize:13,color:"var(--accent)",fontWeight:600,marginBottom:4,cursor:"pointer"}} onClick={()=>{setQuestion(h.q);setAnswer(h.a);}}>Q: {h.q}</div><div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.6}}>{h.a.slice(0,200)}{h.a.length>200?"…":""}</div></div>)}</div>}
  </div>;
}

// ── DECISIONS ─────────────────────────────────────────────────────────────────
function Decisions({decisions,actions,isAdmin,onUpdateDecision,onUpdateAction}) {
  const urgColor=(d)=>{const dd=daysDue(d);return dd!==null&&dd<=0?"var(--red)":dd!==null&&dd<=7?"var(--gold)":"var(--textMuted)";};
  return <div>
    <div style={{fontSize:26,fontWeight:700,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>Decisions & Actions</div>
    <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:22}}>Leadership decisions required and portfolio action items</div>
    <div style={{fontWeight:700,marginBottom:14,fontSize:16}}>Decisions Required from Leadership / IC</div>
    <div style={{...card,padding:0,marginBottom:24,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr style={{borderBottom:"1px solid var(--cardBorder)"}}>
          {["Venture","Decision","Deadline","Owner","Status",""].map(h=><th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--textMuted)",letterSpacing:"0.4px",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{decisions.map(d=>{const dd=daysDue(d.deadline);return <tr key={d.id} style={{borderBottom:"1px solid var(--cardBorder)"}}>
          <td style={{padding:"12px 16px",fontWeight:700,fontSize:14}}>{d.venture}</td>
          <td style={{padding:"12px 16px",color:"var(--textMuted)",maxWidth:200,fontSize:14}}>{d.decision}</td>
          <td style={{padding:"12px 16px",color:urgColor(d.deadline),whiteSpace:"nowrap",fontWeight:dd!==null&&dd<=0?700:400,fontSize:14}}>{d.deadline?new Date(d.deadline).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}):"—"}{dd!==null&&dd<=0&&<span style={{fontSize:11,marginLeft:4}}>OVERDUE</span>}</td>
          <td style={{padding:"12px 16px",color:"var(--textMuted)",fontSize:14}}>{d.owner}</td>
          <td style={{padding:"12px 16px"}}><span style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,background:d.status==="Approved"?"var(--tealBg)":d.status==="Declined"?"var(--redBg)":"var(--goldBg)",color:d.status==="Approved"?"var(--teal)":d.status==="Declined"?"var(--red)":"var(--gold)"}}>{d.status}</span></td>
          <td style={{padding:"12px 16px"}}>{isAdmin&&d.status==="Pending"&&<div style={{display:"flex",gap:6}}><button onClick={()=>onUpdateDecision(d.id,"Approved")} style={{...btn(true),padding:"5px 12px",fontSize:12}}>Approve</button><button onClick={()=>onUpdateDecision(d.id,"Declined")} style={{...btn(false,true),padding:"5px 12px",fontSize:12}}>Decline</button></div>}</td>
        </tr>;})}
        </tbody>
      </table>
    </div>
    <div style={{fontWeight:700,marginBottom:14,fontSize:16}}>Action Items & Follow-ups</div>
    <div style={{...card,padding:0,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr style={{borderBottom:"1px solid var(--cardBorder)"}}>
          {["Action Item","Venture","Owner","Due","Priority","Status",""].map(h=><th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--textMuted)",letterSpacing:"0.4px",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{actions.map(a=>{const dd=daysDue(a.dueDate);return <tr key={a.id} style={{borderBottom:"1px solid var(--cardBorder)"}}>
          <td style={{padding:"12px 16px",color:"var(--textMuted)",maxWidth:260,lineHeight:1.4,fontSize:14}}>{a.action}</td>
          <td style={{padding:"12px 16px",fontWeight:700,fontSize:14}}>{a.venture}</td>
          <td style={{padding:"12px 16px",color:"var(--textMuted)",fontSize:14}}>{a.owner}</td>
          <td style={{padding:"12px 16px",color:urgColor(a.dueDate),whiteSpace:"nowrap",fontWeight:dd!==null&&dd<=0?700:400,fontSize:14}}>{a.dueDate?new Date(a.dueDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}):"—"}{dd!==null&&dd<=0&&<span style={{fontSize:11,marginLeft:4}}>OVERDUE</span>}</td>
          <td style={{padding:"12px 16px"}}><span style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,background:a.priority==="High"?"var(--redBg)":a.priority==="Medium"?"var(--goldBg)":"var(--tealBg)",color:a.priority==="High"?"var(--red)":a.priority==="Medium"?"var(--gold)":"var(--teal)"}}>{a.priority}</span></td>
          <td style={{padding:"12px 16px"}}><span style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,background:a.status==="On Track"?"var(--tealBg)":a.status==="Closed"?"var(--inputBg)":"var(--goldBg)",color:a.status==="On Track"?"var(--teal)":a.status==="Closed"?"var(--textMuted)":"var(--gold)"}}>{a.status}</span></td>
          <td style={{padding:"12px 16px"}}>{isAdmin&&a.status!=="Closed"&&<button onClick={()=>onUpdateAction(a.id,"Closed")} style={{...btn(false),padding:"5px 12px",fontSize:12,opacity:0.7}}>Close</button>}</td>
        </tr>;})}
        </tbody>
      </table>
    </div>
  </div>;
}

// ── SERVICES ──────────────────────────────────────────────────────────────────
function ServicesView({services,dark,isAdmin,onImport}) {
  const [search,setSearch]=useState("");
  const [fType,setFType]=useState("All");
  const [fStage,setFStage]=useState("All");
  const [expanded,setExpanded]=useState(null);
  const types=["All",...new Set(services.map(s=>s.engagementType).filter(Boolean))];
  const stages=["All",...new Set(services.map(s=>s.stage).filter(Boolean))];
  const totalDeal=services.reduce((t,s)=>t+(parseFloat((s.dealValue||"").replace(/[,\s]/g,""))||0),0);

  const filtered=services.filter(s=>{
    const q=search.toLowerCase();
    return (!q||s.name.toLowerCase().includes(q)||(s.client||"").toLowerCase().includes(q)||(s.description||"").toLowerCase().includes(q))
      &&(fType==="All"||s.engagementType===fType)
      &&(fStage==="All"||s.stage===fStage);
  });

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:12}}>
      <div>
        <div style={{fontSize:26,fontWeight:700,fontFamily:"'DM Serif Display',serif"}}>Services Portfolio</div>
        <div style={{fontSize:13,color:"var(--textMuted)",marginTop:3}}>Client engagements and co-build partnerships</div>
      </div>
      {onImport&&<ImportButton tab="services" onImport={onImport} label="Refresh Services"/>}
    </div>

    {/* Summary cards */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
      {[["Total Engagements",services.length,""],["Total Deal Value","₦"+totalDeal.toLocaleString()+"k","Combined"],["Active",services.filter(s=>s.stage&&s.stage!=="Completed"&&s.stage!=="Closed").length,"engagements"]].map(([l,v,s])=>(
        <div key={l} style={{background:"var(--card)",border:"1px solid var(--cardBorder)",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--textMuted)",letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:5}}>{l}</div>
          <div style={{fontSize:20,fontWeight:700,color:"var(--accent)"}}>{v}</div>
          {s&&<div style={{fontSize:11,color:"var(--textDim)",marginTop:3}}>{s}</div>}
        </div>
      ))}
    </div>

    {/* Filters */}
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      <input style={{...IS,width:200,resize:"none",padding:"6px 10px",fontSize:12}} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <select value={fType} onChange={e=>setFType(e.target.value)} style={{...IS,width:"auto",fontSize:12,cursor:"pointer",resize:"none",padding:"6px 10px"}}>
        {types.map(t=><option key={t} value={t}>{t==="All"?"All types":t}</option>)}
      </select>
      <select value={fStage} onChange={e=>setFStage(e.target.value)} style={{...IS,width:"auto",fontSize:12,cursor:"pointer",resize:"none",padding:"6px 10px"}}>
        {stages.map(t=><option key={t} value={t}>{t==="All"?"All stages":t}</option>)}
      </select>
      <div style={{fontSize:12,color:"var(--textMuted)",alignSelf:"center",marginLeft:"auto"}}>{filtered.length} results</div>
    </div>

    {/* Service cards */}
    <div style={{display:"grid",gap:14}}>
      {filtered.map(s=>{
        const isExp=expanded===s.id;
        return <div key={s.id} style={{...card,cursor:"pointer"}} onClick={()=>setExpanded(isExp?null:s.id)}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
                {s.stage&&<span style={{fontSize:11,fontWeight:700,background:"var(--accentBg)",color:"var(--accent)",padding:"2px 9px",borderRadius:20}}>{s.stage}</span>}
                {s.engagementType&&<span style={{fontSize:11,color:"var(--textMuted)",background:"var(--inputBg)",padding:"2px 9px",borderRadius:20}}>{s.engagementType}</span>}
              </div>
              <div style={{fontSize:18,fontWeight:700}}>{s.name}</div>
              {s.client&&<div style={{fontSize:13,color:"var(--textMuted)",marginTop:3}}>Client: <span style={{fontWeight:600,color:"var(--text)"}}>{s.client}</span></div>}
            </div>
            <div style={{textAlign:"right"}}>
              {s.dealValue&&<><span style={lbl}>Deal Value</span><div style={{fontSize:18,fontWeight:700,color:"var(--accent)"}}>₦{s.dealValue}k</div></>}
              <div style={{fontSize:11,color:"var(--textMuted)",marginTop:4}}>{isExp?"▲ Collapse":"▼ Expand"}</div>
            </div>
          </div>

          {/* Always visible summary */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:s.monthlyUpdate||s.milestones?12:0}}>
            {[["Trium Lead",s.triumLead||s.lead],["Fee Structure",s.feeStructure],["Phase",s.phase]].map(([l,v])=>(
              <div key={l}><span style={lbl}>{l}</span><div style={{fontSize:13}}>{v||"—"}</div></div>
            ))}
          </div>

          {s.monthlyUpdate&&<div style={{borderTop:"1px solid var(--cardBorder)",paddingTop:10,marginBottom:8}}>
            <span style={lbl}>Monthly Update</span>
            <div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.6}}>{isExp?s.monthlyUpdate:(s.monthlyUpdate||"").slice(0,120)+(s.monthlyUpdate?.length>120?"…":"")}</div>
          </div>}

          {/* Expanded details */}
          {isExp&&<div style={{borderTop:"1px solid var(--cardBorder)",paddingTop:12,marginTop:4}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:12}}>
              {[["Client Contact",s.clientContact],["Origination",s.origination],["Engagement Type",s.engagementType]].map(([l,v])=>(
                <div key={l}><span style={lbl}>{l}</span><div style={{fontSize:13}}>{v||"—"}</div></div>
              ))}
            </div>
            {s.description&&<div style={{marginBottom:10}}><span style={lbl}>Scope Summary</span><div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.6}}>{s.description}</div></div>}
            {s.milestones&&<div style={{marginBottom:10}}><span style={lbl}>Key Deliverables Achieved</span><div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.6}}>{s.milestones}</div></div>}
            {s.nextStep&&<div style={{marginBottom:10}}><span style={lbl}>Next Deliverables</span><div style={{fontSize:13,color:"var(--accent)",lineHeight:1.6}}>{s.nextStep}</div></div>}
            {s.blockers&&<div style={{padding:"8px 12px",background:"var(--redBg)",borderRadius:7}}><span style={{...lbl,color:"var(--red)"}}>Blockers / Dependencies</span><div style={{fontSize:13,color:"var(--red)",lineHeight:1.6}}>{s.blockers}</div></div>}
          </div>}
        </div>;
      })}
      {filtered.length===0&&<div style={{textAlign:"center",padding:"32px",color:"var(--textMuted)",fontSize:13}}>No services match your filters</div>}
    </div>
  </div>;
}


// ── IDEA BANK ─────────────────────────────────────────────────────────────────
function IdeaBank({bank,isAdmin,onRevive}) {
  const [search,setSearch]=useState("");
  const filtered=bank.filter(b=>!search||b.name.toLowerCase().includes(search.toLowerCase())||b.sector.toLowerCase().includes(search.toLowerCase())||b.description.toLowerCase().includes(search.toLowerCase()));
  return <div>
    <div style={{fontSize:26,fontWeight:700,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>Idea Bank</div>
    <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:8}}>{bank.length} reserved ideas — parked, not discarded</div>
    <div style={{...cardSm,marginBottom:18,background:"var(--purpleBg)",border:"1px solid var(--purple)30"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><div style={{width:8,height:8,borderRadius:"50%",background:"var(--purple)"}}/><div style={{fontSize:13,fontWeight:700,color:"var(--purple)"}}>AI Revival Scanner — Phase 2</div><span style={{fontSize:10,background:"var(--purple)",color:"#fff",padding:"1px 7px",borderRadius:20,fontWeight:600}}>Coming soon</span></div>
      <div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.6}}>Will scan the Bank against portfolio gaps and flag ideas worth revisiting.</div>
    </div>
    <input style={{...IS,width:300,resize:"none",marginBottom:18}} placeholder="Search reserved ideas…" value={search} onChange={e=>setSearch(e.target.value)}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
      {filtered.map(b=><div key={b.id} style={{...card,borderLeft:"3px solid var(--cardBorder)"}}>
        <div style={{fontWeight:700,marginBottom:3,fontSize:14}}>{b.name}</div>
        <div style={{fontSize:12,color:"var(--textMuted)",marginBottom:8}}>{b.sector}</div>
        <div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.5,marginBottom:12}}>{b.description}</div>
        {isAdmin&&<button onClick={()=>onRevive(b)} style={{...btn(false),fontSize:12,padding:"5px 14px",color:"var(--accent)",border:"1px solid var(--accent)40"}}>Revive idea →</button>}
      </div>)}
    </div>
  </div>;
}

// ── INVESTOR DATABASE ─────────────────────────────────────────────────────────
function InvestorDB({investors,setInvestors,isAdmin}) {
  const [search,setSearch]=useState("");
  const [fType,setFType]=useState("All");
  const [fWarmth,setFWarmth]=useState("All");
  const [selected,setSelected]=useState(null);
  const [addingNew,setAddingNew]=useState(false);
  const [newContact,setNewContact]=useState({name:"",type:"Strategic Partner",contactPerson:"",email:"",phone:"",relationship:"Prospect",stage:"Prospect",warmth:"Cold",notes:"",ventures:[],totalCommitted:0});

  const types=["All",...new Set(investors.map(i=>i.type))];
  const filtered=investors.filter(i=>{
    const q=search.toLowerCase();
    return (!q||i.name.toLowerCase().includes(q)||i.contactPerson.toLowerCase().includes(q))
      &&(fType==="All"||i.type===fType)
      &&(fWarmth==="All"||i.warmth===fWarmth);
  });
  const warmthColor={Hot:"var(--red)",Warm:"var(--gold)",Cold:"var(--accent)"};
  const warmthBg={Hot:"var(--redBg)",Warm:"var(--goldBg)",Cold:"var(--accentBg)"};
  const save=()=>{ const updated=[...investors,{...newContact,id:"i_"+Date.now()}]; setInvestors(updated); LS.set("vanta3_investors",updated); setAddingNew(false); setNewContact({name:"",type:"Strategic Partner",contactPerson:"",email:"",phone:"",relationship:"Prospect",stage:"Prospect",warmth:"Cold",notes:"",ventures:[],totalCommitted:0}); };

  if (selected) return <div>
    <button onClick={()=>setSelected(null)} style={{...btn(false),marginBottom:20,fontSize:13}}>← Back to Investor Database</button>
    <div style={{...card,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            <span style={{background:warmthBg[selected.warmth],color:warmthColor[selected.warmth],fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{selected.warmth}</span>
            <span style={{background:"var(--accentBg)",color:"var(--accent)",fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20}}>{selected.type}</span>
          </div>
          <div style={{fontSize:22,fontWeight:700,fontFamily:"'DM Serif Display',serif"}}>{selected.name}</div>
          <div style={{fontSize:14,color:"var(--textMuted)",marginTop:4}}>{selected.contactPerson} · {selected.stage}</div>
        </div>
        {selected.totalCommitted>0&&<div style={{textAlign:"right"}}><span style={lbl}>Capital committed</span><div style={{fontSize:20,fontWeight:700,color:"var(--accent)"}}>{fmt(selected.totalCommitted)}</div></div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16}}>
        {[["Contact Person",selected.contactPerson],["Email",selected.email],["Phone",selected.phone],["Relationship",selected.relationship],["Last Contact",selected.lastContact?new Date(selected.lastContact).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—"],["Stage",selected.stage]].map(([l,v])=>(
          <div key={l}><span style={lbl}>{l}</span><div style={{fontSize:14}}>{v||"—"}</div></div>
        ))}
      </div>
      {selected.ventures?.length>0&&<div style={{marginBottom:14}}><span style={lbl}>Associated ventures</span><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>{selected.ventures.map(v=><span key={v} style={{fontSize:13,background:"var(--accentBg)",color:"var(--accent)",padding:"2px 10px",borderRadius:20}}>{v}</span>)}</div></div>}
      <div><span style={lbl}>Notes</span><div style={{fontSize:14,color:"var(--textMuted)",lineHeight:1.7}}>{selected.notes||"—"}</div></div>
    </div>
  </div>;

  return <div>
    <div style={{fontSize:26,fontWeight:700,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>Investor & Partner Database</div>
    <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:20}}>{investors.length} contacts — investors, partners, regulators, and co-builders</div>
    <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...IS,width:240,resize:"none"}} placeholder="Search contacts…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <select value={fType} onChange={e=>setFType(e.target.value)} style={{...IS,width:"auto",cursor:"pointer",resize:"none"}}>{types.map(o=><option key={o} value={o}>{o==="All"?"All types":o}</option>)}</select>
      <select value={fWarmth} onChange={e=>setFWarmth(e.target.value)} style={{...IS,width:"auto",cursor:"pointer",resize:"none"}}>{["All","Hot","Warm","Cold"].map(o=><option key={o} value={o}>{o==="All"?"All warmth":o}</option>)}</select>
      <div style={{fontSize:13,color:"var(--textMuted)",marginLeft:"auto"}}>{filtered.length} results</div>
      {isAdmin&&<button onClick={()=>setAddingNew(true)} style={{...btn(true),fontSize:13}}>+ Add contact</button>}
    </div>
    {addingNew&&isAdmin&&<div style={{...card,marginBottom:16,border:"1px solid var(--accent)40"}}>
      <div style={{fontWeight:700,marginBottom:14,fontSize:15}}>New Contact</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        {[["name","Organisation / Name"],["contactPerson","Contact Person"],["email","Email"],["phone","Phone"]].map(([k,l])=>(
          <div key={k}><label style={lbl}>{l}</label><input style={{...IS,resize:"none"}} value={newContact[k]||""} onChange={e=>setNewContact(p=>({...p,[k]:e.target.value}))}/></div>
        ))}
        <div><label style={lbl}>Type</label><select value={newContact.type} onChange={e=>setNewContact(p=>({...p,type:e.target.value}))} style={{...IS,cursor:"pointer",resize:"none"}}>{["Strategic Partner","Technology Partner","Investor","Government Agency","Regulator","Co-builder","Other"].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
        <div><label style={lbl}>Warmth</label><select value={newContact.warmth} onChange={e=>setNewContact(p=>({...p,warmth:e.target.value}))} style={{...IS,cursor:"pointer",resize:"none"}}>{["Hot","Warm","Cold"].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
      </div>
      <div style={{marginBottom:12}}><label style={lbl}>Notes</label><textarea style={{...IS,minHeight:60}} value={newContact.notes||""} onChange={e=>setNewContact(p=>({...p,notes:e.target.value}))}/></div>
      <div style={{display:"flex",gap:8}}><button onClick={save} style={{...btn(true),fontSize:13}}>Save contact</button><button onClick={()=>setAddingNew(false)} style={{...btn(false),fontSize:13,opacity:0.6}}>Cancel</button></div>
    </div>}
    <div style={{...card,padding:0,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr style={{borderBottom:"1px solid var(--cardBorder)"}}>
          {["Organisation","Contact Person","Type","Ventures","Warmth","Last Contact",""].map(h=><th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--textMuted)",whiteSpace:"nowrap",letterSpacing:"0.4px",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{filtered.map(inv=><tr key={inv.id} style={{borderBottom:"1px solid var(--cardBorder)",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="var(--inputBg)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <td style={{padding:"12px 16px"}}><div style={{fontWeight:700,fontSize:14}}>{inv.name}</div>{inv.totalCommitted>0&&<div style={{fontSize:12,color:"var(--accent)"}}>{fmt(inv.totalCommitted)}</div>}</td>
          <td style={{padding:"12px 16px",fontSize:14,color:"var(--textMuted)"}}>{inv.contactPerson}</td>
          <td style={{padding:"12px 16px"}}><span style={{fontSize:12,background:"var(--accentBg)",color:"var(--accent)",padding:"2px 8px",borderRadius:20,fontWeight:600}}>{inv.type}</span></td>
          <td style={{padding:"12px 16px",fontSize:13,color:"var(--textMuted)"}}>{(inv.ventures||[]).slice(0,2).join(", ")}{(inv.ventures||[]).length>2?` +${inv.ventures.length-2}`:""}</td>
          <td style={{padding:"12px 16px"}}><span style={{background:warmthBg[inv.warmth],color:warmthColor[inv.warmth],fontSize:12,fontWeight:700,padding:"2px 9px",borderRadius:20}}>{inv.warmth}</span></td>
          <td style={{padding:"12px 16px",fontSize:13,color:"var(--textMuted)"}}>{inv.lastContact?new Date(inv.lastContact).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}):"—"}</td>
          <td style={{padding:"12px 16px"}}><button onClick={()=>setSelected(inv)} style={{...btn(false),padding:"5px 12px",fontSize:12}}>View →</button></td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

// ── ENGAGEMENT TRACKER ────────────────────────────────────────────────────────
function EngagementTracker({engagements,setEngagements,isAdmin}) {
  const [search,setSearch]=useState("");
  const [fStatus,setFStatus]=useState("All");
  const [addingNew,setAddingNew]=useState(false);
  const [newEng,setNewEng]=useState({contact:"",contactPerson:"",type:"Meeting",date:"",venture:"",summary:"",outcome:"",nextAction:"",nextDate:"",status:"Pending",triumpLead:""});
  const filtered=engagements.filter(e=>(!search||e.contact.toLowerCase().includes(search.toLowerCase())||(e.venture||"").toLowerCase().includes(search.toLowerCase()))&&(fStatus==="All"||e.status===fStatus));
  const statusColor={Completed:"var(--teal)",Pending:"var(--gold)","In Progress":"var(--accent)"};
  const statusBg={Completed:"var(--tealBg)",Pending:"var(--goldBg)","In Progress":"var(--accentBg)"};
  const save=()=>{ const updated=[...engagements,{...newEng,id:"e_"+Date.now()}]; setEngagements(updated); LS.set("vanta3_engagements",updated); setAddingNew(false); };
  const markDone=(id)=>{ const updated=engagements.map(e=>e.id===id?{...e,status:"Completed"}:e); setEngagements(updated); LS.set("vanta3_engagements",updated); };

  return <div>
    <div style={{fontSize:26,fontWeight:700,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>Engagement Tracker</div>
    <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:20}}>Meetings, touchpoints, and follow-ups across all investor and partner relationships</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
      {[["Total Engagements",engagements.length,"var(--text)"],["Pending Follow-ups",engagements.filter(e=>e.status==="Pending").length,"var(--gold)"],["Completed",engagements.filter(e=>e.status==="Completed").length,"var(--teal)"]].map(([l,v,c])=>(
        <div key={l} style={{background:"var(--card)",border:"1px solid var(--cardBorder)",borderRadius:10,padding:"16px 18px",textAlign:"center"}}><div style={{fontSize:12,fontWeight:600,color:"var(--textMuted)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.4px"}}>{l}</div><div style={{fontSize:28,fontWeight:700,color:c}}>{v}</div></div>
      ))}
    </div>
    <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...IS,width:220,resize:"none"}} placeholder="Search contacts or ventures…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{...IS,width:"auto",cursor:"pointer",resize:"none"}}>{["All","Pending","In Progress","Completed"].map(o=><option key={o} value={o}>{o==="All"?"All statuses":o}</option>)}</select>
      <div style={{marginLeft:"auto"}}>{isAdmin&&<button onClick={()=>setAddingNew(true)} style={{...btn(true),fontSize:13}}>+ Log engagement</button>}</div>
    </div>
    {addingNew&&isAdmin&&<div style={{...card,marginBottom:16,border:"1px solid var(--accent)40"}}>
      <div style={{fontWeight:700,marginBottom:14,fontSize:15}}>Log New Engagement</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        {[["contact","Organisation"],["contactPerson","Contact Person"],["venture","Venture"],["triumpLead","Trium Lead"],["date","Date"],["type","Engagement Type"]].map(([k,l])=>(
          <div key={k}><label style={lbl}>{l}</label>
            {k==="type"?<select value={newEng[k]} onChange={e=>setNewEng(p=>({...p,[k]:e.target.value}))} style={{...IS,cursor:"pointer",resize:"none"}}>{["Meeting","Call","Email","Workshop","Regulatory Meeting","Follow-up Call","Board Meeting","Working Session","Discovery Call","Other"].map(o=><option key={o} value={o}>{o}</option>)}</select>
            :<input style={{...IS,resize:"none"}} type={k==="date"?"date":"text"} value={newEng[k]||""} onChange={e=>setNewEng(p=>({...p,[k]:e.target.value}))}/>}
          </div>
        ))}
      </div>
      {[["summary","Summary"],["outcome","Outcome"],["nextAction","Next Action"]].map(([k,l])=>(
        <div key={k} style={{marginBottom:10}}><label style={lbl}>{l}</label><textarea style={{...IS,minHeight:50}} value={newEng[k]||""} onChange={e=>setNewEng(p=>({...p,[k]:e.target.value}))}/></div>
      ))}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div><label style={lbl}>Next Action Date</label><input type="date" style={{...IS,resize:"none"}} value={newEng.nextDate||""} onChange={e=>setNewEng(p=>({...p,nextDate:e.target.value}))}/></div>
        <div><label style={lbl}>Status</label><select value={newEng.status} onChange={e=>setNewEng(p=>({...p,status:e.target.value}))} style={{...IS,cursor:"pointer",resize:"none"}}>{["Pending","In Progress","Completed"].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
      </div>
      <div style={{display:"flex",gap:8}}><button onClick={save} style={{...btn(true),fontSize:13}}>Save</button><button onClick={()=>setAddingNew(false)} style={{...btn(false),fontSize:13,opacity:0.6}}>Cancel</button></div>
    </div>}
    <div style={{display:"grid",gap:12}}>
      {filtered.map(e=>{
        const overdue=e.nextDate&&new Date(e.nextDate)<new Date()&&e.status!=="Completed";
        return <div key={e.id} style={{...card,borderLeft:`3px solid ${statusColor[e.status]||"var(--cardBorder)"}`,opacity:e.status==="Completed"?0.75:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:700}}>{e.contact}</span>
                <span style={{fontSize:12,color:"var(--textMuted)"}}>· {e.type}</span>
                {e.venture&&<span style={{fontSize:11,background:"var(--accentBg)",color:"var(--accent)",padding:"1px 7px",borderRadius:20}}>{e.venture}</span>}
              </div>
              <div style={{fontSize:12,color:"var(--textMuted)"}}>{e.contactPerson} · {e.date?new Date(e.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—"} · Lead: {e.triumpLead||"—"}</div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{background:statusBg[e.status],color:statusColor[e.status],fontSize:12,fontWeight:600,padding:"2px 9px",borderRadius:20}}>{e.status}</span>
              {isAdmin&&e.status!=="Completed"&&<button onClick={()=>markDone(e.id)} style={{...btn(false),padding:"4px 10px",fontSize:11,opacity:0.7}}>Mark done</button>}
            </div>
          </div>
          {e.summary&&<div style={{fontSize:13,color:"var(--textMuted)",marginBottom:6,lineHeight:1.5}}><span style={{fontWeight:600,color:"var(--text)"}}>Summary: </span>{e.summary}</div>}
          {e.outcome&&<div style={{fontSize:13,color:"var(--textMuted)",marginBottom:6}}><span style={{fontWeight:600,color:"var(--text)"}}>Outcome: </span>{e.outcome}</div>}
          {e.nextAction&&<div style={{fontSize:13,color:overdue?"var(--red)":"var(--accent)",display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontWeight:600}}>Next: </span>{e.nextAction}
            {e.nextDate&&<span style={{fontSize:11,color:overdue?"var(--red)":"var(--textMuted)",marginLeft:4}}>{overdue?"OVERDUE — ":""}{new Date(e.nextDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</span>}
          </div>}
        </div>;
      })}
    </div>
    {filtered.length===0&&<div style={{textAlign:"center",padding:"32px",color:"var(--textMuted)",fontSize:14}}>No engagements match your filters</div>}
  </div>;
}

// ── FUNDRAISING PIPELINE ──────────────────────────────────────────────────────
function FundraisingPipeline({fundraising,setFundraising,isAdmin}) {
  const [addingNew,setAddingNew]=useState(false);
  const [newDeal,setNewDeal]=useState({venture:"",round:"Seed",targetAmount:0,raisedAmount:0,stage:"Pipeline",lead:"Trium",investors:"TBD",probability:30,expectedClose:"",notes:"",status:"Pipeline"});
  const totalTarget=fundraising.reduce((s,f)=>s+(f.targetAmount||0),0);
  const totalRaised=fundraising.reduce((s,f)=>s+(f.raisedAmount||0),0);
  const active=fundraising.filter(f=>f.status==="Active");
  const stageOrder=["Pipeline","In Progress","IC Review","Negotiation","Closed","On Hold"];
  const stageColor={"Pipeline":"var(--textMuted)","In Progress":"var(--accent)","IC Review":"var(--gold)","Negotiation":"var(--teal)","Closed":"var(--green)","On Hold":"var(--red)"};
  const stageBg={"Pipeline":"var(--inputBg)","In Progress":"var(--accentBg)","IC Review":"var(--goldBg)","Negotiation":"var(--tealBg)","Closed":"var(--greenBg)","On Hold":"var(--redBg)"};
  const save=()=>{ const updated=[...fundraising,{...newDeal,id:"f_"+Date.now()}]; setFundraising(updated); LS.set("vanta3_fundraising",updated); setAddingNew(false); };

  return <div>
    <div style={{fontSize:26,fontWeight:700,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>Fundraising Pipeline</div>
    <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:20}}>Capital raise pipeline across all active and planned funding rounds</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14,marginBottom:20}}>
      <div style={{background:"var(--card)",border:"1px solid var(--cardBorder)",borderRadius:10,padding:"16px 18px",textAlign:"center"}}><div style={{fontSize:11,fontWeight:600,color:"var(--textMuted)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.4px"}}>Total Target</div><div style={{fontSize:22,fontWeight:700,color:"var(--accent)"}}>{fmt(totalTarget)}</div></div>
      <div style={{background:"var(--card)",border:"1px solid var(--cardBorder)",borderRadius:10,padding:"16px 18px",textAlign:"center"}}><div style={{fontSize:11,fontWeight:600,color:"var(--textMuted)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.4px"}}>Total Raised</div><div style={{fontSize:22,fontWeight:700,color:"var(--teal)"}}>{fmt(totalRaised)}</div></div>
      <div style={{background:"var(--card)",border:"1px solid var(--cardBorder)",borderRadius:10,padding:"16px 18px",textAlign:"center"}}><div style={{fontSize:11,fontWeight:600,color:"var(--textMuted)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.4px"}}>Active Rounds</div><div style={{fontSize:22,fontWeight:700}}>{active.length}</div></div>
      <div style={{background:"var(--card)",border:"1px solid var(--cardBorder)",borderRadius:10,padding:"16px 18px",textAlign:"center"}}><div style={{fontSize:11,fontWeight:600,color:"var(--textMuted)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.4px"}}>Remaining Gap</div><div style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>{fmt(totalTarget-totalRaised)}</div></div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:16}}>All Funding Rounds</div>
      {isAdmin&&<button onClick={()=>setAddingNew(true)} style={{...btn(true),fontSize:13}}>+ Add round</button>}
    </div>
    {addingNew&&isAdmin&&<div style={{...card,marginBottom:16,border:"1px solid var(--accent)40"}}>
      <div style={{fontWeight:700,marginBottom:14,fontSize:15}}>New Funding Round</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        {[["venture","Venture"],["round","Round type"],["lead","Lead"],["investors","Investors"],["expectedClose","Expected Close"],["probability","Success probability (%)"]].map(([k,l])=>(
          <div key={k}><label style={lbl}>{l}</label>
            {k==="round"?<select value={newDeal[k]} onChange={e=>setNewDeal(p=>({...p,[k]:e.target.value}))} style={{...IS,cursor:"pointer",resize:"none"}}>{["Pre-seed","Seed","Series A","Series B","Co-development","Strategic Investment","Grant","Other"].map(o=><option key={o} value={o}>{o}</option>)}</select>
            :<input style={{...IS,resize:"none"}} type={k.includes("Amount")||k==="probability"?"number":"text"} value={newDeal[k]||""} onChange={e=>setNewDeal(p=>({...p,[k]:k.includes("Amount")||k==="probability"?parseFloat(e.target.value)||0:e.target.value}))}/>}
          </div>
        ))}
        <div><label style={lbl}>Target Amount (₦)</label><input type="number" style={{...IS,resize:"none"}} value={newDeal.targetAmount||""} onChange={e=>setNewDeal(p=>({...p,targetAmount:parseFloat(e.target.value)||0}))}/></div>
        <div><label style={lbl}>Amount Raised (₦)</label><input type="number" style={{...IS,resize:"none"}} value={newDeal.raisedAmount||""} onChange={e=>setNewDeal(p=>({...p,raisedAmount:parseFloat(e.target.value)||0}))}/></div>
      </div>
      <div style={{marginBottom:12}}><label style={lbl}>Notes</label><textarea style={{...IS,minHeight:50}} value={newDeal.notes||""} onChange={e=>setNewDeal(p=>({...p,notes:e.target.value}))}/></div>
      <div style={{display:"flex",gap:8}}><button onClick={save} style={{...btn(true),fontSize:13}}>Save</button><button onClick={()=>setAddingNew(false)} style={{...btn(false),fontSize:13,opacity:0.6}}>Cancel</button></div>
    </div>}
    <div style={{...card,padding:0,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr style={{borderBottom:"1px solid var(--cardBorder)"}}>
          {["Venture","Round","Target","Raised","Stage","Lead","Probability","Close",""].map(h=><th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--textMuted)",whiteSpace:"nowrap",letterSpacing:"0.4px",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{fundraising.map(f=>{
          const pct=f.targetAmount>0?Math.round((f.raisedAmount/f.targetAmount)*100):0;
          return <tr key={f.id} style={{borderBottom:"1px solid var(--cardBorder)"}}>
            <td style={{padding:"12px 16px",fontWeight:700}}>{f.venture}</td>
            <td style={{padding:"12px 16px",color:"var(--textMuted)"}}>{f.round}</td>
            <td style={{padding:"12px 16px",color:"var(--accent)",fontWeight:600}}>{fmt(f.targetAmount)}</td>
            <td style={{padding:"12px 16px"}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--teal)",marginBottom:3}}>{fmt(f.raisedAmount)}</div>
              <div style={{height:4,background:"var(--inputBg)",borderRadius:2,width:80}}><div style={{height:"100%",width:`${pct}%`,background:"var(--teal)",borderRadius:2}}/></div>
              <div style={{fontSize:10,color:"var(--textMuted)",marginTop:2}}>{pct}%</div>
            </td>
            <td style={{padding:"12px 16px"}}><span style={{background:stageBg[f.stage]||"var(--inputBg)",color:stageColor[f.stage]||"var(--textMuted)",fontSize:12,fontWeight:600,padding:"2px 9px",borderRadius:20}}>{f.stage}</span></td>
            <td style={{padding:"12px 16px",color:"var(--textMuted)"}}>{f.lead}</td>
            <td style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:`${f.probability}%`,height:5,background:"var(--accentBg)",borderRadius:2,position:"relative",flex:1}}><div style={{height:"100%",width:`${f.probability}%`,background:"var(--accent)",borderRadius:2}}/></div><span style={{fontSize:12,color:"var(--textMuted)",whiteSpace:"nowrap"}}>{f.probability}%</span></div></td>
            <td style={{padding:"12px 16px",color:"var(--textMuted)",fontSize:13}}>{f.expectedClose||"—"}</td>
            <td style={{padding:"12px 16px",color:"var(--textMuted)",fontSize:13,maxWidth:200,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.notes||""}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}

// ── CRM EVALUATION (reference framework) ─────────────────────────────────────
function CRMView() {
  return <div>
    <div style={{fontSize:26,fontWeight:700,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>CRM Evaluation Framework</div>
    <div style={{fontSize:14,color:"var(--textMuted)",marginBottom:8}}>27 criteria · 9 categories · 100-point weighted framework</div>
    <div style={{...cardSm,marginBottom:20,background:"var(--accentBg)",border:"1px solid var(--accent)30"}}>
      <div style={{fontSize:14,fontWeight:600,color:"var(--accent)",marginBottom:6}}>Score CRM tools in the dedicated Trium CRM Assessor</div>
      <div style={{fontSize:13,color:"var(--textMuted)",lineHeight:1.6,marginBottom:10}}>The framework below shows what a venture studio CRM should support. Use the dedicated assessor app to score and compare Affinity, Decile Hub, 9point8, and others.</div>
      <a href="https://trium-crm.vercel.app" target="_blank" rel="noreferrer" style={{...btn(true),fontSize:13,display:"inline-block"}}>Open CRM Assessor ↗</a>
    </div>
    <div style={{display:"grid",gap:14}}>
      {CRM_CATEGORIES.map(cat=><div key={cat.name} style={card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:700}}>{cat.name}</div>
          <span style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,background:"var(--accentBg)",color:"var(--accent)"}}>{cat.weight}% weight</span>
        </div>
        <div style={{display:"grid",gap:8}}>
          {cat.criteria.map(c=><div key={c.name} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"8px 0",borderBottom:"1px solid var(--cardBorder)"}}>
            <div><div style={{fontSize:14,fontWeight:600}}>{c.name}</div><div style={{fontSize:12,color:"var(--textMuted)",marginTop:2,lineHeight:1.5,maxWidth:500}}>{c.desc}</div></div>
            <span style={{fontSize:12,fontWeight:600,color:"var(--textMuted)",whiteSpace:"nowrap",marginLeft:12}}>{c.weight}%</span>
          </div>)}
        </div>
      </div>)}
    </div>
  </div>;
}

// ── SINGLE VIEW (presentation mode) ─────────────────────────────────────────
function MPRView({portfolio,decisions,actions,isAdmin,onExitMPR}) {
  const [mprDark,setMprDark]           = useState(false);
  const [presentStyle,setPresentStyle] = useState("table");
  const [showBuilder,setShowBuilder]   = useState(false);
  const [selectedIdea,setSelectedIdea] = useState(null);
  const [config,setConfig] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("vanta_sv_config")||"{}"); } catch { return {}; }
  });
  const defaultConfig = {
    showFinancials:true, showSummary:true, showDistribution:true,
    showSunsetted:false,
    fields:{ phase:true, lead:true, capitalDeployed:true, milestones:true, nextStep:true, rag:true }
  };
  const cfg = {...defaultConfig,...config, fields:{...defaultConfig.fields,...(config.fields||{})}};
  const saveConfig = c => { setConfig(c); try{localStorage.setItem("vanta_sv_config",JSON.stringify(c));}catch{} };

  const isSunset = p => p.phase?.toLowerCase()==="sunsetted";

  // Derive displayed portfolio based on config
  const displayPortfolio = cfg.showSunsetted ? portfolio : portfolio.filter(p=>!isSunset(p));
  const total    = displayPortfolio.length;
  const active   = displayPortfolio.filter(p=>!isSunset(p));
  const totalDep = displayPortfolio.reduce((s,p)=>s+(p.capitalDeployed||0),0);
  const totalNeed= displayPortfolio.reduce((s,p)=>s+(p.capitalNeeded||0),0);

  const MC = mprDark ? {
    bg:"#0a0f1e", hdr:"rgba(0,0,0,0.4)", text:"#e2e8f0", textSub:"#64748b", textDim:"#374151",
    card:"rgba(255,255,255,0.05)", cardBorder:"rgba(255,255,255,0.08)",
    tableBorder:"rgba(255,255,255,0.06)", input:"rgba(255,255,255,0.08)", inputText:"#e2e8f0", btn:"rgba(255,255,255,0.1)",
  } : {
    bg:"#f5f5f0", hdr:"rgba(255,255,255,0.9)", text:"#1a1a18", textSub:"#6b7280", textDim:"#d1d5db",
    card:"#ffffff", cardBorder:"rgba(0,0,0,0.08)",
    tableBorder:"rgba(0,0,0,0.07)", input:"#f8f8f5", inputText:"#1a1a18", btn:"rgba(0,0,0,0.06)",
  };

  // Stage columns — no "Sunsetted" as a column
  const SV_COLS = STAGES.map(s=>({
    key:s, label:STAGE_META[s]?.short||s,
    sub: s==="Idea"?"IC stage":s==="Pretotype"?"Active validation":s==="MVP"?"Min. viable product":"Built & invested",
    color: STAGE_META[s]?.color||"#888780",
    ideas: displayPortfolio.filter(p=>p.stage===s),
  })).filter(c=>c.ideas.length>0);

  const phaseTag = (stage,phase) => {
    if (stage?.includes("Built"))    return {label:"Built",    bg:"#E6F1FB",color:"#185FA5"};
    if (stage?.includes("Invested")) return {label:"Invested", bg:"#EEEDFE",color:"#534AB7"};
    const map={"Live":{bg:"#E1F5EE",color:"#0F6E56"},"IC":{bg:"#FAEEDA",color:"#854F0B"},"In-development":{bg:"#E6F1FB",color:"#185FA5"},"Sunsetted":{bg:"#F1EFE8",color:"#888780"}};
    return map[phase]||{bg:"#F1EFE8",color:"#5F5E5A",label:phase||"—"};
  };

  const tagline = p => {
    const raw = p.valueProposition || p.description || "";
    if (!raw) return "";
    const first = raw.split(/[.;\n]/)[0].trim();
    return first.slice(0, 50) + (first.length > 50 ? "…" : "");
  };

  return <div style={{position:"fixed",inset:0,background:MC.bg,zIndex:200,display:"flex",flexDirection:"column",fontFamily:"'DM Sans',sans-serif",overflow:"hidden"}}>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 16px",borderBottom:"1px solid "+MC.cardBorder,flexShrink:0,background:MC.hdr,backdropFilter:"blur(8px)"}}>
      <div>
        <div style={{fontSize:9,color:MC.textSub,letterSpacing:"2px",textTransform:"uppercase",marginBottom:1}}>TRIUM LIMITED · CONFIDENTIAL</div>
        <div style={{fontSize:16,fontWeight:700,color:MC.text,fontFamily:"'DM Serif Display',serif"}}>Single View — {new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</div>
      </div>
      <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"inline-flex",gap:1,background:MC.btn,borderRadius:6,padding:2}}>
          {[["table","Table"],["cards","Cards"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setPresentStyle(id)} style={{background:presentStyle===id?(mprDark?"rgba(255,255,255,0.15)":"#fff"):"transparent",color:presentStyle===id?MC.text:MC.textSub,border:"none",borderRadius:4,padding:"3px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{lbl}</button>
          ))}
        </div>
        <button onClick={()=>setMprDark(d=>!d)} style={{background:MC.btn,color:MC.text,border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{mprDark?"☀ Light":"◐ Dark"}</button>
        <button onClick={()=>setShowBuilder(b=>!b)} style={{background:MC.btn,color:MC.text,border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{showBuilder?"Close":"Customise"}</button>
        <button onClick={onExitMPR} style={{background:"transparent",color:MC.textSub,border:"1px solid "+MC.cardBorder,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Exit</button>
      </div>
    </div>

    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      {/* Customise panel — all users */}
      {showBuilder&&<div style={{width:200,borderRight:"1px solid "+MC.cardBorder,padding:"10px 12px",overflowY:"auto",background:mprDark?"rgba(255,255,255,0.03)":"#fff",flexShrink:0,fontSize:12}}>
        <div style={{fontSize:10,fontWeight:700,color:MC.textSub,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>Customise</div>
        {[["showFinancials","Financials"],["showSummary","Summary counts"],["showDistribution","Stage bar"],["showSunsetted","Include sunsetted"]].map(([k,lbl])=>(
          <label key={k} style={{display:"flex",alignItems:"center",gap:6,marginBottom:7,cursor:"pointer"}}>
            <input type="checkbox" checked={!!cfg[k]} onChange={()=>saveConfig({...cfg,[k]:!cfg[k]})} style={{cursor:"pointer"}}/>
            <span style={{color:MC.textSub}}>{lbl}</span>
          </label>
        ))}
        <div style={{borderTop:"1px solid "+MC.cardBorder,marginTop:10,paddingTop:10}}>
          <div style={{fontSize:10,fontWeight:700,color:MC.textSub,marginBottom:8,textTransform:"uppercase"}}>Card fields</div>
          {[["rag","RAG status"],["phase","Phase tag"],["lead","Lead"],["capitalDeployed","Capital"],["milestones","Update"],["nextStep","Next update"]].map(([k,lbl])=>(
            <label key={k} style={{display:"flex",alignItems:"center",gap:6,marginBottom:7,cursor:"pointer"}}>
              <input type="checkbox" checked={!!cfg.fields[k]} onChange={()=>saveConfig({...cfg,fields:{...cfg.fields,[k]:!cfg.fields[k]}})} style={{cursor:"pointer"}}/>
              <span style={{color:MC.textSub}}>{lbl}</span>
            </label>
          ))}
        </div>
      </div>}

      {/* Main */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
        {/* Financials */}
        {cfg.showFinancials&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
          {[["Total",total,"var(--text)"],["Active",active.length,"var(--teal)"],["Deployed",fmt(totalDep),"var(--accent)"],["Pipeline",fmt(totalNeed),"var(--gold)"]].map(([l,v,c])=>(
            <div key={l} style={{background:MC.card,borderRadius:8,padding:"9px 12px",border:"1px solid "+MC.cardBorder,textAlign:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:MC.textSub,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:3}}>{l}</div>
              <div style={{fontSize:20,fontWeight:700,color:c}}>{v}</div>
            </div>
          ))}
        </div>}

        {/* Stage bar */}
        {cfg.showDistribution&&<div style={{background:MC.card,borderRadius:8,padding:"8px 12px",border:"1px solid "+MC.cardBorder,marginBottom:10}}>
          <div style={{display:"flex",height:5,borderRadius:3,overflow:"hidden",gap:1,marginBottom:5}}>
            {STAGES.map(s=>{const c=displayPortfolio.filter(p=>p.stage===s).length;if(!c)return null;const pct=(c/total)*100;const m=STAGE_META[s];return <div key={s} title={s+": "+c} style={{width:pct+"%",background:m.color}}/>;  })}
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {STAGES.map(s=>{const c=displayPortfolio.filter(p=>p.stage===s).length;if(!c)return null;const m=STAGE_META[s];return <div key={s} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:MC.textSub}}><div style={{width:5,height:5,borderRadius:"50%",background:m.color}}/>{m.short} <span style={{fontWeight:700,color:MC.text}}>{c}</span></div>;})}
          </div>
        </div>}

        {/* TABLE VIEW — each stage is a column, auto-split if too many */}
        {presentStyle==="table"&&<div style={{display:"grid",gridTemplateColumns:"repeat("+Math.min(SV_COLS.length,5)+",1fr)",gap:8}}>
          {SV_COLS.map(col=>{
            const sunset_ideas = col.ideas.filter(p=>isSunset(p));
            const active_ideas = col.ideas.filter(p=>!isSunset(p));
            // Auto-split: if > 6 ideas, use 2-col grid within the column
            const useMultiCol = col.ideas.length > 5;
            const cols = col.ideas.length > 10 ? 3 : col.ideas.length > 5 ? 2 : 1;
            return <div key={col.key}>
              {/* Column header */}
              <div style={{background:col.color,borderRadius:"7px 7px 0 0",padding:"8px 10px"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{col.label}</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.65)",marginTop:1}}>{col.sub} · {active_ideas.length} active{sunset_ideas.length>0?" · "+sunset_ideas.length+" sunsetted":""}</div>
              </div>
              <div style={{border:"1px solid "+MC.cardBorder,borderTop:"none",borderRadius:"0 0 7px 7px",overflow:"hidden"}}>
                {col.ideas.length===0&&<div style={{padding:"12px",textAlign:"center",fontSize:11,color:MC.textSub}}>—</div>}
                <div style={{display:useMultiCol?"grid":"block",gridTemplateColumns:useMultiCol?"repeat("+cols+",1fr)":"none"}}>
                  {col.ideas.map((idea,idx)=>{
                    const pt  = phaseTag(idea.stage,idea.phase);
                    const r   = RAG_META[idea.rag]||RAG_META["Amber"];
                    const sun = isSunset(idea);
                    const isExp = selectedIdea?.id===idea.id;
                    return <div key={idea.id} onClick={()=>setSelectedIdea(isExp?null:idea)}
                      style={{borderBottom:idx<col.ideas.length-1?"1px solid "+MC.tableBorder:"none",
                        padding:"8px 9px",cursor:"pointer",borderLeft:"3px solid "+col.color,
                        opacity:sun?0.4:1,background:isExp?(mprDark?"rgba(255,255,255,0.07)":col.color+"12"):"transparent"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:3,marginBottom:3}}>
                        <div style={{fontSize:11,lineHeight:1.4,flex:1}}>
                          <span style={{fontWeight:700,color:MC.text}}>{idea.name}</span>
                          {tagline(idea)&&<span style={{color:MC.textSub,fontWeight:400}}> — {tagline(idea)}</span>}
                        </div>
                        {cfg.fields.rag&&<div style={{width:6,height:6,borderRadius:"50%",background:r.dot,flexShrink:0,marginTop:3}}/>}
                      </div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:3}}>
                        {cfg.fields.phase&&<span style={{fontSize:8,fontWeight:700,background:pt.bg,color:pt.color,padding:"1px 5px",borderRadius:20}}>{pt.label}</span>}
                        {cfg.fields.lead&&idea.lead&&<span style={{fontSize:8,color:MC.textSub}}>{idea.lead}</span>}
                      </div>
                      {cfg.fields.capitalDeployed&&idea.capitalDeployed>0&&<div style={{fontSize:9,fontWeight:700,color:"#185FA5",marginBottom:2}}>{fmt(idea.capitalDeployed)}</div>}
                      {cfg.fields.milestones&&idea.milestones&&<div style={{fontSize:9,color:MC.textSub,lineHeight:1.3,marginBottom:2}}><span style={{fontWeight:600,color:mprDark?MC.textSub:"#555"}}>Update: </span>{idea.milestones.slice(0,55)}{idea.milestones.length>55?"…":""}</div>}
                      {cfg.fields.nextStep&&idea.nextStep&&<div style={{fontSize:9,color:mprDark?"rgba(56,189,248,0.85)":col.color,lineHeight:1.3}}><span style={{fontWeight:600}}>Next update: </span>{idea.nextStep.slice(0,50)}{idea.nextStep.length>50?"…":""}</div>}
                      {isExp&&<div style={{marginTop:6,paddingTop:6,borderTop:"1px solid "+MC.tableBorder}}>
                        {idea.description&&<div style={{fontSize:9,color:MC.textSub,lineHeight:1.4,marginBottom:3}}>{idea.description.slice(0,120)}</div>}
                        {idea.capitalNeeded>0&&<div style={{fontSize:9,color:"var(--gold)"}}>Needed: {fmt(idea.capitalNeeded)}</div>}
                      </div>}
                    </div>;
                  })}
                </div>
              </div>
            </div>;
          })}
        </div>}

        {/* CARDS VIEW */}
        {presentStyle==="cards"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:8}}>
          {displayPortfolio.map(idea=>{
            const m   = STAGE_META[idea.stage]||STAGE_META["Idea"];
            const r   = RAG_META[idea.rag]||RAG_META["Amber"];
            const sun = isSunset(idea);
            const isExp = selectedIdea?.id===idea.id;
            const pt  = phaseTag(idea.stage,idea.phase);
            return <div key={idea.id} onClick={()=>setSelectedIdea(isExp?null:idea)}
              style={{background:MC.card,borderRadius:9,padding:"10px 12px",border:"1px solid "+(isExp?m.color+"80":MC.cardBorder),
                cursor:"pointer",opacity:sun?0.4:1,borderLeft:"3px solid "+m.color}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:4,marginBottom:4}}>
                <div style={{fontSize:11,lineHeight:1.4,flex:1}}>
                  <span style={{fontWeight:700,color:MC.text}}>{idea.name}</span>
                  {tagline(idea)&&<span style={{color:MC.textSub,fontWeight:400}}> — {tagline(idea)}</span>}
                </div>
                {cfg.fields.rag&&<div style={{width:6,height:6,borderRadius:"50%",background:r.dot,flexShrink:0,marginTop:3}}/>}
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
                <span style={{background:mprDark?m.darkBg:m.lightBg,color:mprDark?m.darkText:m.lightText,fontSize:8,fontWeight:700,padding:"1px 6px",borderRadius:20}}>{m.short}</span>
                {cfg.fields.phase&&<span style={{fontSize:8,fontWeight:700,background:pt.bg,color:pt.color,padding:"1px 5px",borderRadius:20}}>{pt.label}</span>}
              </div>
              {cfg.fields.lead&&idea.lead&&<div style={{fontSize:9,color:MC.textSub,marginBottom:3}}>{idea.lead}</div>}
              {cfg.fields.capitalDeployed&&idea.capitalDeployed>0&&<div style={{fontSize:9,fontWeight:700,color:"#185FA5",marginBottom:3}}>{fmt(idea.capitalDeployed)}</div>}
              {cfg.fields.milestones&&idea.milestones&&<div style={{fontSize:9,color:MC.textSub,lineHeight:1.3,marginBottom:2}}><span style={{fontWeight:600}}>Update: </span>{idea.milestones.slice(0,50)}{idea.milestones.length>50?"…":""}</div>}
              {cfg.fields.nextStep&&idea.nextStep&&<div style={{fontSize:9,color:mprDark?"rgba(56,189,248,0.8)":m.color,lineHeight:1.3}}><span style={{fontWeight:600}}>Next update: </span>{idea.nextStep.slice(0,45)}{idea.nextStep.length>45?"…":""}</div>}
            </div>;
          })}
        </div>}
      </div>
    </div>

    {/* Footer */}
    <div style={{padding:"5px 14px",borderTop:"1px solid "+MC.cardBorder,fontSize:10,color:MC.textSub,display:"flex",justifyContent:"space-between",background:mprDark?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.6)",flexShrink:0}}>
      <span>Vanta by Trium · {total} initiatives · {active.length} active</span>
      <span>Click any card to expand · Customise available to all</span>
    </div>
  </div>;
}


// ── DUPLICATE MODAL ───────────────────────────────────────────────────────────
function DuplicateModal({ duplicates, onClose }) {
  if (!duplicates || duplicates.length === 0) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:20}}>
      <div style={{...card,maxWidth:500,width:"100%"}}>
        <div style={{fontSize:17,fontWeight:700,marginBottom:6,color:"var(--gold)"}}>⚠ Duplicate initiatives detected</div>
        <div style={{fontSize:13,color:"var(--textMuted)",marginBottom:16,lineHeight:1.6}}>The following initiative names appear more than once in your Portfolio Overview sheet. Please review and clean up the sheet directly.</div>
        <div style={{display:"grid",gap:8,marginBottom:18}}>
          {duplicates.map(name=>(
            <div key={name} style={{padding:"8px 12px",background:"var(--goldBg)",borderRadius:7,fontSize:13,fontWeight:600,color:"var(--gold)"}}>{name}</div>
          ))}
        </div>
        <button onClick={onClose} style={{...btn(true),fontSize:14}}>Understood — close</button>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",  label:"Dashboard",          icon:"◈"},
  {id:"mpr",        label:"Single View",        icon:"▦"},
  {id:"bank_view", label:"Bank",         icon:"⊞"},
  {id:"intake",     label:"Idea Intake",        icon:"⊕"},
  {id:"financials", label:"Financials",         icon:"₦"},
  {id:"risk",       label:"Risk Radar",         icon:"◉"},
  {id:"report",     label:"Monthly Report",     icon:"◧"},
  {id:"ask",        label:"AI Ask",             icon:"?"},
  {id:"decisions",  label:"Decisions",          icon:"⚑"},
  {id:"services",   label:"Services",           icon:"◇"},
  {id:"bank",       label:"Idea Bank",          icon:"⊟"},
  {id:"div1",       label:"── CRM ──",          icon:""},
  {id:"investors",  label:"Investor Database",  icon:"◎"},
  {id:"engagements",label:"Engagements",        icon:"◷"},
  {id:"fundraising",label:"Fundraising",        icon:"⊿"},
  {id:"crm",        label:"CRM Framework",      icon:"⊛"},
];

export default function App() {
  const {dark,toggle} = useTheme();
  const [view,setView]         = useState("dashboard");
  const [portfolio,setPortfolio]= useState([]);
  const [bank,setBank]          = useState([]);
  const [services,setServices]  = useState([]);
  const [decisions,setDecisions]= useState(()=>LS.get("vanta3_decisions")||INIT_DECISIONS);
  const [actions,setActions]    = useState(()=>LS.get("vanta3_actions")||INIT_ACTIONS);
  const [investors,setInvestors]= useState(()=>LS.get("vanta3_investors")||INIT_INVESTORS);
  const [engagements,setEngagements]=useState(()=>LS.get("vanta3_engagements")||INIT_ENGAGEMENTS);
  const [fundraising,setFundraising]=useState(()=>LS.get("vanta3_fundraising")||INIT_FUNDRAISING);
  const [auditLog,setAuditLog]  = useState(()=>LS.get("vanta3_audit")||[]);
  const [selectedIdea,setSelectedIdea]=useState(null);
  const [isAdmin,setIsAdmin]    = useState(false);
  const [showPin,setShowPin]    = useState(false);
  const [pin,setPin]            = useState("");
  const [pinErr,setPinErr]      = useState("");
  const [mprOpen,setMprOpen]    = useState(false);
  const [sidebarOpen,setSidebarOpen] = useState(true);

  // Sync state
  const [syncStatus,setSyncStatus] = useState("loading"); // loading | synced | saving | error
  const [syncError,setSyncError]   = useState("");
  const [duplicates,setDuplicates] = useState([]);
  const [showDuplicates,setShowDuplicates] = useState(false);
  const saveTimerRef = useRef(null);
  const vantaStateRef = useRef({});
  const pollTimerRef = useRef(null);

  // ── Load from Google Sheets on mount ───────────────────────────────────────
  useEffect(() => {
    loadFromSheets();
  }, []);

  // ── Poll every 30 seconds for changes ──────────────────────────────────────
  useEffect(() => {
    pollTimerRef.current = setInterval(async () => {
      // Silent background refresh — don't show loading screen, just update data
      try {
        const res = await fetch("/api/state");
        const data = await res.json();
        if (!res.ok) return; // fail silently
        if (data.portfolio?.length > 0) setPortfolio(data.portfolio);
        if (data.services?.length > 0)  setServices(data.services);
        if (data.bank?.length > 0)      setBank(data.bank);
        setSyncStatus("synced");
      } catch { /* fail silently — don't disrupt the user */ }
    }, 30000); // every 30 seconds

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const loadFromSheets = async () => {
    setSyncStatus("loading");
    try {
      const res = await fetch("/api/state");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");

      console.log("📊 Sheet debug:", data.debug);
      // Portfolio Overview → dashboard/portfolio state only
      if (data.portfolio?.length > 0) setPortfolio(data.portfolio);
      else setPortfolio([]);
      // Services tab → services state only
      if (data.services?.length > 0) setServices(data.services);
      else setServices([]);
      // Bank tab → bank state only
      if (data.bank?.length > 0) setBank(data.bank);
      else setBank([]);

      if (data.duplicates?.length > 0) {
        setDuplicates(data.duplicates);
        setShowDuplicates(true);
      }

      // Build vantaState ref from loaded data
      vantaStateRef.current = buildVantaState(data.portfolio || INIT_PORTFOLIO);
      setSyncStatus("synced");
    } catch (err) {
      console.error("Load error:", err.message);
      setSyncError(err.message);
      setSyncStatus("error");
      // Fall back to defaults so app still works
      setPortfolio(INIT_PORTFOLIO);
      setServices(INIT_SERVICES);
      setBank(INIT_BANK);
    }
  };

  // ── Debounced save to _vanta_state tab ─────────────────────────────────────
  // We never write back to the original sheet tabs (structured tables block it).
  // Sheet → Vanta is read-only. All Vanta changes go to _vanta_state only.
  const scheduleSave = useCallback((updatedPortfolio) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSyncStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        const vs = {};
        updatedPortfolio.forEach(p => {
          vs[p.name] = {
            rag: p.rag, ragDriver: p.ragDriver,
            assessmentStatus: p.assessmentStatus, assessmentScore: p.assessmentScore,
            burnRate: p.burnRate, revenueMTD: p.revenueMTD,
            source: p.source, daysInStage: p.daysInStage,
            // Also store any Vanta-side edits to structural fields
            stage: p.stage, lead: p.lead, phase: p.phase,
            milestones: p.milestones, nextStep: p.nextStep,
            rating: p.rating, capitalDeployed: p.capitalDeployed,
          };
        });
        vantaStateRef.current = vs;
        const res = await fetch("/api/state", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "saveVantaState", vantaState: vs }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
        setSyncStatus("synced");
      } catch (err) {
        console.error("Save error:", err.message);
        setSyncStatus("error");
        setSyncError(err.message);
      }
    }, 1200);
  }, []);

  useEffect(()=>{ LS.set("vanta3_decisions",decisions); },[decisions]);
  useEffect(()=>{ LS.set("vanta3_actions",actions); },[actions]);
  useEffect(()=>{ LS.set("vanta3_investors",investors); },[investors]);
  useEffect(()=>{ LS.set("vanta3_engagements",engagements); },[engagements]);
  useEffect(()=>{ LS.set("vanta3_fundraising",fundraising); },[fundraising]);
  useEffect(()=>{ LS.set("vanta3_audit",auditLog.slice(-200)); },[auditLog]);

  const verifyPin=()=>{ if (pin===ADMIN_PIN){setIsAdmin(true);setShowPin(false);setPin("");setPinErr("");}else{setPinErr("Incorrect PIN.");setPin("");} };

  const handleUpdateIdea=useCallback((id,changes,field,oldVal,newVal)=>{
    setPortfolio(prev=>{
      const updated = prev.map(p=>p.id===id?{...p,...changes}:p);
      scheduleSave(updated);
      return updated;
    });
    setSelectedIdea(prev=>prev&&prev.id===id?{...prev,...changes}:prev);
    if (field){ const entry={...newAudit(field,oldVal,newVal,id)}; setAuditLog(prev=>[...prev,entry]); }
  },[scheduleSave]);

  const handleAddIdea=useCallback((idea)=>{
    setPortfolio(prev=>{
      const exists=prev.find(p=>p.name.toLowerCase().trim()===idea.name.toLowerCase().trim());
      if (exists){ setDuplicates([idea.name]); setShowDuplicates(true); return prev; }
      const updated=[idea,...prev];
      scheduleSave(updated);
      return updated;
    });
    setView("repository"); setSelectedIdea(null);
  },[scheduleSave]);

  const handleRevive=useCallback((b)=>{handleAddIdea({id:"rev_"+b.id,name:b.name,fullName:b.name,origination:"Trium",inceptionYear:new Date().getFullYear(),lead:"—",stage:"Idea",phase:"Awaiting Review",rating:null,capitalDeployed:0,sector:b.sector,description:b.description,milestones:"Revived from Idea Bank",nextStep:"Assess and validate",source:"internal",rag:"Amber",burnRate:null,runway:null,revenueMTD:null,assessmentStatus:"not_assessed",assessmentScore:null});},[handleAddIdea]);

  const handleHideItem=useCallback(async(item)=>{
    setPortfolio(prev=>prev.filter(p=>p.id!==item.id));
    setSelectedIdea(null);
    try {
      await fetch("/api/state",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"hideItem",item})});
    } catch(e){console.error("Hide error:",e.message);}
  },[]);

  const handleMoveToDashboard=useCallback(async(item)=>{
    // Add to portfolio, remove from bank
    const newItem={...item,id:"moved_"+Date.now(),source:"internal",rag:"Amber",assessmentStatus:"not_assessed",assessmentScore:null};
    setPortfolio(prev=>[newItem,...prev]);
    setBank(prev=>prev.filter(p=>p.id!==item.id));
    try {
      await fetch("/api/state",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"moveItem",fromTab:"bank",toTab:"portfolio",item})});
    } catch(e){console.error("Move error:",e.message);}
    setView("dashboard"); setSelectedIdea(null);
  },[]);

  const handleMoveToBank=useCallback(async(item)=>{
    // Add to bank, remove from portfolio
    setBank(prev=>[item,...prev]);
    setPortfolio(prev=>prev.filter(p=>p.id!==item.id));
    setSelectedIdea(null);
    try {
      await fetch("/api/state",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"moveItem",fromTab:"portfolio",toTab:"bank",item})});
    } catch(e){console.error("Move to bank error:",e.message);}
    setView("bank_view");
  },[]);

  const overdue=actions.filter(a=>isOverdue(a.dueDate)&&a.status!=="Closed").length;
  const pending=decisions.filter(d=>d.status==="Pending").length;
  const riskCount=portfolio.filter(p=>p.rag==="Red"||p.daysInStage>180).length+overdue;
  const awaitingCount=portfolio.filter(p=>p.assessmentStatus==="awaiting").length;

  if (syncStatus==="loading") return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:16,background:"var(--bg)"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,fontWeight:400}}>Vanta</div>
      <div style={{fontSize:13,color:"var(--textMuted)"}}>Loading portfolio from Google Sheets…</div>
      <div style={{width:200,height:3,background:"var(--cardBorder)",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:"60%",background:"var(--accent)",borderRadius:2,animation:"none"}}/>
      </div>
      <div style={{fontSize:11,color:"var(--textDim)"}}>Connecting to Vanta Portfolio Data</div>
    </div>
  );

  if (mprOpen) return <MPRView portfolio={portfolio} decisions={decisions} actions={actions} isAdmin={isAdmin} onExitMPR={()=>setMprOpen(false)}/>;

  const syncIndicator = () => {
    const now = new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
    if (syncStatus==="saving") return <div style={{fontSize:11,color:"var(--gold)",display:"flex",alignItems:"center",gap:4,padding:"4px 0"}}>● Saving…</div>;
    if (syncStatus==="synced") return <div style={{fontSize:11,color:"var(--teal)",display:"flex",alignItems:"center",gap:4,padding:"4px 0"}}>✓ Live · syncs every 30s</div>;
    if (syncStatus==="error")  return <div style={{fontSize:11,color:"var(--red)",display:"flex",alignItems:"center",gap:4,padding:"4px 0"}} title={syncError}>✕ Sync error</div>;
    return null;
  };

  const navItem=(id,icon,label)=>{
    if (id.startsWith("div")) return <div key={id} style={{padding:"8px 18px 2px",fontSize:10,fontWeight:700,color:"var(--textDim)",letterSpacing:"1px",textTransform:"uppercase"}}>{label}</div>;
    const active=(view===id||( id==="bank_view" && view==="bank_view"))&&!selectedIdea;
    return <button key={id} onClick={()=>{if(id==="mpr"){setMprOpen(true);return;}setView(id);setSelectedIdea(null);}}
      style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 18px",width:"100%",background:"transparent",border:"none",borderLeft:active?"3px solid var(--accent)":"3px solid transparent",color:active?"var(--accent)":"var(--textMuted)",fontSize:13,fontWeight:active?700:400,cursor:"pointer",textAlign:"left",gap:8}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:14,opacity:0.7}}>{icon}</span>{label}</div>
      {id==="decisions"&&(pending+overdue)>0&&<span style={{background:"var(--redBg)",color:"var(--red)",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20}}>{pending+overdue}</span>}
      {id==="risk"&&riskCount>0&&<span style={{background:"var(--redBg)",color:"var(--red)",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20}}>{riskCount}</span>}
      {id==="intake"&&awaitingCount>0&&<span style={{background:"var(--goldBg)",color:"var(--gold)",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20}}>{awaitingCount}</span>}
      {id==="bank_view"&&awaitingCount>0&&<span style={{background:"var(--purpleBg)",color:"var(--purple)",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20}}>{bank.length}</span>}
      {id==="engagements"&&engagements.filter(e=>e.status==="Pending").length>0&&<span style={{background:"var(--goldBg)",color:"var(--gold)",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20}}>{engagements.filter(e=>e.status==="Pending").length}</span>}
      {id==="fundraising"&&fundraising.filter(f=>f.status==="Active").length>0&&<span style={{background:"var(--accentBg)",color:"var(--accent)",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20}}>{fundraising.filter(f=>f.status==="Active").length}</span>}
      {id==="mpr"&&<span style={{background:"var(--accentBg)",color:"var(--accent)",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20}}>PRESENT</span>}
    </button>;
  };

  const renderView=()=>{
    if (selectedIdea) return <InitiativeProfile idea={selectedIdea} dark={dark} isAdmin={isAdmin} onBack={()=>setSelectedIdea(null)} onUpdate={handleUpdateIdea} onHide={handleHideItem} onMoveToBank={handleMoveToBank} auditLog={auditLog}/>;
    switch(view){
      case "dashboard":   return <Dashboard portfolio={portfolio} dark={dark} decisions={decisions} actions={actions} onSelectIdea={setSelectedIdea} onNav={v=>{setView(v);setSelectedIdea(null);}} onImport={d=>{if(d.portfolio)setPortfolio(d.portfolio);}}/>;
      case "bank_view":   return <BankView bank={bank} isAdmin={isAdmin} onMoveToDashboard={handleMoveToDashboard} onImport={d=>{if(d.bank)setBank(d.bank);}}/>;
      case "intake":      return <Intake onAdd={handleAddIdea}/>;
      case "financials":  return <FinancialSummary portfolio={portfolio} isAdmin={isAdmin} onUpdate={handleUpdateIdea}/>;
      case "risk":        return <RiskRadar portfolio={portfolio} decisions={decisions} actions={actions}/>;
      case "report":      return <MonthlyReport portfolio={portfolio} decisions={decisions} actions={actions}/>;
      case "ask":         return <AiAsk portfolio={portfolio} decisions={decisions} actions={actions}/>;
      case "decisions":   return <Decisions decisions={decisions} actions={actions} isAdmin={isAdmin} onUpdateDecision={(id,s)=>setDecisions(prev=>prev.map(d=>d.id===id?{...d,status:s}:d))} onUpdateAction={(id,s)=>setActions(prev=>prev.map(a=>a.id===id?{...a,status:s}:a))}/>;
      case "services":    return <ServicesView services={services} dark={dark} isAdmin={isAdmin} onImport={d=>{if(d.services)setServices(d.services);}}/>;
      case "investors":   return <InvestorDB investors={investors} setInvestors={setInvestors} isAdmin={isAdmin}/>;
      case "engagements": return <EngagementTracker engagements={engagements} setEngagements={setEngagements} isAdmin={isAdmin}/>;
      case "fundraising": return <FundraisingPipeline fundraising={fundraising} setFundraising={setFundraising} isAdmin={isAdmin}/>;
      case "crm":         return <CRMView/>;
      default:            return null;
    }
  };

  return <div style={{display:"flex",minHeight:"100vh"}}>
    {showDuplicates&&<DuplicateModal duplicates={duplicates} onClose={()=>setShowDuplicates(false)}/>}
    {/* Sidebar toggle button — always visible */}
    <button onClick={()=>setSidebarOpen(o=>!o)}
      style={{position:"fixed",top:14,left:sidebarOpen?194:10,zIndex:100,background:"var(--card)",border:"1px solid var(--cardBorder)",borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14,color:"var(--textMuted)",transition:"left 0.2s"}}>
      {sidebarOpen?"‹":"›"}
    </button>
    <aside style={{width:sidebarOpen?228:0,minWidth:0,background:"var(--sidebar)",borderRight:sidebarOpen?"1px solid var(--cardBorder)":"none",display:"flex",flexDirection:"column",height:"100vh",position:"fixed",top:0,left:0,zIndex:50,overflow:"hidden",transition:"width 0.2s"}}>
      <div style={{padding:"20px 18px 18px",minWidth:228}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:24,fontWeight:400,letterSpacing:"-0.5px"}}>Vanta</div>
        <div style={{fontSize:11,color:"var(--textMuted)",letterSpacing:"1.5px",textTransform:"uppercase",marginTop:2}}>by Trium · v3</div>
      </div>
      <nav style={{flex:1,overflowY:"auto",minWidth:228}}>{NAV.map(n=>navItem(n.id,n.icon,n.label))}</nav>
      <div style={{padding:"12px 14px",borderTop:"1px solid var(--cardBorder)"}}>
        {syncIndicator()}
        <button onClick={loadFromSheets} style={{...btn(false),width:"100%",marginBottom:6,fontSize:12,padding:"6px",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>↻ Refresh from Sheets</button>
        <button onClick={toggle} style={{...btn(false),width:"100%",marginBottom:8,fontSize:13,padding:"8px",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>{dark?"☀ Light mode":"◐ Dark mode"}</button>
        {!isAdmin?<>
          <button onClick={()=>{setShowPin(p=>!p);setPinErr("");setPin("");}} style={{...btn(false),width:"100%",fontSize:13,padding:"8px"}}>Admin access</button>
          {showPin&&<div style={{marginTop:8}}>
            <input type="password" style={{...IS,fontSize:13,resize:"none",marginBottom:6}} value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&verifyPin()} placeholder="Admin PIN" autoFocus/>
            <button onClick={verifyPin} style={{...btn(true),width:"100%",fontSize:13}}>Sign in</button>
            {pinErr&&<div style={{fontSize:12,color:"var(--red)",marginTop:4}}>{pinErr}</div>}
          </div>}
        </>:<div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,background:"var(--tealBg)",color:"var(--teal)"}}>Admin</span>
          <button onClick={()=>{setIsAdmin(false);setShowPin(false);}} style={{...btn(false),padding:"5px 10px",fontSize:12,flex:1,opacity:0.6}}>Sign out</button>
        </div>}
        <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--cardBorder)"}}>
          <a href={TRIASSESS_URL} target="_blank" rel="noreferrer" style={{fontSize:12,color:"var(--textMuted)",display:"flex",alignItems:"center",gap:4}}>↗ Open TriumAssess</a>
        </div>
      </div>
    </aside>
    <main style={{marginLeft:sidebarOpen?228:0,flex:1,padding:"28px 32px",minHeight:"100vh",maxWidth:"calc(100vw - 228px)"}}>{renderView()}</main>
  </div>;
}

