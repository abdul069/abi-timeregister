# CLAUDE.md — ABI TimeRegister (FastFood POS System)

## Project Overview

A FastFood Point-of-Sale (POS) system built with Next.js and Firebase. Originally an employee time & attendance system, it evolved into a full-featured restaurant POS with order management, kitchen display, staff management, and reporting. The UI is in **Dutch**.

## Tech Stack

- **Framework**: Next.js 14 (Pages Router) with React 18
- **Language**: JavaScript/JSX (no TypeScript)
- **Database**: Firebase Firestore (NoSQL, real-time)
- **Auth**: Firebase Authentication (email/password) + PIN-based staff login
- **Styling**: Inline CSS (no CSS framework or CSS-in-JS library)
- **Deployment**: Vercel

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run Next.js linter
```

No test framework is configured. There are no tests.

## Project Structure

```
pages/              # Next.js Pages Router — each file is a route
  index.js          # Login/signup page (Firebase Auth)
  _app.js           # App wrapper
  pos.js            # POS dashboard (stats, quick access)
  kassa.js          # Main cashier/POS interface (~1000 lines)
  menubeheer.js     # Menu management admin
  bestellingen.js   # Orders/sales reporting
  personeel.js      # Staff management
  keuken.js         # Kitchen display system
  dagafsluiting.js  # Daily cash reconciliation/closing

lib/                # Shared business logic
  firebase.js       # Firebase initialization (app, auth, db exports)
  pos-data.js       # Complete data layer — all Firestore CRUD operations

styles/
  globals.css       # Global styles, receipt print styles, touch-friendly UI
```

## Architecture & Patterns

### Data Layer (`lib/pos-data.js`)

All Firestore operations are centralized here. Key function groups:

- **Menu**: `getCategories`, `saveCategories`, `getMenuItems`, `saveMenuItems`
- **Orders**: `getOrders`, `saveOrder`, `saveOrderEnhanced`, `updateOrder`, `voidOrder`, `getTodayOrders`
- **Modifiers**: `getModifierGroups`, `saveModifierGroups`, `getModifierLinks`, `saveModifierLinks`, `resolveModifierGroups`
- **Staff**: `getStaff`, `saveStaff`, `verifyPin`
- **Work Periods**: `getActiveWorkPeriod`, `startWorkPeriod`, `endWorkPeriod`
- **Parked Orders**: `parkOrder`, `recallParkedOrder`, `getParkedOrders`
- **Settings**: `getBusinessSettings`, `saveBusinessSettings`
- **Utilities**: `formatPrice`, `getNextOrderNumber`, `resetDailyCounter`

### Firestore Collections

- `orders` — transaction records
- `settings/categories` — product categories
- `settings/menuItems` — menu items
- `settings/modifierGroups` — Lightspeed-style modifier groups
- `settings/modifierLinks` — links between modifiers and products/categories
- `settings/orderCounter` — daily order numbering (uses Firestore transactions)
- `settings/businessSettings` — business configuration

### Page Components

Each page is a self-contained feature module using React hooks (`useState`, `useEffect`). There is no shared component library — UI elements are defined inline within each page. Pages are large (500-1000+ lines) with embedded inline styles.

### Authentication Flow

1. Firebase email/password auth on `index.js` (signup/login)
2. After login, staff selects identity via 4-digit PIN
3. Current staff stored in `sessionStorage`
4. Role-based access: `kassier` (cashier) and others

## Environment Variables

All prefixed with `NEXT_PUBLIC_` (client-side Firebase config):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

Template at `.env.local.example`. Never commit `.env.local`.

## Code Conventions

- **No TypeScript** — all files are `.js`/`.jsx`
- **Inline styling** — CSS is written as JavaScript style objects, not class-based
- **Dutch naming** — page names and UI text are in Dutch (kassa = cashier, menubeheer = menu management, bestellingen = orders, personeel = staff, keuken = kitchen, dagafsluiting = daily closing)
- **No component extraction** — features are self-contained in page files
- **Direct Firestore SDK** — no ORM or abstraction beyond `pos-data.js`
- **No API routes** — all data flows client-side through Firebase SDK
- **Price formatting** — use `formatPrice()` from `pos-data.js` (EUR currency)
- **Default data** — `pos-data.js` contains default categories and 70+ menu items that initialize on first load

## Key Features

1. **POS/Cashier** (`kassa.js`) — order creation, modifier selection, payment processing, receipt printing
2. **Kitchen Display** (`keuken.js`) — real-time order queue with audio alerts
3. **Menu Management** (`menubeheer.js`) — CRUD for categories, products, modifier groups
4. **Staff Management** (`personeel.js`) — PIN-based auth, role assignment
5. **Reporting** (`bestellingen.js`) — daily sales, payment methods, hourly breakdown, category analysis
6. **Cash Reconciliation** (`dagafsluiting.js`) — shift open/close, cash counting
7. **Parked Orders** — save and recall in-progress orders

## Development Notes

- Touch-friendly design (44px minimum button sizes) — designed for tablet/touchscreen use
- Print media queries in `globals.css` for receipt printing
- No CI/CD pipeline configured
- No linter or formatter beyond Next.js default `next lint`
