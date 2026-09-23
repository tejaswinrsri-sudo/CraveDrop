# CraveDrop

CraveDrop is a full-stack food ordering and table reservation application for Chennai. Customers can discover restaurants, browse menus, manage a cart, place orders, reserve tables, and manage their profile. Administrators can manage restaurants, menu items, orders, bookings, and users.

## Features

- Restaurant discovery with search and filters for area, cuisine, rating, delivery time, cost, and vegetarian options.
- Manual area selection and browser geolocation for supported Chennai delivery areas.
- Restaurant menus and one-restaurant-at-a-time cart management.
- Checkout with saved or new delivery addresses and cash-on-delivery or online payment status.
- Clerk authentication with customers.
- Order history, order details, booking history, and booking cancellation.
- Dashboards for restaurants, menu items, orders, bookings, and users.
- MongoDB persistence with Zod request validation and protected Express API routes.
- Responsive React interface for mobile, tablet, and desktop screens.

## Technology

- **Frontend:** React 19, React Router, Tailwind CSS 4, Lucide React
- **Backend:** Node.js, Express, TypeScript, Vite middleware
- **Authentication:** Clerk React and Clerk Express
- **Database:** MongoDB or MongoDB Atlas
- **Data fetching and state:** TanStack Query, Axios, and Zustand
- **Validation and tooling:** Zod, Jest, Supertest, TypeScript, and esbuild

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- A running MongoDB instance or a MongoDB Atlas cluster
- A Clerk application for authentication
- A modern browser

## Getting Started

Run these commands from the repository root:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Update `.env` with your MongoDB and Clerk values. The server falls back to a local MongoDB database at `mongodb://127.0.0.1:27017/food_booking` when `MONGODB_URI` is not set, but Clerk keys should be configured for authentication.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The development command starts Express and Vite together. API requests are served under `/api`.

## Environment Variables

The complete template is available in `.env.example`:

```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/food_booking?retryWrites=true&w=majority"
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
APP_URL="http://localhost:3000"
GEMINI_API_KEY=""
```

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `CLERK_PUBLISHABLE_KEY` | Server-side Clerk publishable key |
| `CLERK_SECRET_KEY` | Server-side Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Secret used to verify Clerk webhooks |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk key exposed to the Vite client |
| `APP_URL` | Application URL used by deployment configuration |
| `GEMINI_API_KEY` | Optional Gemini API key |

Never commit `.env` or real credentials.

## Database Setup

Initialize indexes and collections:

```bash
npm run init-db
```

Insert development restaurants and menu items:

```bash
npm run seed
```

Only run the seed command against a database whose contents can be replaced or supplemented intentionally.

## Clerk Setup

1. Create an application in the [Clerk Dashboard](https://dashboard.clerk.com).
2. Enable the sign-in methods required by the application.
3. Add the Clerk publishable key to both `CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PUBLISHABLE_KEY`.
4. Add the Clerk secret key to `CLERK_SECRET_KEY`.
5. Configure this webhook endpoint:

   ```text
   https://YOUR_DOMAIN/api/webhooks/clerk
   ```

6. Subscribe the webhook to `user.created`, `user.updated`, and `user.deleted`.
7. Add the webhook signing secret to `CLERK_WEBHOOK_SECRET`.
8. Give administrator accounts public metadata with this value:

   ```json
   {
     "role": "admin"
   }
   ```

Public restaurant browsing does not require authentication. Checkout, orders, bookings, profiles, and administrator pages require a Clerk session.

## Application Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Home page and restaurant discovery |
| `/restaurants` | Public | Restaurant listing |
| `/restaurant/:id` | Public | Restaurant details and menu |
| `/checkout` | Signed in | Cart checkout |
| `/orders` | Signed in | Current user's orders |
| `/orders/:id` | Signed in | Order details |
| `/bookings` | Signed in | Current user's table reservations |
| `/profile` | Signed in | User profile and saved addresses |
| `/admin` | Administrator | Admin dashboard |
| `/admin/orders` | Administrator | Order management |
| `/admin/restaurants` | Administrator | Restaurant management |
| `/admin/menu-items` | Administrator | Menu management |
| `/admin/bookings` | Administrator | Booking management |
| `/admin/users` | Administrator | User management |

## API Overview

| Method | Endpoint | Access |
|---|---|---|
| `GET` | `/api/health` | Public |
| `GET` | `/api/location/resolve?lat=...&lng=...` | Public |
| `GET` | `/api/restaurants` | Public |
| `GET` | `/api/restaurants/:id/menu` | Public |
| `GET` | `/api/restaurants/areas/list` | Public |
| `POST`, `GET` | `/api/cart` | Signed in |
| `POST`, `GET` | `/api/orders` | Signed in |
| `GET` | `/api/orders/:id` | Signed in |
| `POST`, `GET` | `/api/bookings` | Signed in |
| `PATCH` | `/api/bookings/:id/cancel` | Signed in |
| `POST` | `/api/webhooks/clerk` | Clerk webhook |
| `GET`, `POST`, `PATCH`, `DELETE` | `/api/admin/*` | Administrator |

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the Express/Vite development server |
| `npm run build` | Build the frontend and bundle the production server |
| `npm start` | Run the production server from `dist/server.cjs` |
| `npm run lint` | Run TypeScript validation without emitting files |
| `npm test` | Run Jest tests |
| `npm run init-db` | Initialize database indexes and collections |
| `npm run seed` | Seed development restaurants and menu items |
| `npm run preview` | Preview the Vite frontend build |
| `npm run clean` | Remove generated build output |

## Production Build

Validate and build the application:

```bash
npm run lint
npm run build
```

Start the compiled application:

```bash
NODE_ENV=production npm start
```

On Windows PowerShell:

```powershell
$env:NODE_ENV = "production"
npm start
```

The production server serves the compiled frontend from `dist` and exposes the API from the same process. It listens on `PORT` when provided and defaults to port `3000`.

For Render, Railway, or a similar Node.js host:

```text
Build command: npm install && npm run build
Start command: npm start
Node version: 22
```

Configure all production environment variables in the host dashboard. Use production Clerk keys, set `APP_URL` to the HTTPS deployment URL, configure Clerk allowed origins, and update the webhook URL.

## Location Detection

Location detection is started by the user and requires `localhost` or HTTPS. If browser permission is denied or the location is unavailable, users can select an area manually. The selected area is stored in browser local storage under `cravedrop_selected_area`.

## Project Structure

```text
.
├── server.ts                 # Express and Vite entry point
├── server/
│   ├── db/                   # MongoDB connection helpers
│   ├── middleware/           # Authentication and authorization middleware
│   ├── routes/               # REST API routes
│   ├── schemas/              # Zod validation schemas
│   └── utils/                # Backend utility functions
├── src/
│   ├── components/           # Shared, cart, layout, and admin components
│   ├── config/               # Application constants and area configuration
│   ├── hooks/                # React hooks and data access hooks
│   ├── lib/                  # API, authentication, and state helpers
│   ├── pages/                # Customer and administrator pages
│   └── types/                # Frontend TypeScript types
├── scripts/                  # Database initialization and seed scripts
├── data/                     # Local MongoDB data, when used
├── index.html                # Vite HTML entry point
├── package.json              # Dependencies and npm scripts
└── .env.example              # Environment variable template
```

## Verification

Run the automated checks before submitting changes:

```bash
npm run lint
npm run build
npm test
```

For a manual smoke test, browse restaurants as a guest, select or detect an area, open a menu, add an item to the cart, sign in, complete checkout, verify the order, create and cancel a booking, and confirm that an administrator can access `/admin`.

## License

No license has been declared yet. Add a license before distributing the project publicly.
