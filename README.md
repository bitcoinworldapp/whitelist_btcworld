# Ordinals Whitelist (React + Express + MongoDB)

- Frontend: React (Vite)
- Backend: Node.js + Express
- DB: MongoDB

## Desarrollo local (resumen)
1) Arranca MongoDB (local o Atlas).
2) Copia `server/.env.example` a `server/.env` y ajusta `MONGODB_URI`.
3) (Opcional) Semilla: `cd server && npm run seed`.
4) En dos terminales:
   - Backend: `cd server && npm i && npm run dev`
   - Frontend: `cd client && npm i && npm run dev`
5) Abre http://localhost:5173

## Producción (resumen)
- `cd client && npm run build`
- `cd server && npm i && npm run start` (sirve `/client/dist` con Express)
