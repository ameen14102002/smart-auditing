# Smart Auditing: working rules

Smart Auditing is the **branch app** of **1Go** (the home base). The two are linked:

- 1Go repository: `ameen14102002/company-software-suite` (Electron Windows app; Supabase project "1Go", `panlovvikswjxjkxzjcw`).
- This repository: `ameen14102002/smart-auditing` (web app on GitHub Pages; Supabase project "smart-auditing", `mkwwrkvsjafzxvlbfwla`).

**Owner's rule (23 Nov 2026):** a change in one app that touches the link between them must be made in **both** repositories in the
same piece of work. If you are working here and the change needs 1Go (its Smart Auditing tile, `app/smartaudit.js`, `src/main.js`
`saCall` / `onego:sa-bridge`, `src/auth.js`, the 1Go Supabase `my_access` / `app_users.audit`), attach `company-software-suite`
and change it too, then release 1Go (version bump; the owner publishes the release).

The links between the two apps:
- **Get from 1Go**: `handoffs` / `handoff_parts` and the `handoff_*` functions (migrations 0004, 0006); the onego:// link; the
  portal CAPTCHA is typed here (`handoff_captcha*`).
- **One sign-in and one client master**: edge function `supabase/functions/onego-bridge` (verify_jwt off; it checks the 1Go
  sign-in and `my_access`, including `audit`, on 1Go's server). Deploy it after any change.
- **Access**: only the 1Go owner and users the owner switched Smart Auditing on for (1Go › Users) see the tile or can use the bridge.
