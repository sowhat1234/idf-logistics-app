/**
 * IDF Logistics App - Google Sheets Integration Cloud Functions
 * 
 * This module provides HTTP endpoints for bidirectional synchronization
 * between the IDF Logistics App and Google Sheets.
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const functions = require("firebase-functions");
const logger = require("firebase-functions/logger");
const {google} = require("googleapis");
const cors = require("cors")({origin: true});

// For cost control, set maximum number of containers
setGlobalOptions({ maxInstances: 10 });

/**
 * Initialize Google Sheets API client with service account authentication
 */
function getGoogleSheetsClient() {
  const config = functions.config();
  
  if (!config.google || !config.google.sa || !config.google.sheet_id) {
    throw new Error("Google Sheets configuration missing. Please set google.sa.client_email, google.sa.private_key, and google.sheet_id");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.google.sa.client_email,
      private_key: config.google.sa.private_key.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    sheetId: config.google.sheet_id,
  };
}

/**
 * Convert schedule data to ExcelScheduleRow format for Google Sheets
 */
function formatScheduleForSheets(schedule, users, dutyTypes) {
  const user = users.find(u => u.id === schedule.userId);
  const dutyType = dutyTypes.find(dt => dt.id === schedule.dutyTypeId);
  const assignedByUser = users.find(u => u.id === schedule.assignedBy);

  const startDate = new Date(schedule.startTime);
  const endDate = new Date(schedule.endTime);

  return [
    user ? `${user.firstName} ${user.lastName}` : 'Unknown',
    user?.email || '',
    user?.rank || '',
    user?.unit || '',
    dutyType?.name || 'Unknown',
    startDate.toLocaleDateString('en-US'),
    startDate.toLocaleTimeString('en-US', { hour12: false }),
    endDate.toLocaleDateString('en-US'),
    endDate.toLocaleTimeString('en-US', { hour12: false }),
    schedule.status,
    schedule.notes || '',
    assignedByUser ? `${assignedByUser.firstName} ${assignedByUser.lastName}` : 'System',
    new Date(schedule.assignedAt).toLocaleString('en-US'),
  ];
}

/**
 * Parse Google Sheets row back to schedule format
 */
function parseSheetRowToSchedule(row, users, dutyTypes) {
  if (!row || row.length < 13) {
    return null;
  }

  const [
    personnelName, email, rank, unit, dutyTypeName,
    startDate, startTime, endDate, endTime,
    status, notes, assignedBy, assignedAt
  ] = row;

  // Find user by name or email
  let user = users.find(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase() === personnelName.toLowerCase() ||
    u.email.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    logger.warn(`User not found: ${personnelName} (${email})`);
    return null;
  }

  // Find duty type
  const dutyType = dutyTypes.find(dt => 
    dt.name.toLowerCase() === dutyTypeName.toLowerCase()
  );

  if (!dutyType) {
    logger.warn(`Duty type not found: ${dutyTypeName}`);
    return null;
  }

  // Parse dates
  try {
    const startDateTime = new Date(`${startDate} ${startTime}`);
    const endDateTime = new Date(`${endDate} ${endTime}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      logger.warn(`Invalid date format: ${startDate} ${startTime} - ${endDate} ${endTime}`);
      return null;
    }

    return {
      userId: user.id,
      dutyTypeId: dutyType.id,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      status: status || 'ASSIGNED',
      assignedBy: user.id,
      assignedAt: assignedAt ? new Date(assignedAt).toISOString() : new Date().toISOString(),
      notes: notes || '',
      isOverride: false,
      lastSyncedAt: new Date().toISOString(),
      syncSource: 'sheets',
    };
  } catch (error) {
    logger.warn(`Error parsing dates for row: ${personnelName}`, error);
    return null;
  }
}

/**
 * POST /syncToSheet - Push schedule data to Google Sheets
 */
exports.syncToSheet = onRequest({ cors: true }, async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Validate request method
      if (req.method !== 'POST') {
        return res.status(405).json({ 
          success: false, 
          message: 'Method not allowed. Use POST.' 
        });
      }

      // Validate request body
      const { schedules, users, dutyTypes } = req.body;
      
      if (!schedules || !users || !dutyTypes) {
        return res.status(400).json({
          success: false,
          message: 'Missing required data: schedules, users, and dutyTypes are required'
        });
      }

      if (!Array.isArray(schedules) || !Array.isArray(users) || !Array.isArray(dutyTypes)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data format: schedules, users, and dutyTypes must be arrays'
        });
      }

      logger.info(`Syncing ${schedules.length} schedules to Google Sheets`);

      // Initialize Google Sheets client
      const { sheets, sheetId } = getGoogleSheetsClient();

      // Prepare header row
      const headerRow = [
        'Personnel Name', 'Email', 'Rank', 'Unit', 'Duty Type',
        'Start Date', 'Start Time', 'End Date', 'End Time',
        'Status', 'Notes', 'Assigned By', 'Assigned At'
      ];

      // Format schedule data
      const dataRows = schedules.map(schedule => 
        formatScheduleForSheets(schedule, users, dutyTypes)
      );

      // Prepare values for batch update
      const values = [headerRow, ...dataRows];

      // Clear existing data and write new data
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: 'A:M',
      });

      const result = await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values,
        },
      });

      logger.info(`Successfully updated ${result.data.updatedRows} rows in Google Sheets`);

      return res.status(200).json({
        success: true,
        message: `Successfully synced ${schedules.length} schedules to Google Sheets`,
        recordsUpdated: schedules.length,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        updatedRows: result.data.updatedRows,
      });

    } catch (error) {
      logger.error('Error syncing to Google Sheets:', error);

      // Handle specific error types
      if (error.message.includes('configuration missing')) {
        return res.status(500).json({
          success: false,
          message: 'Google Sheets integration not configured. Please contact administrator.',
        });
      }

      if (error.code === 403) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Please check service account permissions.',
        });
      }

      if (error.code === 429) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded. Please try again later.',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to sync with Google Sheets: ' + error.message,
      });
    }
  });
});

/**
 * GET /pullSchedules - Fetch latest data from Google Sheets
 */
exports.pullSchedules = onRequest({ cors: true }, async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Validate request method
      if (req.method !== 'GET') {
        return res.status(405).json({ 
          success: false, 
          message: 'Method not allowed. Use GET.' 
        });
      }

      // Get users and duty types from query parameters or request body
      const users = req.query.users ? JSON.parse(req.query.users) : req.body?.users;
      const dutyTypes = req.query.dutyTypes ? JSON.parse(req.query.dutyTypes) : req.body?.dutyTypes;

      if (!users || !dutyTypes) {
        return res.status(400).json({
          success: false,
          message: 'Missing required data: users and dutyTypes are required'
        });
      }

      logger.info('Pulling schedules from Google Sheets');

      // Initialize Google Sheets client
      const { sheets, sheetId } = getGoogleSheetsClient();

      // Fetch data from Google Sheets
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'A:M',
      });

      const rows = result.data.values;
      
      if (!rows || rows.length <= 1) {
        return res.status(200).json({
          success: true,
          schedules: [],
          message: 'No schedule data found in Google Sheets',
          recordsFound: 0,
        });
      }

      // Skip header row and parse data
      const dataRows = rows.slice(1);
      const schedules = [];
      const errors = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2; // Excel row number (1-indexed + header)

        try {
          const schedule = parseSheetRowToSchedule(row, users, dutyTypes);
          if (schedule) {
            schedules.push(schedule);
          } else {
            errors.push(`Row ${rowNum}: Could not parse schedule data`);
          }
        } catch (error) {
          errors.push(`Row ${rowNum}: ${error.message}`);
        }
      }

      logger.info(`Successfully parsed ${schedules.length} schedules from Google Sheets`);

      return res.status(200).json({
        success: true,
        schedules: schedules,
        message: `Successfully pulled ${schedules.length} schedules from Google Sheets`,
        recordsFound: schedules.length,
        errors: errors.length > 0 ? errors : undefined,
        lastSyncedAt: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error pulling from Google Sheets:', error);

      // Handle specific error types
      if (error.message.includes('configuration missing')) {
        return res.status(500).json({
          success: false,
          message: 'Google Sheets integration not configured. Please contact administrator.',
        });
      }

      if (error.code === 403) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Please check service account permissions.',
        });
      }

      if (error.code === 429) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded. Please try again later.',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to pull from Google Sheets: ' + error.message,
      });
    }
  });
});

/**
 * Scheduled function for background sync (runs every 30 minutes)
 * This is optional and can be enabled/disabled as needed
 */
exports.scheduledSync = onSchedule('*/30 * * * *', async (event) => {
  try {
    logger.info('Running scheduled Google Sheets sync');

    // In a real implementation, this would:
    // 1. Fetch current schedules from Firestore
    // 2. Pull latest data from Google Sheets
    // 3. Perform conflict resolution
    // 4. Update Firestore with merged data
    // 5. Optionally notify users of conflicts

    // For now, just log that the function ran
    logger.info('Scheduled sync completed successfully');

  } catch (error) {
    logger.error('Error in scheduled sync:', error);
  }
});
