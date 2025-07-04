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
- **Real-time Google Sheets Synchronization**: Automated bidirectional sync with Google Sheets
- **Automated Conflict Detection and Resolution**: Smart handling of concurrent data changes
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

## 📊 Google Sheets Integration

The application supports real-time bidirectional synchronization with Google Sheets for collaborative schedule management and external data integration.

### Features

- **Manual Sync**: On-demand synchronization of schedules to/from Google Sheets
- **Auto-Sync**: Automated polling for real-time updates (configurable intervals)
- **Conflict Resolution**: Timestamp-based conflict detection and resolution
- **Role-Based Access**: Permission-controlled sync operations
- **Data Validation**: Automatic format validation and error handling

### Setup Requirements

1. **Google Cloud Project** with Sheets API enabled
2. **Service Account** with appropriate permissions
3. **Firebase Functions** deployed with Google Sheets endpoints
4. **Target Google Sheet** shared with service account

### Service Account Setup

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

#### Step 2: Create Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Provide name: `idf-logistics-sheets`
4. Grant role: "Editor" or "Viewer" (depending on needs)
5. Click "Done"

#### Step 3: Generate Credentials

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Download the key file (keep secure!)

#### Step 4: Configure Firebase Functions

Set the required environment variables using Firebase CLI:

```bash
# Set the Google Sheet ID (from the sheet URL)
firebase functions:config:set google.sheet_id="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

# Set service account email
firebase functions:config:set google.sa.client_email="idf-logistics-sheets@your-project.iam.gserviceaccount.com"

# Set service account private key (escape newlines)
firebase functions:config:set google.sa.private_key="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC..."
```

#### Step 5: Share Google Sheet

1. Open your target Google Sheet
2. Click "Share" button
3. Add the service account email with "Editor" permissions
4. Ensure "Notify people" is unchecked

### Google Sheet Format

The Google Sheet must have the following column headers (matching Excel export format):

| Column | Header | Description |
|--------|--------|-------------|
| A | Date | Schedule date (YYYY-MM-DD) |
| B | Shift | Shift type (Morning, Evening, Night) |
| C | Location | Duty location |
| D | Assigned Personnel | Comma-separated user IDs |
| E | Required Personnel | Number of required personnel |
| F | Duty Type | Type of duty assignment |
| G | Status | Schedule status |
| H | Notes | Additional notes |

### Configuration

#### Environment Variables

For Firebase integration with Google Sheets, configure these variables:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Sheets Integration (set via Firebase Functions config)
# google.sheet_id=your_google_sheet_id
# google.sa.client_email=service_account_email
# google.sa.private_key=service_account_private_key
```

#### Application Settings

Configure Google Sheets integration in the app settings:

1. Navigate to Settings > Import/Export
2. Enable "Google Sheets Integration"
3. Set Cloud Functions URL (e.g., `https://your-region-your-project.cloudfunctions.net`)
4. Configure auto-sync interval (default: 5 minutes)
5. Test connection with "Test Sync" button

### Usage Instructions

#### Manual Synchronization

1. **Export to Sheets**:
   - Go to Import/Export dialog
   - Click "Sync to Google Sheets"
   - Confirm the operation
   - Monitor sync progress

2. **Import from Sheets**:
   - Click "Pull from Google Sheets"
   - Review detected changes
   - Resolve any conflicts
   - Apply changes

#### Auto-Sync Setup

1. **Enable Auto-Sync**:
   - Toggle "Enable Auto-Sync" in Import/Export dialog
   - Set polling interval (1-60 minutes)
   - Auto-sync runs in background

2. **Monitor Status**:
   - Check last sync timestamp
   - View sync status indicators
   - Review conflict notifications

#### Conflict Resolution

When conflicts are detected:

1. **Review Conflicts**: System shows conflicting records
2. **Choose Resolution**: Select local or remote version
3. **Apply Changes**: Confirm resolution strategy
4. **Verify Results**: Check final synchronized data

### Troubleshooting

#### Common Issues

**Authentication Errors**
```
Error: Request had invalid authentication credentials
```
- Verify service account credentials are correctly set
- Check that private key is properly escaped
- Ensure service account has access to the sheet

**Permission Denied**
```
Error: The caller does not have permission
```
- Verify sheet is shared with service account email
- Check service account has "Editor" role
- Confirm Google Sheets API is enabled

**Quota Exceeded**
```
Error: Quota exceeded for quota metric 'Read requests'
```
- Reduce auto-sync frequency
- Implement exponential backoff
- Consider upgrading Google Cloud quota

**Network/Connection Issues**
```
Error: Failed to fetch
```
- Check internet connectivity
- Verify Firebase Functions are deployed
- Test Cloud Functions endpoints directly

**Data Format Errors**
```
Error: Invalid data format
```
- Verify Google Sheet column headers match expected format
- Check for empty required fields
- Validate date formats (YYYY-MM-DD)

#### Debug Steps

1. **Test Firebase Functions**:
   ```bash
   curl -X GET "https://your-region-your-project.cloudfunctions.net/pullSchedules"
   ```

2. **Verify Configuration**:
   ```bash
   firebase functions:config:get
   ```

3. **Check Function Logs**:
   ```bash
   firebase functions:log
   ```

4. **Validate Sheet Access**:
   - Open sheet URL directly
   - Verify service account is listed in sharing settings
   - Test manual edit permissions

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
- Review the `GOOGLE_SHEETS_SETUP.md` for Google Sheets integration
- Review the demo accounts and their capabilities
- Ensure all prerequisites are properly installed
- For Google Sheets issues, check the troubleshooting section above

## 🔄 Migration Path

This application is designed with two deployment paths:

- **Path A (Current)**: Immediate local development with JSON + localStorage
- **Path B (Optional)**: Firebase migration for production backend functionality

Choose Path A for quick setup and development, or Path B for scalable production deployment with real-time features.
# idf-logistics-app
#   i d f - l o g i s t i c s - a p p 
 
 
