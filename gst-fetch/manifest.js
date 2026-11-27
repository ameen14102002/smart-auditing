/* Smart Auditing — gst-fetch automation manifest (data-driven).
   Everything the Playwright download driver needs is data here. Edit this file to
   match the GST portal or change the storage layout — no code changes needed.
   The fields are serializable so the app can fetch GET /manifest and read the
   same storage convention (bucket + path template) the service writes to. */

// filename/path safe: keep only file-safe chars
export const sanitize = s => String(s || '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80);

const manifest = {
  sanitize,

  portal: {
    base: 'https://gst.gov.in',
    signinUrl: 'https://gst.gov.in/services/login',
    downloadPath: '/services/taxpayer/returns/download-return',
    // persistent browser profile: remembers the one-time GST sign-in (OTP),
    // so every later run is fully headless and automatic
    userDataDir: '.gst-profile',
    requestTimeoutMs: 600000, // GSTR-1 for a big month can take minutes to generate
  },

  // the GST returns the automation downloads, per month
  returns: [
    { id: 'GSTR1',  label: 'GSTR-1',  retType: 'GSTR-1',  exts: ['json', 'zip'] },
    { id: 'GSTR2B', label: 'GSTR-2B', retType: 'GSTR-2B', exts: ['xlsx', 'json'] },
    { id: 'GSTR3B', label: 'GSTR-3B', retType: 'GSTR-3B', exts: ['json', 'csv'] },
  ],

  // TDS challans: TRACES has no clean deep-link, so the service opens it
  // (signed in via the same persistent profile) and the user grabs the file.
  tds: {
    label: 'TDS challans',
    url: 'https://traces.incometax.gov.in',
  },

  // GST return-download URL template. {gstin} {period} {retType} are filled per row.
  downloadUrlTemplate:
    'https://gst.gov.in/services/taxpayer/returns/download-return?gstin={gstin}&ret_period={period}&ret_type={retType}&action=download',

  // downloaded file name + storage path templates. {client} {ret} {month} {ext}.
  // Flat per-client folder so the app can list every file in one call.
  fileNameTemplate: '{client}_{ret}_{month}.{ext}',
  storage: {
    bucket: 'gst-returns',
    pathTemplate: '{client}/{ret}_{month}.{ext}',
  },
};

export default manifest;
