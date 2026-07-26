# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start server**: `npm start` - Uses nodemon to start the server with auto-reload
- **Install dependencies**: `npm install`
- **No test suite configured** - Tests show "Error: no test specified"

## Architecture Overview

This is a Node.js/Express REST API for a CRM system with the following structure:

### Core Components
- **Entry point**: `src/server.js` - Creates HTTP server and connects to MongoDB
- **App configuration**: `src/app.js` - Express app setup with CORS and route mounting
- **Database**: MongoDB connection via `src/services/db.js`
- **Authentication**: Firebase Admin SDK for token verification in `src/middleware/authMiddleware.js`

### API Structure
All endpoints are prefixed with `/api/v1/` and include:
- `/clients` - Client management (requires admin authorization)
- `/suppliers` - Supplier management  
- `/events` - Event tracking
- `/version` - Version information
- `/logs` - Logging functionality

### Authentication Flow
- Uses Firebase JWT tokens via `Authorization: Bearer <token>` header
- Token verification handled by `verifyFirebaseToken` middleware
- Admin authorization checked against hardcoded admin list in `src/services/admins.js`
- Client operations require admin permissions

### Database
- MongoDB database named "crm"
- Collections: clients, suppliers, events, logs, version
- Connection managed through singleton pattern in `src/services/db.js`

### Security Notes
- Firebase service account credentials are in `firebase.json` (should be moved to environment variables)
- MongoDB URI stored in `.env` file as `DB` variable
- Admin emails hardcoded in `src/services/admins.js`

### File Organization
```
src/
├── controllers/    # Request handlers for each resource
├── middleware/     # Authentication middleware
├── routes/         # Express route definitions
└── services/       # Database, Firebase, and admin services
```