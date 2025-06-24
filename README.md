# IDF Reserve Duty Logistics Management App

A comprehensive React + TypeScript + Vite application for managing IDF reserve duty logistics, scheduling, and personnel management. This application provides role-based access control, duty scheduling, availability tracking, and administrative tools for military logistics operations.

## 🚀 Features

- **Role-Based Access Control**: Support for SUPER_ADMIN, COMMANDER, DUTY_OFFICER, NCO, and RESERVIST roles
- **Duty Scheduling**: Create, manage, and assign duty schedules with drag-and-drop functionality
- **Availability Management**: Track personnel availability and preferences
- **Personnel Management**: Comprehensive user profiles with skills, ranks, and contact information
- **Dashboard Analytics**: Real-time statistics and reporting
- **Responsive Design**: Mobile-friendly interface with modern UI components
- **Data Export**: Export schedules and reports to Excel format
- **PWA Support**: Progressive Web App capabilities for offline access

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.18.0 or higher
- **pnpm**: Version 8.0.0 or higher

### Installing Prerequisites

1. **Install Node.js**: Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
2. **Install pnpm**: 
   ```bash
   npm install -g pnpm
   ```

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd idf-logistics-app
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

## 🏃‍♂️ Development

Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

### Other Available Commands

- **Build for production**: `pnpm build`
- **Preview production build**: `pnpm preview`
- **Lint code**: `pnpm lint`

## 🔐 Demo Accounts

The application comes with pre-configured demo accounts for testing different role levels:

| Role | Username | Password | Description |
|------|----------|----------|-------------|
| Super Admin | `admin` | `password` | Full system access |
| Commander | `commander` | `password` | Unit management and oversight |
| Duty Officer | `dutyofficer` | `password` | Duty scheduling and operations |
| NCO | `nco1` | `password` | Squad leadership and training |
| Reservist | `reservist1` | `password` | Basic personnel access |
| Reservist | `reservist2` | `password` | Basic personnel access |

## 🏗️ Architecture

### Current Implementation (Path A - Local Development)

The application currently uses a hybrid data system:

- **Data Storage**: JSON files in `public/data/` directory
- **Authentication**: Client-side JWT-based authentication
- **Persistence**: localStorage for user sessions and preferences
- **Build System**: Vite with TypeScript and React

### Available Migration (Path B - Firebase Integration)

For production deployment with real backend functionality, the application can be migrated to Firebase:

- **Database**: Firestore for real-time data synchronization
- **Authentication**: Firebase Authentication with role management
- **Hosting**: Firebase Hosting for scalable deployment
- **Security**: Firestore security rules for role-based access control

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, Theme, etc.)
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries and API services
├── pages/              # Application pages/routes
├── types/              # TypeScript type definitions
└── utils/              # Helper functions

public/
├── data/               # JSON data files (users, schedules, etc.)
└── assets/             # Static assets
```

## 🔧 Configuration

### Environment Variables

For Firebase integration (Path B), create a `.env` file based on `.env.example`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 🚀 Deployment Options

### Path A: Static Hosting (Current)
Deploy the built application to any static hosting service:
```bash
pnpm build
# Deploy the 'dist' folder to your hosting provider
```

### Path B: Firebase Hosting (Migration Required)
For full Firebase integration with backend functionality:
1. Set up Firebase project
2. Configure environment variables
3. Run data migration script
4. Deploy to Firebase Hosting

See `SETUP.md` for detailed migration instructions.

## 🛡️ Security

- Role-based access control with hierarchical permissions
- JWT-based authentication (local) or Firebase Auth (migrated)
- Input validation and sanitization
- Secure data handling practices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the `SETUP.md` file for detailed setup instructions
- Review the demo accounts and their capabilities
- Ensure all prerequisites are properly installed

## 🔄 Migration Path

This application is designed with two deployment paths:

- **Path A (Current)**: Immediate local development with JSON + localStorage
- **Path B (Optional)**: Firebase migration for production backend functionality

Choose Path A for quick setup and development, or Path B for scalable production deployment with real-time features.
# idf-logistics-app
