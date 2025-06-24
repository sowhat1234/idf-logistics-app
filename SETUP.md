# IDF Reserve Duty Logistics Management App - Setup Guide

This comprehensive guide provides two distinct setup paths for the IDF Reserve Duty Logistics Management App. Choose the path that best fits your needs and technical requirements.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Path Selection Guide](#path-selection-guide)
- [Path A: Local Development Setup](#path-a-local-development-setup)
- [Path B: Firebase Integration Setup](#path-b-firebase-integration-setup)
- [Demo Accounts](#demo-accounts)
- [Features Overview](#features-overview)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

## 🎯 Overview

The IDF Reserve Duty Logistics Management App is a comprehensive React + TypeScript application designed to streamline military reserve duty scheduling, personnel management, and logistics coordination. The app supports role-based access control with five distinct user roles and provides both local development and cloud-based deployment options.

## 🔧 Prerequisites

### Required for Both Paths
- **Node.js**: Version 18.18.0 or higher
- **pnpm**: Version 8.0.0 or higher
- **Git**: For version control
- **Modern web browser**: Chrome, Firefox, Safari, or Edge

### Installation Commands
```bash
# Install Node.js (if not already installed)
# Download from https://nodejs.org/ or use a version manager like nvm

# Install pnpm globally
npm install -g pnpm

# Verify installations
node --version  # Should be >= 18.18.0
pnpm --version  # Should be >= 8.0.0
```

## 🛤️ Path Selection Guide

### Choose Path A (Local Development) if:
- ✅ You want to get started immediately
- ✅ You're developing or testing locally
- ✅ You don't need real-time collaboration
- ✅ You prefer file-based data storage
- ✅ You want minimal setup complexity
- ✅ You're prototyping or learning

### Choose Path B (Firebase Integration) if:
- ✅ You need a production-ready backend
- ✅ You want real-time data synchronization
- ✅ You need multi-user collaboration
- ✅ You want cloud-based deployment
- ✅ You need scalable data storage
- ✅ You want built-in authentication
- ✅ You plan to deploy to production

---

## 🚀 Path A: Local Development Setup

This path uses JSON files for data storage and localStorage for session management. Perfect for immediate development and testing.

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd idf-logistics-app

# Install dependencies
pnpm install
```

### Step 2: Start Development Server

```bash
# Start the development server
pnpm dev
```

The application will be available at `http://localhost:5173`

### Step 3: Login with Demo Account

Use any of the [demo accounts](#demo-accounts) listed below to access the application.

### Step 4: Development Commands

```bash
# Development server with hot reload
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run linting
pnpm lint
```

### Data Storage (Path A)

- **User data**: `public/data/users.json`
- **Schedules**: `public/data/schedules.json`
- **Duty types**: `public/data/duty-types.json`
- **Availability**: `public/data/availability.json`
- **Session data**: Browser localStorage

### Features Available in Path A

- ✅ Full role-based access control
- ✅ Schedule management and visualization
- ✅ Personnel management
- ✅ Duty assignment and tracking
- ✅ Availability management
- ✅ Reporting and analytics
- ✅ Data export functionality
- ❌ Real-time synchronization
- ❌ Multi-user collaboration
- ❌ Cloud backup

---

## ☁️ Path B: Firebase Integration Setup

This path integrates with Firebase for production-ready backend services including authentication, real-time database, and cloud hosting.

### Step 1: Firebase Project Setup

1. **Create Firebase Project**
   ```bash
   # Go to Firebase Console
   https://console.firebase.google.com/
   
   # Click "Create a project"
   # Enter project name: "idf-logistics-app" (or your preferred name)
   # Enable Google Analytics (optional)
   ```

2. **Enable Required Services**
   - **Authentication**: Go to Authentication > Sign-in method > Enable Email/Password
   - **Firestore Database**: Go to Firestore Database > Create database > Start in test mode
   - **Storage** (optional): Go to Storage > Get started
   - **Hosting**: Go to Hosting > Get started

3. **Get Firebase Configuration**
   - Go to Project Settings > General > Your apps
   - Click "Add app" > Web app
   - Register app with nickname "IDF Logistics Web"
   - Copy the configuration object

### Step 2: Local Environment Setup

```bash
# Clone and install (if not done already)
git clone <repository-url>
cd idf-logistics-app
pnpm install

# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project
firebase init
# Select: Firestore, Functions, Hosting, Storage
# Use existing project: your-project-id
# Accept defaults for most options
```

### Step 3: Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your Firebase configuration
# Uncomment and fill in the values from Step 1.3
```

Example `.env` file:
```env
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_ENVIRONMENT=development
```

### Step 4: Data Migration

```bash
# Run the data migration script
node scripts/migrate-data.js

# This will:
# - Create Firestore collections
# - Migrate JSON data to Firestore
# - Create Firebase Auth accounts for demo users
# - Set up initial data structure
```

### Step 5: Deploy Firestore Rules

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy the application
firebase deploy
```

### Step 6: Access Your Application

- **Local development**: `http://localhost:5173`
- **Firebase hosting**: `https://your-project-id.web.app`

### Firebase Services Configuration

#### Firestore Collections Structure
```
/users/{userId}
  - id, username, email, role, rank, unit, etc.

/schedules/{scheduleId}
  - id, title, startDate, endDate, assignments, etc.

/dutyTypes/{dutyTypeId}
  - id, name, description, requirements, etc.

/availability/{availabilityId}
  - userId, date, status, reason, etc.
```

#### Security Rules
The `firestore.rules` file implements role-based access control:
- **SUPER_ADMIN**: Full access to all data
- **COMMANDER**: Access to unit data and user management
- **DUTY_OFFICER**: Schedule and duty management
- **NCO**: Limited schedule and personnel access
- **RESERVIST**: Personal data and availability only

### Features Available in Path B

- ✅ All Path A features
- ✅ Real-time data synchronization
- ✅ Multi-user collaboration
- ✅ Cloud-based authentication
- ✅ Automatic data backup
- ✅ Scalable infrastructure
- ✅ Production deployment
- ✅ Offline support with sync

---

## 👥 Demo Accounts

The following demo accounts are available for testing different role levels:

### Super Administrator
- **Username**: `admin`
- **Password**: `password`
- **Role**: SUPER_ADMIN
- **Access**: Full system access, user management, all features

### Commander
- **Username**: `commander`
- **Password**: `password`
- **Role**: COMMANDER
- **Access**: Unit management, schedule oversight, personnel coordination

### Duty Officer
- **Username**: `dutyofficer`
- **Password**: `password`
- **Role**: DUTY_OFFICER
- **Access**: Schedule management, duty assignments, operational oversight

### NCO (Non-Commissioned Officer)
- **Username**: `nco1`
- **Password**: `password`
- **Role**: NCO
- **Access**: Squad management, limited scheduling, personnel support

### Reservist
- **Username**: `reservist1` / `reservist2`
- **Password**: `password`
- **Role**: RESERVIST
- **Access**: Personal schedule, availability management, duty viewing

## 🎯 Features Overview

### Core Functionality
- **Role-Based Access Control**: Five distinct user roles with appropriate permissions
- **Schedule Management**: Visual calendar interface with drag-and-drop functionality
- **Personnel Management**: Comprehensive user profiles and skill tracking
- **Duty Assignment**: Automated and manual duty assignment with conflict detection
- **Availability Tracking**: Personal availability management and reporting
- **Real-time Dashboard**: Live statistics and operational overview
- **Reporting System**: Comprehensive reports with export functionality

### User Interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark/Light Theme**: User preference-based theme switching
- **Intuitive Navigation**: Role-based menu system and breadcrumbs
- **Modern UI Components**: Built with Radix UI and Tailwind CSS
- **Accessibility**: WCAG compliant with keyboard navigation support

### Technical Features
- **TypeScript**: Full type safety and enhanced developer experience
- **React 18**: Modern React with hooks and concurrent features
- **Vite**: Fast development server and optimized builds
- **PWA Ready**: Progressive Web App capabilities with offline support
- **Export Functionality**: Excel and PDF export for schedules and reports

## 🔧 Troubleshooting

### Common Issues

#### Path A Issues

**Issue**: Application won't start
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

**Issue**: Login not working
- Verify you're using correct demo account credentials
- Check browser console for errors
- Clear localStorage: `localStorage.clear()`

**Issue**: Data not persisting
- Check if localStorage is enabled in your browser
- Verify you're not in incognito/private mode

#### Path B Issues

**Issue**: Firebase configuration errors
```bash
# Verify environment variables
cat .env

# Check Firebase project settings
firebase projects:list
firebase use your-project-id
```

**Issue**: Firestore permission denied
```bash
# Redeploy security rules
firebase deploy --only firestore:rules

# Check user authentication status
# Verify user roles in Firestore console
```

**Issue**: Data migration fails
```bash
# Run migration with verbose logging
DEBUG=* node scripts/migrate-data.js

# Check Firestore console for partial data
# Verify Firebase project permissions
```

### Performance Issues

**Slow loading times**
- Check network connection
- Verify Firebase project region
- Consider enabling Firestore offline persistence

**Memory issues**
- Close unnecessary browser tabs
- Check for memory leaks in browser dev tools
- Restart development server

### Browser Compatibility

**Supported browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Unsupported features in older browsers**:
- Some ES2020+ features may not work
- CSS Grid and Flexbox required
- LocalStorage required for Path A

## 📞 Support

### Getting Help

1. **Documentation**: Check this setup guide and inline code comments
2. **Issues**: Create GitHub issues for bugs or feature requests
3. **Discussions**: Use GitHub Discussions for questions and community support

### Development Resources

- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Firebase Documentation**: https://firebase.google.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Vite Guide**: https://vitejs.dev/guide/

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### License

This project is licensed under the MIT License. See LICENSE file for details.

---

## 🚀 Quick Start Summary

### Path A (Local Development)
```bash
git clone <repository-url>
cd idf-logistics-app
pnpm install
pnpm dev
# Login with: admin / password
```

### Path B (Firebase Integration)
```bash
git clone <repository-url>
cd idf-logistics-app
pnpm install
# Set up Firebase project and configure .env
node scripts/migrate-data.js
firebase deploy
# Access at your Firebase hosting URL
```

Choose your path and start building! 🎯