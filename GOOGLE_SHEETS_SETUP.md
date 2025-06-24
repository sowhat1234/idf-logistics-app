# Google Sheets Integration Setup Guide

This guide provides step-by-step instructions for setting up Google Sheets integration with the IDF Logistics App. This integration enables real-time synchronization of duty schedules between the application and Google Sheets.

## Prerequisites

Before starting the setup process, ensure you have:

- **Google Cloud Account**: A Google account with access to Google Cloud Console
- **Firebase Project**: An existing Firebase project for the IDF Logistics App
- **Firebase CLI**: Firebase CLI installed and authenticated (`npm install -g firebase-tools`)
- **Admin Access**: Administrative access to the Firebase project
- **Google Workspace/Drive Access**: Ability to create and share Google Sheets
- **Node.js**: Node.js 18+ installed for local development and testing

## Step 1: Google Cloud Console Setup

### 1.1 Create or Select a Google Cloud Project

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. If you don't have a project:
   - Click "Select a project" → "New Project"
   - Enter project name: `idf-logistics-sheets`
   - Select your organization (if applicable)
   - Click "Create"
3. If using an existing project, select it from the project dropdown

### 1.2 Enable Google Sheets API

1. In the Google Cloud Console, navigate to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click on "Google Sheets API" from the results
4. Click **"Enable"** button
5. Wait for the API to be enabled (usually takes a few seconds)

### 1.3 Create a Service Account

1. Navigate to **IAM & Admin** → **Service Accounts**
2. Click **"Create Service Account"**
3. Fill in the service account details:
   - **Service account name**: `idf-sheets-integration`
   - **Service account ID**: `idf-sheets-integration` (auto-generated)
   - **Description**: `Service account for IDF Logistics App Google Sheets integration`
4. Click **"Create and Continue"**
5. For roles, add:
   - **Basic** → **Editor** (for general project access)
   - Or more restrictively: **Service Account User**
6. Click **"Continue"** and then **"Done"**

### 1.4 Generate Service Account Key

1. In the Service Accounts list, click on the newly created service account
2. Go to the **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Select **JSON** format
5. Click **"Create"**
6. The key file will be automatically downloaded
7. **Important**: Store this file securely and never commit it to version control

## Step 2: Firebase Configuration

### 2.1 Extract Service Account Information

From the downloaded JSON key file, you'll need:
- `client_email`: The service account email address
- `private_key`: The private key (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

### 2.2 Set Firebase Functions Configuration

Open your terminal in the project root and run the following commands:

```bash
# Navigate to your project directory
cd /path/to/idf-logistics-app

# Set the Google Sheet ID (you'll get this in Step 3)
firebase functions:config:set google.sheet_id="1VAzD9U9UK96XwZsCqx9_wlV0ZRzK7uKfzIPs16rgY2I"

# Set the service account email
firebase functions:config:set google.sa.client_email="idf-logistics-sheets@main-bloom-340812.iam.gserviceaccount.com"

# Set the private key (replace with your actual private key)
```

**Important Notes:**
- Replace `your-project-id` with your actual Google Cloud project ID
- The private key must include the `\n` characters for line breaks
- Use double quotes to wrap the entire private key value

### 2.3 Verify Configuration

```bash
# View current configuration
firebase functions:config:get

# Should show something like:
# {
#   "google": {
#     "sheet_id": "your-sheet-id",
#     "sa": {
#       "client_email": "idf-sheets-integration@your-project.iam.gserviceaccount.com",
#       "private_key": "-----BEGIN PRIVATE KEY-----\n..."
#     }
#   }
# }
```

## Step 3: Google Sheet Preparation

### 3.1 Create the Target Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **"Blank"** to create a new spreadsheet
3. Rename the sheet to: `IDF Logistics Schedules`
4. Note the Sheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
   - Copy the `SHEET_ID` part

### 3.2 Set Up Column Headers

In the first row of your sheet, add these exact column headers:

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Personnel Name | Email | Rank | Unit | Duty Type | Start Date | Start Time | End Date | End Time | Status | Notes | Assigned By | Assigned At |

**Important**: The column headers must match exactly (case-sensitive) as they correspond to the `ExcelScheduleRow` interface in the application.

### 3.3 Share Sheet with Service Account

1. In your Google Sheet, click the **"Share"** button (top-right)
2. In the "Add people and groups" field, enter the service account email:
   ```
   idf-logistics-sheets@main-bloom-340812.iam.gserviceaccount.com
   ```
3. Set permission level to **"Editor"**
4. Uncheck **"Notify people"** (since it's a service account)
5. Click **"Share"**

### 3.4 Update Firebase Configuration with Sheet ID

```bash
# Update the sheet ID with the actual ID from your Google Sheet URL
firebase functions:config:set google.sheet_id="1VAzD9U9UK96XwZsCqx9_wlV0ZRzK7uKfzIPs16rgY2I"
```

## Step 4: Deploy Firebase Functions

### 4.1 Install Dependencies

```bash
# Navigate to functions directory
cd functions

# Install required packages
npm install googleapis

# Return to project root
cd ..
```

### 4.2 Deploy Functions

```bash
# Deploy the functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:syncToSheet,functions:pullSchedules
```

### 4.3 Note the Function URLs

After deployment, note the function URLs from the output:
```
✔  functions[syncToSheet(us-central1)]: Successful create operation.
Function URL (syncToSheet): https://us-central1-your-project.cloudfunctions.net/syncToSheet

✔  functions[pullSchedules(us-central1)]: Successful create operation.
Function URL (pullSchedules): https://us-central1-your-project.cloudfunctions.net/pullSchedules
```

## Step 5: Application Configuration

### 5.1 Configure the App

1. Open the IDF Logistics App
2. Navigate to **Settings** → **Import/Export**
3. In the Google Sheets Integration section:
   - **Functions URL**: `https://us-central1-your-project.cloudfunctions.net`
   - **Sheet ID**: Your Google Sheet ID from Step 3.1
   - **Auto-sync Interval**: `30` (minutes, or your preferred interval)
4. Click **"Save Configuration"**

## Step 6: Testing Instructions

### 6.1 Test Manual Sync

1. In the app, create a few test duty schedules
2. Go to **Import/Export** → **Google Sheets**
3. Click **"Sync to Google Sheets"**
4. Check your Google Sheet - the data should appear within a few seconds
5. Verify that all columns are populated correctly

### 6.2 Test Data Pull

1. Manually add a row to your Google Sheet with valid data:
   - Personnel Name: Use an existing user's full name
   - Duty Type: Use an existing duty type name
   - Dates/Times: Use valid date and time formats
2. In the app, click **"Pull from Google Sheets"** (if available in UI)
3. Or wait for auto-sync to trigger
4. Verify the new schedule appears in the app

### 6.3 Test Auto-Sync

1. Enable auto-sync in the app settings
2. Set a short interval (5 minutes) for testing
3. Make changes in both the app and Google Sheet
4. Wait for the sync interval to pass
5. Verify changes are synchronized in both directions

### 6.4 Test Error Handling

1. Temporarily change the Sheet ID to an invalid value
2. Try to sync - should show appropriate error message
3. Restore correct Sheet ID
4. Test with invalid data formats in the sheet
5. Verify error messages are helpful and specific

## Step 7: Security Best Practices

### 7.1 Service Account Security

- **Never commit** the service account JSON file to version control
- **Rotate keys** periodically (every 90 days recommended)
- **Use least privilege**: Only grant necessary permissions
- **Monitor usage** in Google Cloud Console → IAM & Admin → Service Accounts

### 7.2 Sheet Permissions

- **Limit access**: Only share the sheet with necessary personnel
- **Use viewer permissions** for users who only need to read data
- **Regular audits**: Periodically review who has access to the sheet
- **Backup data**: Keep regular backups of important schedule data

### 7.3 Firebase Functions Security

- **Environment variables**: Never hardcode sensitive data in functions
- **CORS configuration**: Restrict origins to your app's domain in production
- **Rate limiting**: Implement rate limiting to prevent abuse
- **Monitoring**: Set up alerts for unusual function usage

### 7.4 Data Protection

- **Encryption in transit**: All data is encrypted via HTTPS
- **Access logging**: Monitor who accesses and modifies data
- **Data retention**: Implement policies for how long to keep schedule data
- **Compliance**: Ensure setup meets your organization's security requirements

## Troubleshooting

### Common Issues

**"Permission denied" errors:**
- Verify the service account has access to the sheet
- Check that the service account email is correct
- Ensure the sheet is shared with "Editor" permissions

**"Sheet not found" errors:**
- Verify the Sheet ID is correct
- Check that the sheet exists and is accessible
- Ensure the service account has been granted access

**"Invalid credentials" errors:**
- Verify the private key is correctly formatted with `\n` line breaks
- Check that the client_email matches the service account
- Ensure the service account key hasn't expired

**Function deployment failures:**
- Check that all required dependencies are installed
- Verify Firebase CLI is authenticated
- Ensure you have the necessary permissions in the Firebase project

**Data format issues:**
- Verify column headers match exactly (case-sensitive)
- Check date/time formats are valid
- Ensure personnel names match existing users in the app

### Getting Help

If you encounter issues not covered in this guide:

1. Check the Firebase Functions logs: `firebase functions:log`
2. Review the browser console for client-side errors
3. Verify all configuration values are correct
4. Test with a minimal dataset first
5. Contact support at: support@traycer.ai

## Maintenance

### Regular Tasks

- **Monitor function usage** and costs in Firebase Console
- **Review sheet access** permissions monthly
- **Update dependencies** in functions/package.json
- **Backup configuration** settings and sheet data
- **Test sync functionality** after any app updates

### Updates and Changes

When updating the integration:
1. Test changes in a development environment first
2. Deploy functions during low-usage periods
3. Notify users of any expected downtime
4. Keep rollback procedures ready
5. Monitor for issues after deployment

---

**Note**: This setup guide assumes you're using the standard Firebase Functions deployment. For custom deployments or enterprise environments, additional configuration may be required.