# SmartTour Lanka 🏝️

**Multi-Vertical, Location-Based Tourism Booking Platform for Sri Lanka**

A full-stack web application for booking verified tour guides, surf schools, yoga studios, and discovering live events across Sri Lanka. Built as a Higher Diploma in Software Engineering dissertation project (NIBM Colombo-07).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| **Backend** | Node.js + Express.js REST API (TypeScript) |
| **Database** | PostgreSQL with PostGIS extension |
| **ORM** | Prisma |
| **Auth** | JWT-based sessions, httpOnly cookies, role-based middleware |
| **Maps** | Leaflet + OpenStreetMap (free, keyless) |
| **Payments** | Mock Stripe + Mock GovPay |

## Features

### Tourist Features
- **Browse & Discover**: Interactive map (Lanka Pulse) with category-filtered providers
- **Vibe Check**: Detailed provider profiles with verified badges, ratings, and reviews
- **Flexi-Fare Booking**: Dynamic pricing calculator for tour guides
- **Surf School Booking**: Session slots with real-time inventory validation
- **Yoga Studio Booking**: Live capacity tracking with waitlist functionality
- **Horizon Events**: Geo-fenced event discovery with countdown timers
- **In-App Chat**: Auto-translate messaging (mock)
- **Emergency SOS**: Emergency alert sharing GPS location
- **Reviews**: Verified-purchase only review system

### Provider Features
- **Role-Based Registration**: Adaptive forms per provider type (Guide/Surf/Yoga)
- **Provider Hub**: Earnings stats, booking requests, availability management
- **Calendar**: Availability management and booking schedule
- **Earnings**: Payout history, commission breakdown, monthly trends

### Admin Features
- **Verification Queue**: Review and approve/reject provider applications
- **Analytics Dashboard**: Platform metrics, weekly bookings, revenue tracking
- **Booking Oversight**: Full booking management

## Business Logic Implemented

1. **Flexi-Fare Matrix** (Tour Guide pricing with tiered rates, vehicle fees, language premiums, group discounts)
2. **Surf Inventory Validation** (Board availability + instructor/student ratio checks)
3. **Yoga Mat Controller** (Capacity checking + waitlist + alternative studio suggestions)
4. **Geospatial Discovery** (Haversine-based distance calculation)
5. **Booking Status Flow** (PENDING → CONFIRMED → ONGOING → COMPLETED or CANCELLED)
6. **Verified Reviews** (Only completed bookings can be reviewed, enforced at API level)
7. **Double-Booking Prevention** (Unique constraint on provider + start_time)

## Prerequisites

- **Node.js** v18+ 
- **npm** v9+
- **PostgreSQL** 14+ with PostGIS extension
- **Docker** (optional, for containerized setup)

## Quick Start

### Option 1: Manual Setup

#### 1. Database Setup

```bash
# Create PostgreSQL database and enable PostGIS + pgcrypto
psql -U postgres
CREATE DATABASE smarttour_lanka;
\c smarttour_lanka;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create trigger to auto-sync geom from base_lat/base_lng (for providers)
CREATE OR REPLACE FUNCTION sync_provider_geom() RETURNS trigger AS $$
BEGIN
  IF NEW.base_lat IS NOT NULL AND NEW.base_lng IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.base_lng, NEW.base_lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_provider_geom
  BEFORE INSERT OR UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION sync_provider_geom();

-- Create trigger to auto-sync geom from event_lat/event_lng (for events)
CREATE OR REPLACE FUNCTION sync_event_geom() RETURNS trigger AS $$
BEGIN
  IF NEW.event_lat IS NOT NULL AND NEW.event_lng IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.event_lng, NEW.event_lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_event_geom
  BEFORE INSERT OR UPDATE ON live_events
  FOR EACH ROW EXECUTE FUNCTION sync_event_geom();

\q
```

#### 2. Backend Setup

```bash
cd backend
npm install
cp .env .env.local  # Edit if needed

# Push schema to database and seed data
npx prisma generate
npx prisma db push
npx tsx src/seed.ts

# Start development server
npm run dev
```

The API will be available at `http://localhost:4000`.

#### 3. Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Option 2: Docker Setup

```bash
# Ensure Docker and Docker Compose are installed
docker-compose up -d

# The first run will:
# 1. Start PostgreSQL with PostGIS
# 2. Run database migrations and seed data
# 3. Start the Express API on port 4000
# 4. Start the Next.js frontend on port 3000
```

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smarttour_lanka"
JWT_SECRET="smarttour-lanka-jwt-secret-2026"
JWT_REFRESH_SECRET="smarttour-lanka-refresh-secret-2026"
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Tourist** | sarah@example.com | password123 |
| **Tourist** | james@example.com | password123 |
| **Guide** | ravi.guide@example.com | password123 |
| **Surf School** | surf@weligama.com | password123 |
| **Yoga Studio** | yoga@oceanview.ella | password123 |
| **Unverified Provider** | dilshan.surf@example.com | password123 |
| **Admin** | admin@smarttour.lk | password123 |

## Seed Data

The seed script creates:
- **2 Tourists** (Sarah Mitchell, James Wilson)
- **1 Admin**
- **3 Verified Providers** (Ravi Bandara - National Guide, Weligama Surf Academy, Ocean View Yoga)
- **1 Unverified Provider** (Dilshan - pending admin approval)
- **3 Live Events** (Kandy Esala Perahera, Weligama Beach Sunset Party, Arugam Bay Surf Contest)
- **3 Bookings** (2 completed with reviews, 1 pending)

## API Endpoints

### Auth
- `POST /api/auth/tourist/register` - Register tourist account
- `POST /api/auth/tourist/login` - Tourist login
- `POST /api/auth/provider/register` - Register provider account
- `POST /api/auth/provider/login` - Provider login
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Providers
- `GET /api/providers/nearby?lat&lng&type&radius` - Find nearby providers
- `GET /api/providers/:id` - Get provider details
- `GET /api/provider/dashboard/stats` - Provider dashboard stats
- `PATCH /api/provider/availability` - Update availability

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get booking details
- `PATCH /api/bookings/:id/status` - Update booking status
- `POST /api/bookings/:id/pay` - Process payment (mock)
- `POST /api/bookings/pricing` - Calculate Flexi-Fare pricing

### Events
- `GET /api/events/nearby?lat&lng&radius` - Find nearby events
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event (verified providers)

### Reviews
- `POST /api/reviews` - Submit review (completed bookings only)
- `GET /api/reviews/provider/:id` - Get provider reviews

### Admin
- `GET /api/admin/verification-queue` - Pending provider verifications
- `POST /api/admin/providers/:id/verify` - Approve provider
- `POST /api/admin/providers/:id/reject` - Reject provider
- `GET /api/admin/analytics` - Platform analytics
- `GET /api/admin/bookings` - All bookings oversight

## Project Structure

```
smarttour-lanka/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── src/
│   │   ├── config/
│   │   │   └── prisma.ts          # Prisma client
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT auth middleware
│   │   │   └── validate.ts        # Zod validation
│   │   ├── routes/
│   │   │   ├── auth.routes.ts     # Auth endpoints
│   │   │   ├── provider.routes.ts # Provider endpoints
│   │   │   ├── booking.routes.ts  # Booking endpoints
│   │   │   ├── event.routes.ts    # Event endpoints
│   │   │   ├── review.routes.ts   # Review endpoints
│   │   │   └── admin.routes.ts    # Admin endpoints
│   │   ├── services/
│   │   │   ├── pricing.ts         # Flexi-Fare algorithm
│   │   │   └── inventory.ts       # Surf/Yoga validation
│   │   ├── utils/
│   │   │   └── geospatial.ts      # Haversine distance
│   │   ├── index.ts               # Express server
│   │   └── seed.ts                # Seed data
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/
│   │   ├── layout.tsx             # Root layout, auth, navigation
│   │   ├── page.tsx               # Homepage
│   │   ├── globals.css            # Global styles
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── map/page.tsx           # Lanka Pulse map
│   │   ├── providers/[id]/page.tsx # Vibe Check profile
│   │   ├── bookings/
│   │   │   ├── page.tsx           # Bookings list
│   │   │   ├── new/page.tsx       # Flexi-Fare booking
│   │   │   └── [id]/pay/page.tsx  # Payment
│   │   ├── events/page.tsx        # Horizon Events
│   │   ├── surf/[id]/page.tsx     # Surf booking
│   │   ├── yoga/[id]/page.tsx     # Yoga studio
│   │   ├── dashboard/page.tsx     # User dashboard
│   │   ├── chat/page.tsx          # In-app chat
│   │   ├── sos/page.tsx           # Emergency SOS
│   │   ├── provider/
│   │   │   ├── register/page.tsx  # Provider registration
│   │   │   ├── dashboard/page.tsx # Provider hub
│   │   │   ├── calendar/page.tsx  # Provider calendar
│   │   │   └── earnings/page.tsx  # Provider earnings
│   │   └── admin/page.tsx         # Admin panel
│   ├── components/
│   │   └── Map.tsx                # Leaflet map component
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── docker-compose.yml
└── README.md
```

## Deployment

### Production Architecture

In production, the Next.js frontend and Express backend need to be deployed separately:

```
Browser → CDN/Reverse Proxy (nginx) 
              ├── /api/* → Backend (Express on :4000)
              └── /*     → Frontend (Next.js on :3000)
```

### Option 1: Reverse Proxy with nginx

```nginx
# /etc/nginx/sites-available/smarttour
server {
    listen 80;
    server_name smarttour.lanka;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 2: Environment Variable for API URL

If the frontend and backend are on different domains, set the environment variable at build time:

```bash
# In the frontend build environment
# The frontend will use this URL as the API base
NEXT_PUBLIC_API_URL=https://api.smarttour.lanka
```

Then update the frontend `layout.tsx` to use this variable:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, { ... });
}
```

### Building for Production

```bash
# Backend
cd backend
npm run build    # Compiles TypeScript to dist/
NODE_ENV=production npm start  # Runs the compiled JS

# Frontend
cd frontend
npm run build    # Creates .next/ folder with optimized build
npm start        # Runs the production server on port 3000
```

### Environment Variables for Production

```env
# Backend (.env)
PORT=4000
DATABASE_URL="postgresql://user:password@prod-host:5432/smarttour_lanka"
JWT_SECRET="<generate-a-strong-random-secret>"
JWT_REFRESH_SECRET="<generate-another-strong-random-secret>"
NODE_ENV="production"
FRONTEND_URL="https://your-frontend-domain.com"
```

## License

This project is developed as part of a Higher Diploma in Software Engineering dissertation at NIBM Colombo-07.
