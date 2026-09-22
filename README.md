# VeritaBox Platform

VeritaBox is a comprehensive platform for managing hackathons, competitions, and workshops. It handles team registrations, event management, real-time updates, and provides a seamless experience for participants and organizers alike.

## Features

- **Event Management**: Create and manage hackathons, competitions, and workshops.
- **Participant Dashboard**: Track registrations, progress, and upcoming events.
- **Team Management**: Form squadrons (teams) for competitions and hackathons.
- **Real-time Updates**: Real-time notifications and updates using WebSockets.
- **Automated Communication**: Summon emails, automated participation certificates, and event ID cards with QR verification.
- **Admin Panel**: Complete oversight for event organizers and super admins.

## Project Structure

The repository is organized into two main parts:

- `frontend/`: The React-based user interface.
- `backend/`: The Express and MongoDB-based API and server.
- `designs/`: UI and template designs for certificates, emails, and ID cards.

## Tech Stack

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS + Radix UI
- **State Management**: Zustand
- **Real-time**: Socket.io-client
- **3D & Visualization**: React Three Fiber / Drei, Recharts, Maplibre
- **Language**: TypeScript

### Backend
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT, Google Auth Library, bcryptjs, speakeasy
- **Real-time**: Socket.io
- **AI Integration**: OpenAI
- **Email Service**: Plunk

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the environment variables:
   - Create a `.env` file in the `backend/` directory with the following variables:
     ```env
     MONGO_URI=mongodb://127.0.0.1:27017/VeritaBox
     JWT_SECRET=your_jwt_secret_here
     PORT=5000
     
     # OAuth Credentials
     GOOGLE_CLIENT_ID=your_google_client_id
     GOOGLE_CLIENT_SECRET=your_google_client_secret
     
     GITHUB_CLIENT_ID=your_github_client_id
     GITHUB_CLIENT_SECRET=your_github_client_secret
     
     MICROSOFT_CLIENT_ID=your_microsoft_client_id
     MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
     
     LINKEDIN_CLIENT_ID=your_linkedin_client_id
     LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
     
     # External APIs
     PLUNK_PUBLIC_API_KEY=your_plunk_public_key
     PLUNK_SECRET_API_KEY=your_plunk_secret_key
     OPENAI_API_KEY=your_openai_api_key
     ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the environment variables:
   - Create a `.env` file in the `frontend/` directory with the following variables:
     ```env
     VITE_API_URL=http://localhost:5000
     VITE_GOOGLE_CLIENT_ID=your_google_client_id
     VITE_GITHUB_CLIENT_ID=your_github_client_id
     VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id
     VITE_LINKEDIN_CLIENT_ID=your_linkedin_client_id
     ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Learning & Progress Features

VeritaBox includes an AI-powered personalized learning roadmap system. This system generates structured roadmaps, daily checklists, skill verification diagnostics, and tracks student progress.

### Seeding Learning Content

To test the AI roadmap generation, you need a catalog of skills and learning content in your database. A seed script is provided that creates realistic content for **Frontend Developer** and **Full Stack Developer** career goals.

From the `backend` directory, run:
```bash
node src/scripts/seedLearningContent.js
```

Once seeded, you can go to the "Roadmaps" section in the frontend, complete the onboarding wizard for one of these roles, and watch the AI generate a personalized learning journey!

## Scripts

- **`launch.bat` / `launch.sh`**: Helper scripts to launch both the frontend and backend servers simultaneously.
