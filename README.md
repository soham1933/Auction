# Real-Time Cricket Auction

A production-oriented full-stack cricket auction app with a mobile-first React frontend and a Node.js, Express, MongoDB, and Socket.io backend.

## Folder Structure

```text
Auction/
  client/
    public/
    src/
      api/
      components/
      context/
      hooks/
      layout/
      pages/
      utils/
  server/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      sockets/
```

## Features

- Real-time live auction state synced across all devices
- Captain JWT login and budget-safe bidding
- Admin dashboard for auction control and player management
- Live leaderboard and team tracking
- Mobile-first glassmorphism UI with Framer Motion animations
- Progressive Web App support with manifest and service worker
- Deployment-ready environment configuration for Render and Vercel

## Local Setup

1. Install dependencies:

   ```bash
   npm run install:all
   ```

2. Create environment files:

   - Copy `server/.env.example` to `server/.env`
   - Copy `client/.env.example` to `client/.env`

3. Start MongoDB locally or provide a MongoDB Atlas URI.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open:

   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:5000`

## Demo Logins

- Admin
  - Email: `admin@auction.com`
  - Password: `supersecurepassword`
- Captains
  - `Mumbai Mavericks` / `captain123`
  - `Chennai Chargers` / `captain123`
  - `Delhi Daredevils` / `captain123`
  - `Bangalore Blasters` / `captain123`

If the database is empty, demo captains and players are seeded automatically on server startup.

## Default Workflow

1. Use the admin login on `/admin`
2. Add players if needed
3. Start an auction for a player
4. Captains register or login from the auction room
5. Place bids in real time
6. Mark the player as sold or close the auction

## Deployment

### Backend on Render

- Create a Web Service from the `server` directory
- Build command: `npm install`
- Start command: `npm start`
- Add environment variables from `server/.env.example`
- Set `CLIENT_URL` to the deployed Vercel frontend URL

### Frontend on Vercel

- Import the `client` directory as the project root
- Framework preset: Vite
- Add environment variables from `client/.env.example`
- Set `VITE_API_URL` and `VITE_SOCKET_URL` to your Render backend URL

## Production Notes

- Use strong values for `JWT_SECRET` and admin credentials
- Serve the backend over HTTPS so Socket.io upgrades to `wss`
- Seed captains and players through the UI or REST endpoints
- For larger events, place MongoDB on Atlas and enable indexes
- Default bid increment is `10` points unless overridden with `MIN_BID_INCREMENT`
