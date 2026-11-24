# Travel Planner AI

A web application for planning multi-day travel itineraries, viewing hotel recommendations, and saving or loading trips with Google sign-in and Firebase Realtime Database sync.

### Live Link : [Travel Planner AI](https://travel-planer-ai.netlify.app/)

## Preview Images
#### Home Page :
<img width="953" height="434" alt="image" src="https://github.com/user-attachments/assets/b56a08b6-bbde-4e30-b864-fd856e98eef1" />

#### Details Page:
<img width="939" height="438" alt="image" src="https://github.com/user-attachments/assets/adc3c2f5-1cc4-4885-b976-ec3a304f280f" />

#### Results Page 

<img width="1753" height="1239" alt="Travel Planner_p1" src="https://github.com/user-attachments/assets/c410438e-a7b1-4a0c-9d99-01b40aaaaa16" />
 <img width="1753" height="1239" alt="Travel Planner_p2" src="https://github.com/user-attachments/assets/ee0f3759-f89a-4c03-8063-f5fe31126ae7" />
 <img width="1753" height="1239" alt="Travel Planner_p3" src="https://github.com/user-attachments/assets/287bb6b7-f250-4994-a6c1-83f257c4b952" />
 <img width="1753" height="1239" alt="Travel Planner_p4" src="https://github.com/user-attachments/assets/2a7c028b-b4e1-4c46-819c-4ad285a77ce0" />
<img width="1753" height="1239" alt="Travel Planner_p5" src="https://github.com/user-attachments/assets/833ff898-6322-44bb-84df-cd8a67e65932" />







## Features

- **Google authentication and cloud sync**: Sign in with Google via Firebase Authentication to save trips under `users/{uid}/trips` in Firebase Realtime Database, view saved trip history, reload past trips, or delete them.
- **Custom trip planning**: Enter a destination, trip duration (1–14 days), interests, and whether to include hotel recommendations.
- **AI-assisted itinerary generation**: Fetches a trip overview and per-day schedules through the `/.netlify/functions/generate` endpoint, showing progress as each day is generated.
- **Interactive day timeline**: View day themes, hotel cards, and chronological stops with Google Maps route and place links, food search links (Zomato and Swiggy), ride links (Uber and Rapido), and controls to reorder or remove events.

## Project Structure

```text
.
├── index.html                   # App layout, planning form, itinerary timeline, and saved trips modal
├── style.css                    # Custom styles, animations, and modal/toast transitions
├── app.js                       # Firebase auth/database sync, itinerary generation, and UI logic
├── netlify.toml                 # Netlify build and functions configuration
└── netlify/
    └── functions/
        └── generate.js          # Serverless function handling itinerary generation requests
```

## Setup and Configuration

### 1. Configure Firebase (`app.js`)

Replace the placeholder values in `firebaseConfig` inside `app.js` with your Firebase project credentials (or inject them during your build/deploy step):

```javascript
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### 2. Enable Google Sign-In and Realtime Database rules

1. In the Firebase Console, enable Google sign-in under **Authentication > Sign-in method**.
2. Add your local and Netlify domains to **Authorized domains**.
3. Configure Realtime Database rules so users can only access their own trips:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

### 3. Configure server environment variables

Set any API keys or environment variables required by `netlify/functions/generate.js` in your Netlify site settings, and in a local `.env` file when developing locally.

### 4. Run locally with Netlify CLI

Because `app.js` uses ES modules and calls `/.netlify/functions/generate`, run the project with the Netlify CLI so both the static files and the serverless function are served:

```bash
netlify dev
```

## Dependencies

- **Frontend**: [Tailwind CSS](https://tailwindcss.com/), [Material Icons Outlined](https://fonts.google.com/icons), [Lucide Icons](https://lucide.dev/), [Inter](https://fonts.google.com/specimen/Inter), and [Firebase JS SDK (v10.7.1)](https://firebase.google.com/)
- **Hosting and functions**: [Netlify](https://www.netlify.com/) (`netlify.toml` configured with `NODE_VERSION = "20"` and functions in `netlify/functions`)
