/* Smart Auditing — SECTOR KNOWLEDGE BASE (owner, 26 Nov 2026):
   "Not only industry knowledge — also auditing knowledge and accounts knowledge and legal compliance
    knowledge related to every sector and industry."
   Three layers, every sector:
     AUDIT_KB  — how to audit it (SIA-led procedures, risks, evidence)
     ACCT_KB   — how the accounts must be kept (AS / Ind AS treatments and checks)
     LEGAL_BASE+ pack.law — what law applies (statutes, licences, filings)
   Plus IND packs: what the business is, docs, risks (seed findings), calendar.
   Loaded before onboard.js. */
S.procs=S.procs||[];

/* ================= LAYER 1 · AUDIT KNOWLEDGE (SIA-led) ================= */
const AUDIT_KB={
rev:{n:'Revenue & cut-off',ref:'SIA 320 · SIA 5 · SIA 6',steps:['Sample sales from day book to invoice, LR and bank receipt','Test cut-off: last 10 days before and after year-end both ways','Agree sales ledger to GSTR-1 for every month','Analytical: sales vs prior year, vs capacity, vs market']},
p2p:{n:'Purchases & payables',ref:'SIA 320 · SIA 5',steps:['Sample purchases to GST invoice and payment','Agree purchase ledger to GSTR-2B; chase unmatched ITC','Age creditors; test MSME 45-day compliance','Search for unrecorded liabilities (post-year invoices)']},
inv:{n:'Inventory & stock',ref:'SIA 5 · CARO 3(ii)',steps:['Observe or re-perform a test count','Agree count sheets to stock ledger and valuation','Test costing method application and consistency','Slow-moving / NRV assessment']},
cash:{n:'Cash & bank',ref:'SIA 320',steps:['Surprise cash count with denominations','BRS: agree every reconciling item to evidence','Cash-limit rules (s.40A(3)) on payments','Petty cash imprest test']},
drs:{n:'Receivables',ref:'SIA 320 · balance confirmation',steps:['Confirm top balances to customers','Age and test provision for doubtful debts','Post-year receipts as existence evidence','Credit-note and discount authorisation test']},
crs:{n:'Payables & creditors',ref:'SIA 320 · MSMED s.15',steps:['Confirm major suppliers','MSME declaration and 45-day payment test','Unrecorded liability search','Debit-note and return test']},
payroll:{n:'Payroll',ref:'SIA 320 · PF/ESI rules',steps:['Joiner-leaver reconciliation to HR records','PF/ESI returns vs payroll registers','Payroll bank transfer vs net pay','Ghost-employee check: same bank/IFSC clusters']},
gsttds:{n:'GST & TDS',ref:'SIA 150 · CGST · Income-tax',steps:['Month-wise: books vs GSTR-1 / 3B / 2B','ITC reversal and apportionment checks','TDS vs 26AS / AIS; interest on late deposit','HSN-wise rate and place-of-supply test']},
ar:{n:'Analytical review',ref:'SIA 6',steps:['Monthly trend pack: sales, purchases, margins, cash','Ratio set: gross margin, current ratio, debtors days','Investigate any month beyond ±15% of run-rate','Journals and one-off items isolated from operations']},
gov:{n:'Governance & related parties',ref:'SIA 260 · s.188 · CARO',steps:['Related-party list vs books and vs ROC filings','Board approval for s.188 transactions','Going-concern and litigation scan','Fraud-risk brainstorm with those charged with governance']},
stat:{n:'Statutory & regulatory',ref:'SIA 150 · s.44AB',steps:['Due-date calendar: every filing with proof','Penalty / prosecution exposure list','Licence validity walk-through','Tax-audit report readiness (Form 3CA/3CB)']},
prod:{n:'Production & cost',ref:'SIA 320 · CAS',steps:['BOM vs actual consumption variance','Job-work ITC-04 goods received back','WIP cut-off and valuation','Wastage and rework analysis']},
sites:{n:'Contracts & sites',ref:'SIA 320 · ICAI guidance',steps:['Contract to measurement to bill chain','Retention money ageing','Sub-contract TDS and MSMED','Site cash and material issue books']},
revenue_cut:{n:'Subscription / deferred revenue',ref:'Ind AS 115 · AS 9',steps:['Deferred revenue roll-forward','Contract-level revenue test','Unbilled vs billed reconciliation']},
loanbook:{n:'Loan book & interest',ref:'RBI directions · SIA 320',steps:['Interest accrual vs collection ageing','NPA classification and provision test','KYC and sanction file test','Reconciliation of principal vs interest split']},
reg_lic:{n:'Licences & consents',ref:'SIA 150',steps:['Every licence with expiry date on one sheet','Renewal status for each','Inspection / notice file review']},
labour:{n:'Labour & wages',ref:'Factories · Contract Labour · PF',steps:['Attendance to payroll to bank chain','Contract-labour licence and muster roll','Overtime and incentive approval test','PF ECR vs payroll']},
esg:{n:'Environment & safety',ref:'Environment Act · EHS rules',steps:['Consents to operate and renewals','Hazardous waste manifest vs disposal records','Incident / spill log vs insurance claims']},
stock_confirm:{n:'Stock confirmation & godown',ref:'SIA 5',steps:['Godown-wise stock statement','Third-party godown confirmation','Movement test: GRN to put-away to sale']}
};

/* ================= LAYER 2 · ACCOUNTS KNOWLEDGE (AS / Ind AS) ================= */
const ACCT_KB={
inv:{n:'Inventory valuation',std:'AS 2 · Ind AS 2',treat:'Lower of cost or NRV. Cost = purchase + conversion. Consistency of method (FIFO/weighted average) across years; WIP at stage of completion.',check:'Stock count → valuation sheets → GL. NRV test on slow-moving and expired stock.'},
rev:{n:'Revenue recognition',std:'AS 9 / AS 26 · Ind AS 115',treat:'Recognise when control transfers — for goods on delivery, for services over time as performance obligations are satisfied. Never on mere receipt of cash.',check:'Contract/invoice → delivery or acceptance evidence → ledger. Deferred revenue schedule for advances.'},
rebate:{n:'Trade receivables & credit notes',std:'AS 26 · Ind AS 109',treat:'Expected credit loss provision on receivables. Credit notes only against valid returns or rate differences.',check:'Debtors ageing → provision matrix → credit-note authorisation trail.'},
land:{n:'Property, plant & equipment',std:'AS 10 · Ind AS 16',treat:'Cost model; component depreciation; useful lives reviewed annually; capitalise only direct costs of bringing asset to working condition.',check:'Asset register vs physical tags vs GL; impairment indicators on idle assets.'},
lease:{n:'Leases',std:'AS 19 · Ind AS 116',treat:'Lessee: right-of-use asset + lease liability (finance and operating both on balance sheet under Ind AS). Lessor: classify by transfer of control.',check:'Lease register → contracts → ROU asset and liability schedules.'},
borrow:{n:'Borrowings & interest',std:'AS 16 · Ind AS 23',treat:'Borrowing cost capitalised only for qualifying assets (inventory that takes long to produce, construction in progress). Others expensed as incurred.',check:'Loan agreements → interest computation → capitalisation vs expense split.'},
impair:{n:'Impairment of assets',std:'AS 28 · Ind AS 36',treat:'Carrying amount > recoverable amount → impairment loss immediately in P&L (or revalued asset in OCI).',check:'Cash-generating unit tests on idle plants, slow-moving stock, advances to related parties.'},
consol:{n:'Consolidation & related parties',std:'Ind AS 110 · Ind AS 24 · AS 21',treat:'Eliminate intra-group balances, sales, and unrealised profit. Disclose all related-party relationships and transactions at arm\u2019s length.',check:'Inter-company matrix → elimination entries → disclosure schedule for s.188 and Ind AS 24.'},
tax:{n:'Deferred tax',std:'AS 22 · Ind AS 12',treat:'Recognise DTA on deductible temporary differences (provisions, depreciation differences) when recovery is probable; DTL on taxable differences.',check:'Deferred tax computation vs book vs taxable profit reconciliation.'},
provision:{n:'Provisions & contingent liabilities',std:'AS 29 · Ind AS 37',treat:'Recognise only when present obligation, probable outflow, reliable estimate. Contingent liabilities disclosed, not provided.',check:'Legal opinion file → provision working → disclosure list.'},
lease_income:{n:'Interest income on loans',std:'AS 9 · Ind AS 109',treat:'Effective interest method; recognise on time proportion / amortised cost, not on cash receipt alone.',check:'Loan-wise interest schedule vs cash received vs GL income.'},
stock_sub:{n:'Stock-subscription / deposits taken',std:'AS 26 · Ind AS 37',treat:'Deposits are a liability until earned or refundable; penal interest is income only when charged and not uncertain.',check:'Deposit register vs repayment schedule vs GL.'},
wip:{n:'Work-in-progress & contract WIP',std:'AS 7 · Ind AS 115',treat:'Stage-of-completion method on contracts; recognise cost plus margin to date against total contract cost.',check:'Cost-to-cost work-in-progress sheet vs billed vs received.'},
payroll_acc:{n:'Payroll accounting',std:'AS 5 · Ind AS 19',treat:'Expense in period services are rendered; statutory dues are liabilities on the date they fall due (not on payment date).',check:'Payroll register vs GL vs PF/ESI challans vs TDS deposit dates.'},
grant:{n:'Government grants',std:'AS 12 · Ind AS 20',treat:'Recognise as income on reasonable assurance of compliance and receipt; capital grants reduce asset cost or spread over useful life.',check:'Grant sanction letters → conditions met → recognition pattern.'},
fair:{n:'Financial instruments',std:'AS 30-32 · Ind AS 107/109',treat:'Classify, measure (amortised cost / FVTPL / FVOCI) and derecognise per business model and cash-flow characteristics.',check:'Instrument inventory → classification memo → fair value / amortised cost schedules.'}
};

/* ================= LAYER 3 · LEGAL BASE (applies to every client) ================= */
const LEGAL_BASE=[
['Companies Act 2013 (if a company)','Incorporation, MOA/AOA, Board and shareholder approvals, s.188 related-party rules, CARO in the audit report, annual filing with ROC (AOC-4 / MGT-7).'],
['Income-tax Act 1961','Books of account s.44AA, tax audit s.44AB where turnover crosses limits, TDS chapters, cash-payment limits s.40A(3), advance tax, ITR filing.'],
['GST Act 2017 (if registered)','Registration, monthly/quarterly returns, e-invoicing thresholds, ITC rules, e-way bill, annual return GSTR-9, reverse charge where applicable.'],
['MSMED Act 2006','Pay micro and small suppliers within 45 days with interest; declare MSME status annually.'],
['Indian Contract Act / Limitation Act','Contract terms enforceable; debt recovery within the limitation period (3 years for simple contracts).']
];

/* ================= SECTOR PACKS ================= */
/* audit:[AUDIT_KB keys]  acct:[ACCT_KB keys]  law:[[statute, what]]  controls:[key control statements] */
const IND={
trading:{n:'Wholesale / distribution trading',
  d:/\bwholesale|distributor|distribution|dealer|bulk|b2b|truck|lorry|freight inward|godown|warehouse\b/i,
  plain:'Buys in bulk from manufacturers or importers, holds stock in a godown, and sells to retailers or other businesses on credit with bill-wise tracking. Margin is thin, so every rupee of freight, damage and bad debt counts.',
  audit:['p2p','drs','crs','inv','gsttds','ar'],
  acct:['inv','rev','rebate','borrow'],
  controls:['Sales only against system invoice + LR','Purchase price change needs approval','Godown stock statement monthly','Credit limit per customer enforced in system'],
  docs:[['Stock register / bin cards with inward-outward','Proves what was bought, sold and what is left.'],['Dealer or distributor agreements','Shows the terms on which goods move.'],['Rate lists and discount approvals','Sales below list price must be authorised.'],['Transport / LR (lorry receipt) records','Goods leave only against an LR — the bridge between sale and delivery.']],
  law:[['GST: GSTR-1 vs sales, GSTR-2B vs purchases','Every dealer reconciles output tax and input credit monthly.'],['MSMED Act: pay small suppliers in 45 days','Interest + expense disallowance if late.'],['Cash payment limits (₹10,000 / 35% rule)','Bulk cash to suppliers is a tax problem.'],['Sale of Goods Act: delivery, warranty, transfer of title','Which bill transfers ownership decides when revenue may be booked.'],['Motor Vehicles Act / e-way bill for movement','Goods in transit need document trail.']],
  risks:[['M','Credit sales with no ageing discipline','Debtors grow silently in wholesale. Old dues become bad debts after the limitation period.','o2c'],['M','Purchase returns and credit notes not matching GSTR-1','Return outward must reduce output tax the same month.','gsttds'],['L','Freight and cartage booked without LR support','Freight is a classic siphoning ledger — vouch to LRs.','vouch']],
  cal:[['quarterly','Debtor / creditor ageing review and dunning','SIA 320'],['half','Balance confirmations — dealers and suppliers','Half-year close'],['monthly','Stock statement vs godown count','Stock accuracy']]},

retail:{n:'Retail (shops, showrooms, chains)',
  d:/\bretail|showroom|super ?market|grocery|kirana|counter sale|pos|mrp|shop sale|billing counter|cash memo/i,
  plain:'Sells over the counter or online for cash, UPI, card or credit. Stock moves fast at many small tickets; the risk is in the cash box, the discount button and the night-off cash not reaching the bank.',
  audit:['cash','inv','rev','gsttds','ar','payroll'],
  acct:['rev','inv','rebate','land'],
  controls:['Daily POS total agreed to cash + bank before next day opens','Discount % capped by role; free items need manager PIN','Night-deposit slip matched to POS within 2 days','Stock count weekly at high-shrink categories'],
  docs:[['POS / billing day-end reports','Every bill printed by the system must reach the books.'],['Cash book and surprise count sheets','Cash is the number one leak in retail.'],['Discount and return policy with approvals','Who may give 20% off? Written policy.'],['Shop and establishment licence + fire NOC','Basic retail licences.'],['Card / UPI settlement reports from the bank','Swipes are not money until the bank credits them.']],
  law:[['GST: intra-state retail vs e-commerce supplies','Place of supply rules differ for counter vs online.'],['Cash payment limits and 35% cash receipts rule','Retail is cash-heavy — stay inside the limits.'],['Shop & Establishment Act registration','State licence for every outlet.'],['Legal metrology (MRP) compliance','Overcharge above MRP is a penalty.'],['Consumer Protection Act: returns and grievance','Defective goods and unfair trade practice exposure.']],
  risks:[['H','Cash not deposited / not recorded','The classic retail leak: bills skipped or cash kept back. Count cash daily against POS.','cash'],['M','Discounts and free items without approval','Margin erosion that never shows as theft.','o2c'],['M','E-commerce sales not in GSTR-1','Portal sales are auto-visible; missing them are a red flag.','gsttds']],
  cal:[['monthly','Daily cash vs POS vs bank — month close','Cash control'],['monthly','Surprise cash count at one outlet','SIA 320'],['quarterly','Stock count at high-value outlets','Stock'],['half','Card / UPI settlement reconciliation','Bank']]},

chemical_import:{n:'Import of chemicals / industrial materials',
  d:/\bchemical|solvent|acid|reagent|industrial chemical|import|customs|bill of entry|hsn 2[89]|hsn 3[0-8]|dgft|end.?user|hazard/i,
  plain:'Imports chemicals by sea or air: customs clearance, bill of entry, GST on imports, quality checks on arrival, then sells to manufacturers or labs. One shipment can carry duty, safety and environmental exposure at once.',
  audit:['stat','p2p','inv','gsttds','esg','ar'],
  acct:['inv','land','borrow','impair'],
  controls:['Every BoE reconciled to duty challan and GR within 7 days','Controlled substances: licence checked before PO raised','QC reject note raised same day as lab report','CIF components capitalised into landed cost automatically'],
  docs:[['Import licence / DGFT authorisation','Some chemicals cannot be imported without an end-user or DGFT permission.'],['Bill of entry, customs duty challans, shipping documents','Duty paid must agree with the books and the return.'],['MSDS / safety data sheets for each chemical','Safety and storage compliance; also proves what was actually imported.'],['Quality / QC test reports on arrival','Rejection or short quantity must be booked the day it is found.'],['Importer-exporter code (IEC)','No import without IEC.'],['Storage and hazardous-waste authorisation','Pollution-control board consent for storage / disposal.']],
  law:[['Customs Act: duty, BoE, baggage and warehousing rules','Duty paid must match the BoE and the imported quantity.'],['DGFT / FTP restrictions and end-use certificates','Controlled chemicals need authorisation before shipment.'],['Environment (Protection) Act + hazardous waste rules','Storage, spill and disposal obligations.'],['GST on imports (IGST) claimed as ITC','Claim only against a valid bill of entry.'],['Rules of origin / FTA claims if claiming concession','Incorrect origin claim = duty demand with penalty.'],['Poisons / Insecticides Acts where applicable','Extra licence for scheduled chemicals.']],
  risks:[['H','Customs duty in the books not matching bill of entry','Duty is a big number; a mismatch is either a loss or a demand.','stat'],['H','Controlled chemical imported without valid authorisation','Can be seizure + penalty. Verify DGFT licence before accepting the entry.','stat'],['M','QC rejects not booked as purchase returns','Stock and GST both stay wrong.','inv'],['M','Freight and insurance (CIF) not capitalised into cost','Landed cost wrong → margin and stock valuation wrong.','fin']],
  cal:[['monthly','Import duty and IGST vs bill of entry','Customs/GST'],['quarterly','DGFT licence validity and end-use compliance','Regulatory'],['half','Hazardous storage and waste-disposal records','Environment'],['annual','IEC, licences and consents renewal calendar','Licences']]},

manufacturing:{n:'Manufacturing',
  d:/\bmanufactur|factory|production|raw material|consumption|wip|finished goods|job work|plant\b|assembly|machinery/i,
  plain:'Buys raw material, converts it on the floor (or gets job-work done), and sells finished goods. The money lives in stock and in consumption: what was issued, what was made, what was wasted, what is left.',
  audit:['inv','prod','p2p','payroll','ar','stat'],
  acct:['inv','wip','land','impair','tax'],
  controls:['BOM issue only against production order','Job-work challan both ways (ITC-04)','Consumption variance > 5% investigated monthly','Asset tagging with annual physical verification'],
  docs:[['Bill of materials and standard rates','The baseline for consumption variance.'],['Production registers / job-work challans (ITC-04)','Goods sent out for processing must come back or be explained.'],['Stock ledger with raw material, WIP, finished goods','Three-way split is mandatory for CARO.'],['Physical verification reports (last + current)','CARO 3(ii).'],['Maintenance and breakdown logs','Supports capacity and idle-asset questions.']],
  law:[['CARO 3(ii): physical verification of stock','Statutory auditor must comment; internal audit prepares it.'],['GST: job work (ITC-04) and input credit on raw material','Unreturned job-work goods become a demand.'],['Factories Act: licence, safety, overtime records','Labour inspection exposure.'],['Pollution-control board consent to operate','Renewable; lapse = stop-work risk.'],['Contract Labour Act if manpower is supplied','Principal employer obligations.'],['IS 14001 / BIS certification if claimed','Only if the certificate is used in marketing.']],
  risks:[['H','Consumption way above BOM without explanation','Theft, waste or mis-posting — find it in the variance report.','inv'],['M','Job-work goods sent but not received back','ITC-04 mismatch → GST demand.','inv'],['M','WIP not valued at cut-off','Profit shifts between years.','fin']],
  cal:[['monthly','Consumption vs BAM variance review','Production'],['monthly','WIP and finished-goods count at month-end','Stock'],['half','Physical stock verification (test counts)','CARO'],['annual','Idle and slow-moving asset review','Assets']]},

textile:{n:'Textile / garments',
  d:/\btextile|yarn|fabric|garment|knitting|dyeing|weaving|saree|apparel|garments/i,
  plain:'Buys yarn or fabric, processes it (knitting, weaving, dyeing, stitching) — often partly through job workers — and sells fabric or garments. Colour, lot and metreage decide the money.',
  audit:['inv','prod','payroll','p2p','ar'],
  acct:['inv','wip','rebate','rev'],
  controls:['Lot number on every inward and outward movement','Job-worker register with challan both ways','Piece-rate muster approved daily','Shade-variation rejects booked same day'],
  docs:[['Lot / batch wise stock register','Colour and lot mixing is the classic inventory error.'],['Job-worker registers and challans','Dyeing and stitching usually go out.'],['Piece-rate and production incentives records','Payroll risk in garments.']],
  law:[['GST on job work and fabric supplies','Rate differences between fabric and garments.'],['Textile committee / quality marks if claimed','Only if the mark is used.'],['Contract labour / PF for job-worker units','If workers are actually yours, PF applies.'],['Legal metrology on packaged textile (length / weight)','Net quantity declarations.']],
  risks:[['M','Dyeing / processing charges not matched to lot received','Cost per lot cannot be verified → margin unknown.','inv'],['M','Cutting waste and rejection not recorded','Waste is where margin disappears.','prod']],
  cal:[['monthly','Lot-wise consumption and rejection review','Production'],['half','Physical stock by lot and shade','Stock']]},

pharma:{n:'Pharmacy / drugs distribution',
  d:/\bpharma|drug|medicine|batch no|expiry|pharmaceutical|medical store|schedule h|nds\b|drug licence/i,
  plain:'Buys medicines by batch, sells them before expiry, and must keep a chain of custody that a drug inspector can follow: licence, batch, expiry, scheduled-drug register.',
  audit:['stat','inv','rev','gsttds','gov'],
  acct:['inv','rev','rebate','provision'],
  controls:['Expiry block in billing system at 90 days','Schedule H register signed daily','Batch trace from purchase invoice to retail sale','Drug licence expiry tracker with auto-alert'],
  docs:[['Drug licence (Form 20B / 21B)','No licence, no business — verify validity.'],['Batch and expiry register with sale returns','Expired stock sold is a criminal issue.'],['Schedule H / H1 / X register','Controlled drugs need a separate register.'],['Cold-chain records if vaccines / insulin','Temperature logs.']],
  law:[['Drugs and Cosmetics Act: licence and batch records','Inspector can walk in any day.'],['GST on medicines + rate on notified drugs','Rate errors are common.'],['NDPS / Schedule H register','Controlled substances.'],['Drugs and Cosmetics Rules: retention of records','Records must be available for inspection periods.']],
  risks:[['H','Expired stock still shown as saleable','Health risk + fraud risk.','inv'],['M','Schedule H drugs sold without prescription record','Regulatory penalty.','stat']],
  cal:[['monthly','Expiry review — stock expiring in 90 days','Stock'],['quarterly','Schedule H register vs sales','Drugs Act'],['annual','Drug licence renewal calendar','Licences']]},

food:{n:'Food business (manufacture / catering / QSR)',
  d:/\bfood|fssai|catering|restaurant|bakery|dairy|edible|cooking|tandoor|kitchen\b/i,
  plain:'Makes or serves food: raw material in, finished plates or packs out. Perishables spoil, FSSAI controls what may be sold, and every batch needs a trace back to the raw lot.',
  audit:['inv','stat','cash','payroll','ar'],
  acct:['inv','rev','wip','provision'],
  controls:['Daily wastage sheet signed by kitchen head','FSSAI licence expiry on the compliance board','Raw lot trace: purchase GRN → prep → sale','Cold-chain temperature log twice daily'],
  docs:[['FSSAI licence (central or state)','Valid licence is the entry ticket.'],['Batch / kitchen production register','Traceability when something goes wrong.'],['Wastage and spoilage register','Perishable loss must be visible.']],
  law:[['FSSAI Act: licence, labelling, hygiene','Annual renewal + inspections.'],['GST on restaurant / takeaway rates','18% with ITC vs 5% without — pick and stick.'],['Municipal trade licence and fire NOC','Local body requirements.'],['Packaged food labelling rules if packed','Nutrition and MDP declarations.']],
  risks:[['M','Wastage not recorded → raw material theft hidden as spoilage','Compare issue vs sale vs wastage.','inv'],['M','FSSAI licence expired during the year','Can stop the business.','stat']],
  cal:[['monthly','Wastage vs production reconciliation','Food cost'],['annual','FSSAI and municipal licence renewal','Licences']]},

construction:{n:'Construction / contract work',
  d:/\bconstruction|civil work|bill of quantities|\bboq\b|contract work|site account|running bill|measurement book|project site/i,
  plain:'Wins contracts, bills against measurements, and spends on material and labour at sites. Cash at site, unmeasured work and retention money are where the numbers slip.',
  audit:['sites','cash','p2p','drs','payroll','stat'],
  acct:['wip','rev','borrow','provision','rebate'],
  controls:['No bill raised without MB measurement sign-off','Site cash imprest with weekly replenishment','Sub-contract TDS checked before payment release','Retention money ledger per contract'],
  docs:[['Contract agreement and BOQ','The price list for every bill.'],['Measurement books and running bills','What was actually measured.'],['Site wise material issue registers','Material cannot vanish without an entry.']],
  law:[['GST on works contracts (18%) and TDS u/s 194C','Contractor payments need TDS.'],['MSMED: pay sub-contractors in 45 days','Applies to covered sub-contractors.'],['Contract Labour Act if workers are supplied','Principal employer obligations.'],['Real Estate (Regulation) Act if builder activity','RERA registration and escrow for projects.'],['Indian Contracts Act: retention and liquidated damages','Contract terms govern what may be billed.']],
  risks:[['H','Bills raised without measurement support','Overbilling or unrecorded work.','vouch'],['M','Retention money not tracked','Money stuck with clients for years.','o2c']],
  cal:[['monthly','Site material issue vs consumption','Sites'],['quarterly','Retention money and age of running bills','o2c']]},

it_services:{n:'IT / software / professional services',
  d:/\bsoftware|saas|subscription|licen[cs]e fee|professional fee|consulting|subscription income|cloud|hosting|support fee/i,
  plain:'Sells time or subscriptions: little stock, big people cost, revenue recognised over months, and expenses that are mostly salaries, cloud and sub-contractors.',
  audit:['rev','payroll','gsttds','drs','ar','gov'],
  acct:['rev','lease','tax','provision'],
  controls:['Contract approved before revenue scheduled','Deferred revenue maintained contract-wise','Sub-contract TDS checked before payout','Cloud spend approved per project code'],
  docs:[['Contracts / MSAs and SOWs','Defines when revenue may be booked.'],['Timesheets or sprint records for billing','Hours = invoices.'],['Cloud and software subscription invoices','Largest expense after payroll.']],
  law:[['Revenue recognition (AS / Ind AS 115)','Deferred revenue on annual subscriptions.'],['TDS on professional and contract payments','194J / 194C.'],['GST on services + export LUT if zero-rated','Place of supply for cross-border.'],['Companies Act: share-based payments if ESOPs','S.62 and Ind AS 102.']],
  risks:[['M','Annual subscriptions booked fully in month of receipt','Profit timing wrong.','fin'],['M','Sub-contractor payments without TDS','Disallowance risk.','stat']],
  cal:[['quarterly','Deferred revenue roll-forward','Revenue'],['monthly','TDS on professional fees vs 26AS','TDS']]},

finance:{n:'Financial services / lending',
  d:/\bloan|interest income|emi\b|disburs|principal recovery|nbfc|finance charge|processing fee|gold loan|vehicle loan/i,
  plain:'Lends money and earns interest: every rupee of income is an EMI, every risk is a default, and the books must split principal from interest exactly.',
  audit:['loanbook','gov','stat','ar','cash'],
  acct:['lease_income','stock_sub','fair','provision','tax'],
  controls:['Sanction limit enforced before disbursement','NPA classification reviewed monthly by committee','Interest booking system-generated from schedule','Deposit repayment reserve maintained per RBI'],
  docs:[['Loan ledger party-wise with principal-interest split','The core record.'],['Sanction letters and KYC files','Proves the loan was legal.'],['Repayment schedules and prepayment records','EMI vs actual.']],
  law:[['RBI directions on NBFC accounting and classification','NPA norms.'],['TDS on interest paid to depositors','194A.'],['GST on processing fees and penal interest','Rate clarity.'],['Companies Act: financial statements schedule for NBFC','Additional disclosures.']],
  risks:[['H','Interest income recognised on accrual but not received','Overstated profit — ageing of interest receivable.','fin'],['M','NPA classification not as per RBI norms','Provision shortfall.','fin']],
  cal:[['monthly','Interest accrual vs collection','Income'],['quarterly','NPA and ageing review','RBI norms']]},

services:{n:'Services (other)',
  d:/\bservice fee|professional fee|retainer|maintenance fee| AMC \b|agency commission|brokerage/i,
  plain:'Sells a service: invoices against milestones or months, costs are people and travel, and the audit focus is whether each invoice has a deliverable behind it.',
  audit:['rev','drs','payroll','gsttds','ar'],
  acct:['rev','provision','tax','lease'],
  controls:['Invoice only after client sign-off on deliverable','Retainer unearned portion deferred','Expense policy with per-diem caps','TDS certificates issued quarterly'],
  docs:[['Engagement letters / work orders','What was promised.'],['Deliverable sign-offs','What was actually delivered.']],
  law:[['TDS on professional fees','194J.'],['GST on services','Rate by service type.'],['Contract Act: scope and termination clauses','Determines when billing is due.']],
  risks:[['M','Invoices without deliverable evidence','Revenue may not be real.','o2c']],
  cal:[['quarterly','Unbilled work and deferred income review','Revenue']]},

agriculture:{n:'Agriculture / agri produce',
  d:/\bagri|farm|crop|harvest|mandi|fertilis|pesticide|dairy procurement|procurement centre|godown of crop/i,
  plain:'Buys produce from farmers or grows it, stores it, and sells to processors, mandis or exporters. Seasonal cash, MSP rules, quality discounts and storage losses decide the result.',
  audit:['cash','inv','p2p','stat','ar'],
  acct:['inv','rev','grant','provision'],
  controls:['Procurement challan with farmer name and rate','Quality deduction sheet signed at gate','Godown moisture / loss record monthly','MSP claims matched to actual purchases'],
  docs:[['Farmer procurement register with rates','Cash paid to farmers must be traceable.'],['Quality / moisture deduction sheets','Price deductions must be documented.'],['Storage and godown records','Loss and reconditioning evidence.']],
  law:[['APMC / state marketing committee rules','Procurement and sale channels.'],['Essential Commodities Act stock limits','Where applicable.'],['GST on agricultural produce (often exempt)','Input credit reversals and composition checks.'],['Cash payments to farmers — s.44AD / 40A(3) exceptions','Verify the exception used.']],
  risks:[['H','Cash paid to farmers without procurement challan','Income-tax and fraud exposure.','cash'],['M','Storage losses not booked','Shrinkage hides as margin.','inv']],
  cal:[['monthly','Procurement vs sales vs godown stock','Season'],['quarterly','Farmer dues ageing (if credit procurement)','o2c']]},

education:{n:'Education / training institutions',
  d:/\bschool|college|tuition|institut|student fee|admission|course fee|exam fee| hostel/i,
  plain:'Collects fees from students (often term-wise), spends on faculty and campus, and is governed by fee regulation, grants and NGO-style disclosures if it is a trust or society.',
  audit:['cash','gov','payroll','stat','ar'],
  acct:['rev','provision','grant','land'],
  controls:['Fee receipt series controlled and reconciled daily','Scholarship and waiver approvals on file','Faculty payroll tied to attendance','Capex from grants tracked project-wise'],
  docs:[['Trust / society registration and recognition','Legal existence of the institution.'],['Fee structure approval order','Which fees may be charged.'],['Student-wise fee ledger','Arrears and scholarships.']],
  law:[['State fee regulation / RTI Act (if aided)','Fee fixation and transparency.'],['GST on coaching / higher education exemptions','Only notified courses are exempt.'],['Income-tax: charitable trust registration and 12A/80G','If a non-profit.'],['Fees Act of the state for schools','Penalty for overcharge.']],
  risks:[['M','Fee receipts not fully banked','Cash retention at counter.','cash'],['M','Grants used outside sanctioned purpose','Donor and statutory breach.','stat']],
  cal:[['monthly','Fee collection vs banked vs arrears','Fees'],['annual','Recognition / affiliation renewal','Licences']]},

healthcare:{n:'Hospital / healthcare',
  d:/\bhospital|clinic|patient|pharmacy inside|pathology|diagnostic|nursing home|opd|ipd|medical bill/i,
  plain:'Treats patients, sells medicines and diagnostics, and runs on insurance claims, corporate contracts and cash. The money sits in credit periods of TPA companies and in high-value consumables.',
  audit:['drs','inv','cash','stat','payroll','ar'],
  acct:['rev','inv','rebate','provision','tax'],
  controls:['Consumable issue per patient file','TPA claim status ageing reviewed weekly','Theatre / OT register agreed to billing','Pharmacy inside hospital: separate POS reconciliation'],
  docs:[['Hospital / clinic registration and fire NOC','Licence to operate.'],['TPA and insurance tie-up agreements','Defines claim rates and credit period.'],['Patient-wise billing and consumable issue','Supports revenue and stock.'],['Pathology / radiology calibration records','Quality and legal defence.']],
  law:[['Clinical Establishments Act (where applicable)','Registration and standards.'],['GST on healthcare services (exempt with conditions)','Ambulance, cosmetics, and non-notified services taxed.'],['MCI / nursing council registrations for staff','Professional compliance.'],['PCPNDT Act for diagnostic imaging','Strict licensing for scans.']],
  risks:[['H','Consumables issued but not billed to patient','Direct revenue leak.','o2c'],['M','TPA claims > 180 days old','Working capital and bad debt.','drs']],
  cal:[['monthly','TPA / insurance claim ageing','Receivables'],['quarterly','Consumable stock vs patient issues','Stock']]},

logistics:{n:'Logistics / transport / courier',
  d:/\btransport|logistics|courier|freight|lorry receipt|\blr\b|shipment|clearing house|cha\b|shipping line/i,
  plain:'Moves goods for others: freight income, fuel and vehicle costs, sub-contract carriers, and claims when goods are damaged. Every trip must tie LR → vehicle → delivery → invoice.',
  audit:['rev','cash','p2p','drs','stat','ar'],
  acct:['rev','land','lease','provision','rebate'],
  controls:['LR series controlled; one LR one vehicle','Fuel purchase matched to trip log','Carrier sub-contract invoices matched to delivery proof','Damage claims booked as provision when probable'],
  docs:[['LR / consignment note register','The core revenue document.'],['Vehicle-wise trip and fuel log','Cost per trip verifiable.'],['Carrier sub-contract agreements','Rate and liability terms.']],
  law:[['Motor Vehicles Act: permit, insurance, fitness','Fleet legality.'],['GST on transport services and e-way bill','Place of supply and RCM where applicable.'],['Carriage by Air / Rail / Road liability limits','Claim exposure.']],
  risks:[['H','Freight billed without LR or delivery proof','Revenue may not be enforceable.','vouch'],['M','Fuel purchases not tied to trips','Classic siphoning ledger.','cash']],
  cal:[['monthly','LR vs invoice vs cash reconciliation','Revenue'],['quarterly','Vehicle insurance and permit renewal','Licences']]},

hospitality:{n:'Hotel / hospitality',
  d:/\bhotel|guest house|room rent|restaurant inside|banquet|tour package|travel agent commission/i,
  plain:'Sells rooms and food: high fixed cost, perishable inventory (an unsold room is gone forever), travel-agent commissions, and heavy cash / card settlement flow.',
  audit:['rev','cash','drs','inv','payroll','stat'],
  acct:['rev','land','lease','rebate','provision'],
  controls:['Room-night report agreed to PMS and GL daily','Travel-agent commission only against production','Card settlement T+1 matched','Minibar and laundry issue sheets'],
  docs:[['PMS day-end report and occupancy statistics','Room revenue backbone.'],['Travel-agent / OTA commission agreements','Rate and payout terms.'],['Fire, hotel and health licences','Operating legality.']],
  law:[['Hotel / lodging licence of the state','Renewal cycle.'],['GST on hotel rooms: rate by tariff slab','12% / 18% with or without ITC.'],['Foreign exchange rules for foreign guests','FCY receipts compliance.'],['Food safety and fire NOC','Inspection readiness.']],
  risks:[['H','Room revenue below PMS report','Cash / agent leakage.','cash'],['M','Commissions paid on non-produced business','Margin theft.','o2c']],
  cal:[['daily/weekly','PMS vs GL room revenue','Revenue'],['monthly','Agent commission production match','o2c']]},

realestate:{n:'Real estate / builder',
  d:/\breal estate|builder|flat|apartment|booking amount|sale deed|project cost|construction in progress|cip\b/i,
  plain:'Takes bookings, books advances, incurs project cost, and recognises revenue on completion or possession. Escrow, RERA and project-wise accounts decide what may be spent and shown.',
  audit:['sites','drs','gov','stat','cash','ar'],
  acct:['rev','wip','land','borrow','provision'],
  controls:['Project-wise cost ledger (no free mixing)','RERA escrow account untouched for other projects','Customer advances not revenue until control transfers','Contractor payments against measured work only'],
  docs:[['RERA registration and project approvals','Cannot sell without it.'],['Project cost statements (quarterly)','RERA-mandated disclosure.'],['Sale / booking agreements with customers','Revenue trigger evidence.']],
  law:[['Real Estate (Regulation & Development) Act','Registration, escrow, quarterly updates.'],['GST on under-construction vs ready-to-move','18% with ITC on under-construction; no GST on ready with OC.'],['Stamp duty and registration of sale deeds','State-specific.'],['Income-tax: profit on sale of land / project','s.45 and indexation rules.']],
  risks:[['H','Customer advances booked as revenue early','Profit timing and tax fraud.','fin'],['M','Project funds diverted between projects','RERA breach and going-concern risk.','stat']],
  cal:[['quarterly','Project cost vs RERA statement','RERA'],['monthly','Advances vs collections vs escrow','Cash']]},

energy:{n:'Power / energy / utilities',
  d:/\bpower plant|electricity|energy|transformer|sub.?station|renewable|solar|wind farm|discom|generation\b/i,
  plain:'Generates or distributes power: capex-heavy assets, regulated tariffs, energy accounting (what was generated vs billed vs lost), and government or private offtake contracts.',
  audit:['ar','stat','inv','payroll','gov'],
  acct:['land','impair','borrow','grant','tax'],
  controls:['Energy meter data sealed and reconciled monthly','Of take contract terms applied to billing','Capex projects capitalised only after COD','Regulatory approvals for tariff change'],
  docs:[['Generation / distribution and billing data','Energy accounting backbone.'],['PPA / offtake agreement','Revenue terms.'],['Tariff order and regulatory approvals','Price legality.']],
  law:[['Electricity Act: licence, tariff, open access','Core sector regulation.'],['Environment clearance for generation','Renewals and conditions.'],['GST on power supply (notified rates)','Often exempt / notified.']],
  risks:[['H','Transmission and distribution loss beyond norm','Revenue leakage or data error.','fin'],['M','Capex capitalised before commercial operation','Early depreciation and profit shift.','stat']],
  cal:[['monthly','Energy accounting: generated vs billed vs loss','Operations'],['annual','Tariff and licence renewal','Regulatory']]},

mining:{n:'Mining / quarry / minerals',
  d:/\bmining|quarry|minor mineral|ore\b|mineral|royalty|lease area|overburden|lease of mine/i,
  plain:'Extracts minerals under a lease: royalty, dead rent, dispatch weighbridge data and environmental clearances. The books must agree to what physically left the lease area.',
  audit:['stat','inv','rev','esg','cash','ar'],
  acct:['land','impair','grant','provision','borrow'],
  controls:['Weighbridge data sealed and matched to dispatches','Royalty payment computed on despatch, not invoice alone','Mine plan and environmental conditions tracked','Lease area boundary checked annually'],
  docs:[['Mining lease and amendments','Right to extract.'],['Royalty challans and returns','State dues.'],['Weighbridge / dispatch registers','Physical movement proof.'],['Environmental clearance and mine plan','Regulatory core.']],
  law:[['Mines and Minerals (Development) Act','Lease, royalty, dead rent.'],['State mining rules and minor mineral rules','Permit conditions.'],['Environment (Protection) Act clearances','Stop-work risk.'],['GST on mineral supplies','Rate varies by mineral.']],
  risks:[['H','Royalty underpaid vs despatch data','State demand with interest and penalty.','stat'],['M','Overburden and wastage not accounted','Cost and inventory wrong.','inv']],
  cal:[['monthly','Despatch vs royalty vs payment','Royalty'],['annual','Lease renewal and environmental compliance','Regulatory']]},

auto_dealer:{n:'Automobile dealership',
  d:/\bcar dealer|two wheeler|showroom of vehicle|vehicle sale|workshop|service bay|spare parts|accessories|oem\b/i,
  plain:'Sells vehicles on OEM schemes, earns on spare parts and workshop labour, and carries floor-plan stock funded by the manufacturer. Scheme incentives and free-service accruals decide the margin.',
  audit:['inv','rev','p2p','drs','stat','ar'],
  acct:['inv','rev','rebate','provision','borrow'],
  controls:['Vehicle-wise stock (chassis number) tracked daily','OEM scheme claims filed within cut-off','Floor-plan interest reconciled monthly','Workshop job cards closed to billing within 3 days'],
  docs:[['Vehicle stock register with chassis numbers','One vehicle one record.'],['OEM scheme and incentive letters','Accrual basis for claims.'],['Workshop job cards and spare parts bins','After-sales revenue.']],
  law:[['Motor Vehicles Act: dealer licence, PDI, warranty','Selling legality.'],['GST on vehicles and spare parts','Rate and ITC on demonstration units.'],['Consumer Protection Act warranty service','Defect liability.']],
  risks:[['H','Vehicle stock in books not physically present','Mis-stated inventory and possible fraud.','inv'],['M','OEM incentive claims not accrued in time','Revenue understated or lost.','o2c']],
  cal:[['monthly','Chassis-wise stock vs physical','Stock'],['quarterly','OEM scheme claim ageing','Revenue']]},

fmcg:{n:'FMCG / consumer goods',
  d:/\bfmcg|consumer good|soap|biscuit|beverage|detergent|personal care|distributor of brand|van sales/i,
  plain:'Moves fast through many SKUs and many distributors: schemes, secondary sales, van sales and returns. The gap between primary (company to distributor) and secondary (distributor to shop) is where audit focuses.',
  audit:['rev','inv','drs','p2p','gsttds','ar'],
  acct:['inv','rev','rebate','land'],
  controls:['Scheme accrual computed from secondary sales data','Expiry / near-expiry returns approved','Van sales reconciled to cash and invoices daily','Distributor stock statement monthly'],
  docs:[['Secondary sales data from distributors','True sell-out evidence.'],['Scheme and price list approvals','Accrual basis.'],['Expiry and return policy','Stock rotation proof.']],
  law:[['GST on goods with schemes and freebies','Freebies treated as supply.'],['Legal metrology pack declarations','Net quantity, MRP.'],['Printed price / MRP control','Anti-profiteering under GST.']],
  risks:[['H','Primary sales booked without secondary support','Channel stuffing risk.','o2c'],['M','Scheme accruals wrong or missing','Profit misstatement.','fin']],
  cal:[['monthly','Primary vs secondary vs distributor stock','Sales'],['quarterly','Near-expiry stock review','Stock']]},

insurance:{n:'Insurance / broking',
  d:/\binsurance|premium|policy|claim settled|broker of insurance|tpa|underwriting|reinsur/i,
  plain:'Earns premium, pays claims, and carries unearned premium and claims provisions. Time between intimation, reserve and settlement is where the money moves.',
  audit:['ar','gov','stat','cash','drs'],
  acct:['provision','fair','tax','rev','lease'],
  controls:['Claim reserve set at first notification, reviewed weekly','Premium due ageing by broker and direct','Reinsurance ceded and recovered tracked separately','Commission income only on collected premium'],
  docs:[['Policy register with premium and claims','Core business record.'],['Claim file with reserve and settlement','Provision evidence.'],['IRDAI licence and returns','Regulatory legality.']],
  law:[['IRDAI Act and regulations','Licence, solvency, conduct.'],['Insurance contract terms and indemnity','Claims law.'],['GST on insurance premium (notified)','Rate and reverse charge where applicable.']],
  risks:[['H','Claims reserved too low at year-end','Profit overstated — classic insurance fraud risk.','fin'],['M','Unearned premium released early','Income recognised before period elapsed.','rev']],
  cal:[['monthly','Claim reserve review and paid vs incurred','Claims'],['quarterly','IRDAI return readiness','Regulatory']]},

nonprofit:{n:'Non-profit (trust / society / Sec 8)',
  d:/\btrust|society|section 8|non.?profit|donation|grant received|corpus|ngo\b|charitable/i,
  plain:'Receives donations and grants, spends on objects of the trust, and is answerable to donors, the Registrar and the tax department. Every rupee must sit inside the stated object.',
  audit:['gov','cash','stat','ar','payroll'],
  acct:['grant','rev','provision','land','tax'],
  controls:['Donation receipt series controlled','Corpus kept separate from income','Project-wise utilisation of grants','Annual return filed on time'],
  docs:[['Trust deed / society memorandum','Objects and powers.'],['Donor list with amounts and restrictions','Utilisation tracking.'],['12A / 80G certificates','Tax status.'],['Utilisation certificates for grants','Donor compliance.']],
  law:[['Income-tax s.12 / 11 / 12A / 80G','Exemption conditions and audit u/s 12AB.'],['FCRA if foreign funding','Registration and annual return.'],['Societies / Trusts Act of the state','Governance and registration.'],['Companies Act if Sec 8 company','Additional filings.']],
  risks:[['H','Donations used outside the stated object','Loss of exemption + penalty.','stat'],['M','Corpus spent as revenue','Donor breach and tax demand.','gov']],
  cal:[['annual','12AB / 80G renewal and Form 10B/10BB audit','Tax'],['monthly','Grant utilisation vs sanctioned purpose','Governance']]},

staffing:{n:'Staffing / manpower supply',
  d:/\bstaffing|manpower|labour supply|contract worker|placement|recruitment fee|payroll outsourcing/i,
  plain:'Supplies workers to other companies: invoices for man-days, pays wages, and carries PF/ESI/PT obligations. Principal-employer rules decide who must deduct and deposit.',
  audit:['payroll','drs','cash','stat','gsttds','ar'],
  acct:['rev','payroll_acc','provision','tax','rebate'],
  controls:['Muster to invoice man-days matched weekly','PF/ESI deposited before the statutory due date','Worker bank account unique (no pooling)','Client sign-off on invoice man-days'],
  docs:[['Worker-wise muster and attendance','Invoice support.'],['PF/ESI returns and challans','Statutory proof.'],['Principal-employer agreements','Rate and liability terms.']],
  law:[['Contract Labour (Regulation & Abolition) Act','Licence and principal obligations.'],['PF Act, ESI Act, Shops & Establishments','Deduction and deposit duties.'],['Payment of Wages / Minimum Wages','Wage compliance.'],['GST on manpower supply services','RCM questions for clients.']],
  risks:[['H','PF/ESI deducted but not deposited','Criminal and interest exposure.','stat'],['M','Invoice man-days higher than muster','Overbilling clients.','vouch']],
  cal:[['monthly','Muster vs invoice vs PF/ESI deposit','Payroll'],['annual','Contract labour licence renewal','Licences']]},

media:{n:'Media / advertising / content',
  d:/\badvertis|agency commission|media buy|broadcast|production house|influencer|content subscription|ot t\b|channel revenue/i,
  plain:'Sells attention: media buys, campaigns, production. Revenue follows insertion orders and TRP/proof-of-play; costs are talent, production and media inventory bought ahead.',
  audit:['rev','drs','payroll','gsttds','ar','cash'],
  acct:['rev','provision','tax','lease','rebate'],
  controls:['Insertion order to proof-of-play to invoice chain','Media credit period tracked separately from client credit','Talent payments against contract and TDS','Campaign WIP closed at go-live'],
  docs:[['Insertion orders and proof-of-play','Revenue evidence.'],['Campaign cost sheets','Margin per campaign.'],['Talent / artist contracts','Cost and TDS basis.']],
  law:[['TDS on artist and professional payments','194J / 194C; rates differ.'],['GST on advertising services','Place of supply for cross-border.'],['Copyright Act for content','Ownership of created work.'],['ASCIs and advertising code','Misleading ad exposure.']],
  risks:[['M','Revenue booked before proof-of-play','May never be billed.','o2c'],['M','Media credit not reconciled with vendors','Duplicate payment risk.','p2c']],
  cal:[['monthly','Campaign-wise margin and unbilled review','Revenue'],['quarterly','Media vendor statement reconciliation','p2p']]},

agri_input:{n:'Agri-input (seeds / fertiliser / pesticides)',
  d:/\bseed|fertilis|pesticide|agri input|crop protection|distributor of agri/i,
  plain:'Sells seasonal inputs to farmers and dealers: stock rotation before season, counterfeits risk, and subsidy / state schemes that must be claimed correctly.',
  audit:['inv','drs','stat','cash','p2p','ar'],
  acct:['inv','rev','rebate','provision'],
  controls:['Batch number on every pack sold','Season-end expiry / return to manufacturer','Dealer credit only against order form','Subsidy claims matched to actual sales'],
  docs:[['Batch and lot register','Recall and quality trail.'],['Dealer order forms and credit policy','Revenue support.'],['Insecticides / fertiliser licences','Selling legality.']],
  law:[['Insecticides Act / Fertiliser (Control) Order','Licence and quality.'],['Seeds Act: sale and labelling','Certification marks.'],['GST on agricultural inputs (often concessional)','Rate verification.']],
  risks:[['H','Counterfeit or expired input sold','Criminal liability and reputation.','inv'],['M','Season-end returns not claimed','Working capital stuck.','o2c']],
  cal:[['monthly','Season stock rotation and expiry','Stock'],['annual','Licence renewal before season','Licences']]},

/* fallback — always present */
generic:{n:'General business',d:/(?!)/,plain:'',
  audit:['rev','p2p','cash','ar','gsttds','stat'],
  acct:['rev','inv','tax','provision'],
  controls:['Authorisation matrix for payments','Monthly BRS and cash count','Invoice series controlled','Related-party list maintained'],
  docs:[],law:[],risks:[],cal:[]}
};

/* ================= assembly: what this sector must know ================= */
const IND_SPEC={chemical_import:2.2,pharma:2.2,food:2,textile:1.7,construction:1.7,finance:1.7,it_services:1.6,manufacturing:1.3,retail:1,trading:1,services:1,
  agriculture:1.8,education:1.7,healthcare:1.8,logistics:1.7,hospitality:1.6,realestate:1.7,energy:2,mining:2,auto_dealer:1.7,fmcg:1.7,insurance:2,nonprofit:1.8,staffing:1.7,media:1.6,agri_input:1.8};

function indDetect(P){
  /* score on UNIQUE names only, weighted by how specific the pack is */
  const names=[...new Set([...(P.ledgerNames||[]),...(P.partyNames||[]),...(P.voucherTypes||[]).map(x=>x[0]||''),P.industry||'',P.name||''].filter(Boolean))];
  let best=null,bestScore=0;const hits=[];
  for(const k of Object.keys(IND)){
    if(k==='generic')continue;
    const p=IND[k];
    let matched=0;
    for(const n of names)if(p.d.test(n))matched++;
    if(!matched)continue;
    const score=matched*(IND_SPEC[k]||1);
    hits.push({k,n:p.n,score:Math.round(score*10)/10,matched});
    if(score>bestScore){bestScore=score;best=k}}
  hits.sort((a,b)=>b.score-a.score);
  if(!best&&P.biz==='manufacturing')best='manufacturing';
  if(!best)best='generic';
  return{key:best,score:bestScore,pack:IND[best],hits:hits.slice(0,4)}}

/* resolve one pack into full three-layer knowledge for this client */
function sectorKnowledge(P){
  const pack=(P&&P.industryPack)||IND.generic;
  const label=(P&&P.industryLabel)||pack.n||'General business';
  const uniq=a=>[...new Set(a.filter(Boolean))];
  const auditKeys=uniq([...(pack.audit||[]),'ar','stat']);
  const audit=auditKeys.map(k=>AUDIT_KB[k]).filter(Boolean);
  const acctKeys=uniq([...(pack.acct||[]),'rev']);
  const acct=acctKeys.map(k=>ACCT_KB[k]).filter(Boolean);
  const lawPairs=LEGAL_BASE.concat(pack.law||[]);
  const law=lawPairs.map(x=>x[0]+' — '+x[1]);
  return{
    label,
    audit,auditKeys,
    acct,acctKeys,
    lawPairs,
    controls:(pack.controls||[]).slice(),
    plain:pack.plain||'',
    docs:pack.docs||[],risks:pack.risks||[],cal:pack.cal||[]
  }}

/* ---------- party & process intelligence from names and vouchers ---------- */
const ENTITY_RE=/\b(pvt\.?\s*ltd|private limited|\bltd\b|limited|\bllp\b|\binc\b|\bcorp\b|holdings?|group|enterprises?|ventures|industries|traders|trading co|chemicals|textiles|enterprises)\b/i;
const SELF_RE=/\b(head office|\bho\b|branch|\bunit\b|\bplant\b|corporate office|division|\bdc\b|depot|factory)\b/i;
const TRANSFER_RE=/inter[- ]?(branch|company|unit)|transfer (to|from)|\bho transfer\b|branch transfer|self (invoice|bill)|\bintra\b/i;

function partyClassify(P,V){
  const names=new Set();
  for(const v of V){if(v.party)names.add(v.party);for(const e of v.E)if(e.l)names.add(e.l)}
  const selfRoot=(P.name||'').toLowerCase().replace(/\b(pvt|private|ltd|limited|llp|inc|corp|the)\b/g,'').replace(/[^a-z0-9]/g,'');
  const internal=[],groupCos=[],customers=[],suppliers=[],banks=[],unknown=[];
  const pc={};for(const v of V)if(v.party)pc[v.party]=(pc[v.party]||0)+1;
  for(const n of names){
    const low=n.toLowerCase();
    if(BANK_RE.test(n)||/\bbank\b|fino|paytm|phonepe|upi/i.test(n)){banks.push(n);continue}
    if(SELF_RE.test(n)){internal.push(n);continue}
    if(ENTITY_RE.test(n)){
      const root=low.replace(/\b(pvt|private|ltd|limited|llp|inc|corp|the|co|company|group|holdings|enterprises|traders|trading|industries|chemicals|textiles)\b/g,'').replace(/[^a-z0-9]/g,'');
      if(selfRoot.length>=4&&root.length>=4&&(selfRoot.includes(root)||root.includes(selfRoot)))groupCos.push(n);
      else if(pc[n]>=3&&/pvt|ltd|limited|llp/i.test(n))groupCos.push(n);
      else if(pc[n]>=5)suppliers.push(n);
      else unknown.push(n);
      continue}
    if(/sales|customer|client|buyer|dealer|retailer|shop/i.test(n)){customers.push(n);continue}
    if(/purchase|supplier|vendor|seller|agent|transport|freight/i.test(n)){suppliers.push(n);continue}
    if(pc[n]>=5)suppliers.push(n);
    else if(pc[n]>=2)customers.push(n);
    else unknown.push(n)}
  const transfers=[];
  for(const v of V){
    const hay=(v.nar||'')+' '+(v.party||'')+' '+v.E.map(e=>e.l).join(' ');
    if(TRANSFER_RE.test(hay)||((SELF_RE.test(v.party||'')||v.E.some(e=>SELF_RE.test(e.l||'')))&&/journal|payment|receipt|contra/i.test(v.vt||'')))
      transfers.push({d:v.d,vt:v.vt,nar:(v.nar||'').slice(0,90),amt:R2(v.E.reduce((t,e)=>t+e.a,0))})}
  return{
    internal:[...new Set(internal)].slice(0,20),
    groupCos:[...new Set(groupCos)].slice(0,15),
    customers:[...new Set(customers)].slice(0,30),
    suppliers:[...new Set(suppliers)].slice(0,30),
    banks:[...new Set(banks)].slice(0,10),
    transfers:transfers.slice(0,40),
    transferCount:transfers.length,
    topByVouchers:Object.entries(pc).sort((a,b)=>b[1]-a[1]).slice(0,8)}}

function processStory(P,PP){
  const vt=Object.fromEntries(P.voucherTypes||[]);
  const bits=[];
  const has=(re)=>Object.keys(vt).some(k=>re.test(k||''));
  const led=(P.ledgerNames||[]).join(' ');
  if(has(/sales|credit note/i)||/sales/i.test(led))bits.push('sells (sales vouchers and sales ledger)');
  if(has(/purchase|debit note/i)||/purchase|raw material/i.test(led))bits.push('buys (purchase vouchers, raw material or trading stock)');
  if(/stock|inventory|finished goods|raw material/i.test(led))bits.push('holds stock (inventory ledgers present)');
  if(has(/payment|receipt|contra/i)||P.bankAmt>0)bits.push('moves money through bank and cash');
  if(has(/journal/i))bits.push('adjusts through journals ('+(P.journalPct||0)+'% of vouchers)');
  if(P.salaryR2>0)bits.push('runs payroll');
  if(PP.transfers.length)bits.push('moves value between own units (internal transfers seen)');
  if(PP.groupCos.length)bits.push('transacts with related entities ('+PP.groupCos.slice(0,3).join(', ')+')');
  if(!bits.length)bits.push('keeps books whose pattern is not yet clear — walk through with management');
  return 'This company '+bits.join(', ')+'.'
    +(PP.internal.length?' Own units/branches seen: '+PP.internal.slice(0,4).join(', ')+'.':'')
    +(PP.groupCos.length?' Other companies in the same group appear in the books: '+PP.groupCos.slice(0,4).join(', ')+'.':'')}
