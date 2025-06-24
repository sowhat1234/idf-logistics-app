import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Schedule, User, DutyType } from '@/types';
import { apiService } from './api';

export interface GoogleSheetsConfig {
  sheetId?: string;
  apiKey?: string;
  accessToken?: string;
}

export interface ExcelScheduleRow {
  'Personnel Name': string;
  'Email': string;
  'Rank': string;
  'Unit': string;
  'Duty Type': string;
  'Start Date': string;
  'Start Time': string;
  'End Date': string;
  'End Time': string;
  'Status': string;
  'Notes': string;
  'Assigned By': string;
  'Assigned At': string;
}

class SheetsIntegrationService {
  private config: GoogleSheetsConfig = {};

  // Configure Google Sheets integration
  setConfig(config: GoogleSheetsConfig) {
    this.config = config;
    localStorage.setItem('idf_sheets_config', JSON.stringify(config));
  }

  getConfig(): GoogleSheetsConfig {
    const stored = localStorage.getItem('idf_sheets_config');
    return stored ? JSON.parse(stored) : {};
  }

  // Export schedules to Excel/CSV
  async exportSchedulesToExcel(
    schedules: Schedule[], 
    users: User[], 
    dutyTypes: DutyType[],
    format: 'xlsx' | 'csv' = 'xlsx'
  ): Promise<void> {
    try {
      const data: ExcelScheduleRow[] = schedules.map(schedule => {
        const user = users.find(u => u.id === schedule.userId);
        const dutyType = dutyTypes.find(dt => dt.id === schedule.dutyTypeId);
        const assignedByUser = users.find(u => u.id === schedule.assignedBy);

        const startDate = new Date(schedule.startTime);
        const endDate = new Date(schedule.endTime);

        return {
          'Personnel Name': user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          'Email': user?.email || '',
          'Rank': user?.rank || '',
          'Unit': user?.unit || '',
          'Duty Type': dutyType?.name || 'Unknown',
          'Start Date': startDate.toLocaleDateString('en-US'),
          'Start Time': startDate.toLocaleTimeString('en-US', { hour12: false }),
          'End Date': endDate.toLocaleDateString('en-US'),
          'End Time': endDate.toLocaleTimeString('en-US', { hour12: false }),
          'Status': schedule.status,
          'Notes': schedule.notes || '',
          'Assigned By': assignedByUser ? `${assignedByUser.firstName} ${assignedByUser.lastName}` : 'System',
          'Assigned At': new Date(schedule.assignedAt).toLocaleString('en-US'),
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'IDF Schedules');

      // Auto-size columns
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      worksheet['!cols'] = colWidths;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `idf-schedules-${timestamp}.${format}`;

      if (format === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, filename);
      } else {
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, filename);
      }

      return Promise.resolve();
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error('Failed to export schedules');
    }
  }

  // Import schedules from Excel file
  async importSchedulesFromExcel(file: File): Promise<{
    schedules: Omit<Schedule, 'id'>[];
    errors: string[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
    };
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

          const [users, dutyTypes] = await Promise.all([
            apiService.fetchUsers(),
            apiService.fetchDutyTypes(),
          ]);

          const schedules: Omit<Schedule, 'id'>[] = [];
          const errors: string[] = [];

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const rowNum = i + 2; // Excel row number (1-indexed + header)

            try {
              // Validate and parse row data
              const result = this.parseScheduleRow(row, users, dutyTypes, rowNum);
              
              if (result.schedule) {
                schedules.push(result.schedule);
              }
              
              if (result.errors.length > 0) {
                errors.push(...result.errors);
              }
            } catch (error) {
              errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          resolve({
            schedules,
            errors,
            summary: {
              total: jsonData.length,
              valid: schedules.length,
              invalid: jsonData.length - schedules.length,
            },
          });
        } catch (error) {
          reject(new Error('Failed to parse Excel file: ' + (error instanceof Error ? error.message : 'Unknown error')));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private parseScheduleRow(
    row: any, 
    users: User[], 
    dutyTypes: DutyType[], 
    rowNum: number
  ): {
    schedule?: Omit<Schedule, 'id'>;
    errors: string[];
  } {
    const errors: string[] = [];

    // Find user by name or email
    const userName = row['Personnel Name'] || row['Name'] || row['User'] || '';
    const userEmail = row['Email'] || row['personnel_email'] || '';
    
    let user = users.find(u => 
      `${u.firstName} ${u.lastName}`.toLowerCase() === userName.toLowerCase() ||
      u.email.toLowerCase() === userEmail.toLowerCase()
    );

    if (!user && userName) {
      // Try to find by partial name match
      const nameParts = userName.split(' ');
      user = users.find(u => 
        nameParts.some(part => 
          u.firstName.toLowerCase().includes(part.toLowerCase()) ||
          u.lastName.toLowerCase().includes(part.toLowerCase())
        )
      );
    }

    if (!user) {
      errors.push(`Row ${rowNum}: Could not find user "${userName}" or "${userEmail}"`);
      return { errors };
    }

    // Find duty type
    const dutyTypeName = row['Duty Type'] || row['Duty'] || row['Type'] || '';
    const dutyType = dutyTypes.find(dt => 
      dt.name.toLowerCase() === dutyTypeName.toLowerCase() ||
      dt.nameHe === dutyTypeName
    );

    if (!dutyType) {
      errors.push(`Row ${rowNum}: Could not find duty type "${dutyTypeName}"`);
      return { errors };
    }

    // Parse dates and times
    try {
      const startDate = row['Start Date'] || row['Date'] || '';
      const startTime = row['Start Time'] || row['Time'] || '08:00';
      const endDate = row['End Date'] || startDate;
      const endTime = row['End Time'] || '18:00';

      const startDateTime = this.parseDateTime(startDate, startTime);
      const endDateTime = this.parseDateTime(endDate, endTime);

      if (!startDateTime || !endDateTime) {
        errors.push(`Row ${rowNum}: Invalid date/time format`);
        return { errors };
      }

      if (endDateTime <= startDateTime) {
        errors.push(`Row ${rowNum}: End time must be after start time`);
        return { errors };
      }

      const schedule: Omit<Schedule, 'id'> = {
        userId: user.id,
        dutyTypeId: dutyType.id,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        status: this.parseStatus(row['Status'] || 'ASSIGNED'),
        assignedBy: user.id, // Default to the user themselves for imported schedules
        assignedAt: new Date().toISOString(),
        notes: row['Notes'] || row['Description'] || '',
        isOverride: false,
      };

      return { schedule, errors };
    } catch (error) {
      errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Date parsing error'}`);
      return { errors };
    }
  }

  private parseDateTime(dateStr: string, timeStr: string): Date | null {
    try {
      // Handle various date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Try different date formats
        const formats = [
          /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY or M/D/YYYY
          /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
          /^\d{1,2}-\d{1,2}-\d{4}$/, // MM-DD-YYYY or M-D-YYYY
        ];

        let parsedDate: Date | null = null;
        for (const format of formats) {
          if (format.test(dateStr)) {
            parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              break;
            }
          }
        }

        if (!parsedDate || isNaN(parsedDate.getTime())) {
          return null;
        }
        date.setTime(parsedDate.getTime());
      }

      // Parse time
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?/i);
      if (!timeMatch) {
        return null;
      }

      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseInt(timeMatch[3] || '0');
      const ampm = timeMatch[4];

      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }
      }

      date.setHours(hours, minutes, seconds, 0);
      return date;
    } catch {
      return null;
    }
  }

  private parseStatus(status: string): Schedule['status'] {
    const statusMap: Record<string, Schedule['status']> = {
      'assigned': 'ASSIGNED',
      'requested': 'REQUESTED',
      'pending': 'PENDING',
      'cancelled': 'CANCELLED',
      'completed': 'COMPLETED',
    };

    return statusMap[status.toLowerCase()] || 'ASSIGNED';
  }

  // Generate Excel template for import
  generateImportTemplate(): void {
    const templateData: ExcelScheduleRow[] = [
      {
        'Personnel Name': 'David Cohen',
        'Email': 'admin@idf.mil',
        'Rank': 'Major',
        'Unit': 'HQ',
        'Duty Type': 'Guard Duty',
        'Start Date': '2025-06-25',
        'Start Time': '08:00',
        'End Date': '2025-06-25',
        'End Time': '16:00',
        'Status': 'ASSIGNED',
        'Notes': 'Main gate guard duty',
        'Assigned By': 'System',
        'Assigned At': new Date().toLocaleString(),
      },
      {
        'Personnel Name': 'Sarah Levi',
        'Email': 'commander@idf.mil',
        'Rank': 'Captain',
        'Unit': 'Alpha Company',
        'Duty Type': 'Kitchen Duty',
        'Start Date': '2025-06-26',
        'Start Time': '06:00',
        'End Date': '2025-06-26',
        'End Time': '14:00',
        'Status': 'ASSIGNED',
        'Notes': 'Breakfast and lunch preparation',
        'Assigned By': 'System',
        'Assigned At': new Date().toLocaleString(),
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedule Template');

    // Add instructions sheet
    const instructions = [
      ['IDF Schedule Import Template Instructions'],
      [''],
      ['Required Columns:'],
      ['- Personnel Name: Full name of the person (must match existing user)'],
      ['- Email: Email address (alternative to Personnel Name)'],
      ['- Duty Type: Must match existing duty types (Guard Duty, Kitchen Duty, etc.)'],
      ['- Start Date: Format: YYYY-MM-DD or MM/DD/YYYY'],
      ['- Start Time: Format: HH:MM (24-hour) or HH:MM AM/PM'],
      ['- End Date: Format: YYYY-MM-DD or MM/DD/YYYY'],
      ['- End Time: Format: HH:MM (24-hour) or HH:MM AM/PM'],
      [''],
      ['Optional Columns:'],
      ['- Status: ASSIGNED, REQUESTED, PENDING, CANCELLED, COMPLETED'],
      ['- Notes: Additional information'],
      ['- Rank, Unit: For reference only'],
      [''],
      ['Tips:'],
      ['- Remove this instruction sheet before importing'],
      ['- Ensure personnel names/emails match existing users'],
      ['- Use 24-hour time format for best compatibility'],
      ['- End time must be after start time'],
    ];

    const instructionsWS = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(workbook, instructionsWS, 'Instructions');

    // Auto-size columns
    const colWidths = Object.keys(templateData[0]).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'idf-schedule-import-template.xlsx');
  }

  // Simulate Google Sheets integration (would be real API calls in production)
  async syncWithGoogleSheets(schedules: Schedule[], users: User[], dutyTypes: DutyType[]): Promise<{
    success: boolean;
    message: string;
    sheetUrl?: string;
  }> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real implementation, this would:
      // 1. Create or update a Google Sheet
      // 2. Format data for Google Sheets API
      // 3. Handle authentication
      // 4. Sync data bidirectionally

      const config = this.getConfig();
      if (!config.sheetId && !config.apiKey) {
        throw new Error('Google Sheets not configured. Please set up integration in Settings.');
      }

      // Simulate successful sync
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${config.sheetId || 'demo-sheet-id'}/edit`;
      
      return {
        success: true,
        message: `Successfully synced ${schedules.length} schedules to Google Sheets`,
        sheetUrl,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync with Google Sheets',
      };
    }
  }

  // Auto-sync schedules (would run periodically)
  async enableAutoSync(intervalMinutes: number = 30): Promise<void> {
    // In a real implementation, this would set up periodic sync
    localStorage.setItem('idf_auto_sync_interval', intervalMinutes.toString());
    console.log(`Auto-sync enabled for every ${intervalMinutes} minutes`);
  }

  async disableAutoSync(): Promise<void> {
    localStorage.removeItem('idf_auto_sync_interval');
    console.log('Auto-sync disabled');
  }
}

export const sheetsIntegration = new SheetsIntegrationService();