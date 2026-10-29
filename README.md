# ShareSpace

A trusted platform for sharing underused campus equipment and spaces at a single institution (Parul University, with fictional demo data). Students discover lab kits, cameras, 3D printers and rooms, prove they are eligible, and book them. Owners stay in control of their property, Campus Operations oversees everything, and every decision is recorded in an audit log.

**Live demo:** https://sharespace-neon-ten.vercel.app  
**Source code:** https://github.com/ignit-fury/sharespace

## Testing instructions (for judges)

**No login or credentials are needed.** The app runs in demo mode on fictional data saved in your browser. Use the profile menu (top right) to switch between six personas:

| Persona | Role | What they can do |
|---|---|---|
| Aanya Shah | Student | Browse, complete training, request, check in, return, request extensions, report incidents |
| Dr. Meera Patel | Resource owner | Request new listings, approve or reject bookings and extensions on her resources, resolve incidents |
| Campus Operations | Administrator | Approve new resource listings, see and act on everything |
| Rohan Kulkarni | Student | Has an overdue laptop with an open delay incident (good for testing incidents) |
| Sana Iqbal | Student | Electronics-trained; has an approved DSLR booking |
| Prof. Arjun Mehta | Resource owner | Owns the Thermal Camera; sees only incidents on his own resources |

Click **Guide** in the top bar for the same walkthrough inside the app. Click **Reset** at any time to restore the original demo data.

### One full journey, listing to return (about 5 minutes)

1. **List:** as Dr. Meera Patel, go to Explore and click **Request new resource**. Fill it in and send it for approval.
2. **Approve the listing:** switch to Campus Operations. The dashboard shows the pending resource. Open it, then click **Approve and publish**.
3. **Discover and check eligibility:** switch to Aanya. Open **Soldering Station** in Explore. The request is blocked because Electronics Lab Training is missing, and the reason is shown.
4. **Complete the training:** go to Training & profiles and finish Electronics Lab Training.
5. **Request:** back on the resource page, pick a time and a purpose, then submit. If the time clashes with an approved booking, the request joins a transparent waitlist instead.
6. **Review:** switch to Dr. Meera Patel. Go to Bookings, then Approval queue, and approve or reject. A rejection needs a written reason.
7. **Check in:** as Aanya, open the booking and record check-in with the condition, notes and an optional photo.
8. **Extend (optional):** click **Request extension**. Meera approves or refuses it from her bell notification.
9. **Return:** record the return with the final condition.
10. **Report and history:** report damage or a delay from the booking. Resolve it as the owner or Campus Operations. The booking history and the **Audit log** show every step.

## How it meets the brief

| Requirement | Where |
|---|---|
| Listings with availability, location, conditions, rules | Explore and resource pages |
| Search and filtering | Explore: search, category, location, status, "ready for me" |
| Verified owners and profiles | Owners' new listings need Campus Operations approval; membership verification on profiles |
| Eligibility checks (training, membership) | Checked on request and again at approval |
| Approval, rejection, waiting list | Bookings → Approval queue; first-in, first-out waitlist with lower recent usage as tie-breaker |
| Conflicts | Two approved bookings can never overlap; re-checked at approval and extension |
| Check-in and check-out | Booking dialog: condition, notes, photo |
| Before and after condition | Check-in and return reports shown side by side |
| Damage, delay, incident reporting | Report from any booking; owner or admin reviews and resolves with a note |
| Cancellations and extensions | Booking dialog; extensions need owner approval and respect all limits |
| Notifications | Bell: approvals, rejections, waitlisting, cancellations, extensions, 24-hour reminders, overdue returns |
| Fair usage | Max 3 active bookings per person, per-resource daily and weekly hour caps, max booking length |
| Role-based access | Student, owner, administrator views and permissions, enforced in the rules |
| Audit history | Audit log page plus a timeline on each booking |
| Human oversight | No automatic penalties; every rejection, refusal and resolution needs a person and a reason |

## Technology and architecture

- React 18, TypeScript, Vite, Tailwind CSS, Radix UI primitives, react-router, date-fns, lucide-react icons.
- `src/lib/rules.ts`: all business rules as pure functions (eligibility, limits, conflicts, waitlist, extensions).
- `src/lib/actions.ts`: state changes. Each one re-checks the rules and writes an audit event.
- `src/lib/derive.ts`: read-only, role-scoped views (queues, dashboard numbers, notifications).
- `src/store/store.tsx`: saves the demo data in the browser's `localStorage`.
- Hosted as a static single-page app on Vercel (`vercel.json`).

Run locally:

```bash
npm install
npm run dev
```

## Privacy, security and fairness

- All data is fictional. No real names, records or credentials are used.
- Students see only their own bookings and audit trail. Owners see their own resources, and administrators see everything.
- Condition photos are downscaled and stay in the browser.
- Fair use: limits are the same for everyone and shown on each resource page. Waitlist order is first-in, first-out, with lower recent usage winning ties.

## Known limitations

- Demo mode: persona switching is not real authentication, and data lives only in the browser it was created in.
- Notifications appear inside the app only, with no email or SMS.
- Training modules are simulated and do not replace real institutional verification.
- No payments or security deposits.

## Future development

- Real sign-in with the institution's single sign-on, and a shared database (the data types are storage-agnostic).
- Email and push notifications.
- Security deposits and staff-supervised slots for high-risk equipment.
- Several institutions sharing one catalogue.

## Disclosure

- Open-source libraries listed above, used under their licences. UI components in `src/components/ui/` follow the shadcn/ui pattern.
- No pre-existing project template or code was reused; the app was built during the hackathon window.
- **AI use:** Claude Code (Anthropic) was used extensively as a coding assistant. It wrote most of the code under my direction; I set the scope and rules, reviewed and tested every feature, and decided what to change.

## Team

Solo participant.

| Name | Role | Contribution |
|---|---|---|
| Prem Patel | Full-stack developer and product owner (Frontend, Product/Research, UI/UX, Testing) | Chose the use case (shared lab equipment and rooms at Parul University) and the target users. Defined the product rules: eligibility, fair-use limits, waitlist, owner listing approval, safety acknowledgements and role-based visibility. Directed the build with an AI coding assistant, reviewed and tested every journey with all six demo personas, reported and fixed bugs (incident and audit visibility, overdue alerts, dashboard counts), and deployed the app to Vercel and GitHub. |
