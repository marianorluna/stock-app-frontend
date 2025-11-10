# StockControl Frontend

React application for the StockControl MVP. It provides manual-first flows for recording sales, purchases, and wastage while consuming real-time updates from the backend via Socket.io.

## Stack

- React + Vite + TypeScript
- Material UI for component library
- Tailwind CSS for utility styling
- Zustand for state management
- react-hook-form for forms
- Socket.io client for live updates

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

   The app runs on `http://localhost:5173` and proxies API/WebSocket requests to the backend (`http://localhost:4000`).

   To share the dev server over your local network (for mobile testing), run:

   ```bash
   npm run dev:lan
   ```

   Then browse from your device to `http://<IP_DE_TU_PC>:5173`. Make sure the backend `CLIENT_ORIGIN` env var includes both `http://localhost:5173` and the LAN URL so CORS and Socket.io accept the connection.

## Core Screens

- **Dashboard**: Shows inventory snapshot and low-stock alerts.
- **Ingredientes**: CRUD interface for ingredient catalog and initial stock.
- **Recetas**: Manage dish recipes (escandallos).
- **Registro Manual**: Forms to log manual sales, purchases, and wastage during the MVP stage.

## Next Steps

- Add authentication and role-based routing.
- Extend dashboards with charts and historical trends.
- Replace manual recording with webhook/OCR automation as backend integrations mature.

