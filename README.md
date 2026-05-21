
# Docere - Academic Classroom Management System

Docere is a web-based application designed for teachers to manage classroom activities efficiently. It includes features for attendance tracking, work submission monitoring, and parent-teacher communication.

**Now powered by Firebase Firestore for real-time cloud-based state management!**

## Features

### 1. Attendance Management
- Teachers can open an attendance window for a short period (20 seconds) to prevent cheating.
- Students mark their presence during the open window.
- **Real-time updates** across all devices - when a student marks attendance, it appears instantly in teacher and parent portals.
- Attendance data persists across page refreshes.

### 2. Work Submission Tracking
- Students submit their work by name.
- Teachers can set deadlines and view submission status.
- **Real-time submission updates** - new submissions appear instantly.
- Option to send reminders to students who haven't submitted.

### 3. Parent-Teacher Communication
- Parents can send messages to teachers.
- Teachers can post notices and reply to parents.
- **Real-time communication** - messages and notices appear instantly across all portals.
- All communications are stored in the cloud and persist.

## Roles
- **Teacher**: Manage class, attendance, submissions, notices, and communications.
- **Student**: Mark attendance and submit work.
- **Parent**: View class attendance and communicate with teachers.

## Technologies Used
- HTML5
- CSS (Tailwind CSS)
- JavaScript (ES6+)
- **Firebase Firestore** (Cloud Database)
- **Firebase CDN SDK** (Netlify compatible)

## Key Improvements

### ✅ Cloud Database Integration
- All state is now stored in Firebase Firestore
- No more local JavaScript variables that get lost on refresh
- Shared state across all users and devices
- Data persists permanently

### ✅ Real-Time Updates
- Uses Firestore `onSnapshot()` listeners
- Changes appear instantly across all portals
- No need to refresh the page

### ✅ Multi-User Support
- Multiple teachers, students, and parents can use the system simultaneously
- All see the same data in real-time
- No authentication required (for simplicity)

### ✅ Modular Architecture
- **`firebase.js`**: Firebase initialization and configuration
- **`attendance.js`**: Attendance management module
- **`submissions.js`**: Submissions, deadlines, notices, messages module
- **`app.js`**: Main application logic (orchestrates modules)

## Setup

### Quick Start (After Firebase Configuration)

1. **Configure Firebase** (see `FIREBASE_SETUP.md` for detailed instructions):
   - Create a Firebase project
   - Enable Firestore Database
   - Get your Firebase configuration
   - Update `firebase.js` with your credentials

2. **Open the application**:
   - Open `index.html` in a web browser
   - Or deploy to Netlify (see below)

3. **Select your role** and start using the app!

### Firebase Setup

**Important**: You must configure Firebase before using the application.

See **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** for detailed step-by-step instructions on:
- Creating a Firebase project
- Enabling Firestore
- Setting security rules
- Configuring the application
- Troubleshooting

## Deployment

### Netlify (Recommended)

The application is fully compatible with Netlify static hosting:

1. Push code to a Git repository (GitHub, GitLab, etc.)
2. In Netlify:
   - Add new site → Import existing project
   - Connect repository
   - Build command: (leave empty - static site)
   - Publish directory: `Docere` (or adjust based on your structure)
   - Deploy!

3. **Important**: After deployment, update Firebase configuration in `firebase.js` if needed (or use environment variables)

### Other Static Hosts

The application works with any static web host:
- GitHub Pages
- Vercel
- Firebase Hosting
- AWS S3 + CloudFront
- Any other static hosting service

## Project Structure

```
Docere/
├── index.html              # Main HTML (includes Firebase SDK)
├── firebase.js             # Firebase initialization & configuration
├── attendance.js           # Attendance management module
├── submissions.js          # Submissions, deadlines, notices, messages
├── app.js                  # Main application logic
├── style.css               # Styling
├── README.md               # This file
└── FIREBASE_SETUP.md       # Firebase setup guide
```

## Firestore Database Schema

See `FIREBASE_SETUP.md` for complete schema documentation.

Key collections:
- `classInfo/current` - Class name and strength
- `attendance/current` - Current attendance session status
- `attendance/{date}` - Daily attendance records
- `submissions/currentDeadline` - Current submission deadline
- `submissions/{id}` - Individual submissions
- `notices/current` - Current notice
- `parentMessages/{id}` - Messages from parents
- `parentReplies/latest` - Teacher replies

## Troubleshooting

See `FIREBASE_SETUP.md` for detailed troubleshooting guide.

Common issues:
- **"Firebase SDK not loaded"**: Check script order in `index.html`
- **"Permission denied"**: Check Firestore security rules
- **No real-time updates**: Verify Firestore listeners are set up correctly

## License

This project is open source and available for educational use.
>>>>>>> aff51497ba902a551aef5b49d53f03e5dd5623e9
