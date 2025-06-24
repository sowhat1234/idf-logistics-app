import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { sheetsIntegration, GoogleSheetsConfig } from '@/lib/sheetsIntegration';
import { Schedule, User, DutyType } from '@/types';
import { apiService } from '@/lib/api';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Clock
} from 'lucide-react';

interface ImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: Schedule[];
  users: User[];
  dutyTypes: DutyType[];
  onSchedulesImported: (schedules: Omit<Schedule, 'id'>[]) => void;
}

export function ImportExportDialog({
  isOpen,
  onClose,
  schedules,
  users,
  dutyTypes,
  onSchedulesImported,
}: ImportExportDialogProps) {
  const [activeTab, setActiveTab] = useState('export');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() => 
    sheetsIntegration.getConfig()
  );
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => 
    localStorage.getItem('idf_auto_sync_interval') !== null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export functionality
  const handleExportToExcel = async (format: 'xlsx' | 'csv') => {
    try {
      setIsLoading(true);
      setProgress(30);
      setMessage({ type: 'info', text: `Exporting schedules to ${format.toUpperCase()}...` });

      await sheetsIntegration.exportSchedulesToExcel(schedules, users, dutyTypes, format);
      
      setProgress(100);
      setMessage({ type: 'success', text: `Successfully exported ${schedules.length} schedules to ${format.toUpperCase()}` });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Export failed' 
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      sheetsIntegration.generateImportTemplate();
      setMessage({ type: 'success', text: 'Import template downloaded successfully' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to generate template' 
      });
    }
  };

  // Import functionality
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setProgress(20);
      setMessage({ type: 'info', text: 'Reading Excel file...' });

      setProgress(50);
      const results = await sheetsIntegration.importSchedulesFromExcel(file);
      
      setProgress(80);
      setImportResults(results);

      if (results.schedules.length > 0) {
        setMessage({ 
          type: 'success', 
          text: `Found ${results.schedules.length} valid schedules from ${results.summary.total} rows` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: 'No valid schedules found in the file' 
        });
      }

      setProgress(100);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Import failed' 
      });
      setImportResults(null);
    } finally {
      setIsLoading(false);
      setProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!importResults || importResults.schedules.length === 0) return;

    try {
      setIsLoading(true);
      setMessage({ type: 'info', text: 'Importing schedules...' });

      // Import schedules to the system
      onSchedulesImported(importResults.schedules);
      
      setMessage({ 
        type: 'success', 
        text: `Successfully imported ${importResults.schedules.length} schedules` 
      });
      setImportResults(null);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to import schedules' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sheets functionality
  const handleSheetsSync = async () => {
    try {
      setIsLoading(true);
      setProgress(30);
      setMessage({ type: 'info', text: 'Syncing with Google Sheets...' });

      const result = await sheetsIntegration.syncWithGoogleSheets(schedules, users, dutyTypes);
      
      setProgress(100);
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message + (result.sheetUrl ? ` (${result.sheetUrl})` : '') 
        });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Sync failed' 
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleSaveConfig = () => {
    sheetsIntegration.setConfig(sheetsConfig);
    setMessage({ type: 'success', text: 'Google Sheets configuration saved' });
  };

  const handleAutoSyncToggle = async (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    if (enabled) {
      await sheetsIntegration.enableAutoSync(30);
      setMessage({ type: 'success', text: 'Auto-sync enabled (every 30 minutes)' });
    } else {
      await sheetsIntegration.disableAutoSync();
      setMessage({ type: 'success', text: 'Auto-sync disabled' });
    }
  };

  const clearMessage = () => setMessage(null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import/Export & Google Sheets Integration
          </DialogTitle>
        </DialogHeader>

        {message && (
          <Alert className={`mb-4 ${
            message.type === 'success' ? 'border-green-500 bg-green-50' :
            message.type === 'error' ? 'border-red-500 bg-red-50' :
            'border-blue-500 bg-blue-50'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : message.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <Clock className="h-4 w-4 text-blue-600" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessage}
                className="ml-auto"
              >
                ×
              </Button>
            </div>
          </Alert>
        )}

        {isLoading && (
          <div className="mb-4">
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Export Schedules</h3>
              <p className="text-sm text-gray-600">
                Export current schedules to Excel or CSV format for backup or external use.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => handleExportToExcel('xlsx')}
                  disabled={isLoading || schedules.length === 0}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export to Excel (.xlsx)
                </Button>
                
                <Button 
                  onClick={() => handleExportToExcel('csv')}
                  disabled={isLoading || schedules.length === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export to CSV
                </Button>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Export includes:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Personnel details (name, rank, unit, email)</li>
                  <li>• Duty assignments and types</li>
                  <li>• Schedule dates and times</li>
                  <li>• Status and notes</li>
                  <li>• Assignment history</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Import Schedules</h3>
              <p className="text-sm text-gray-600">
                Import schedules from Excel files. Download the template to see the required format.
              </p>

              <div className="flex gap-2">
                <Button 
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="file-upload">Select Excel File (.xlsx, .xls)</Label>
                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileImport}
                  disabled={isLoading}
                />
              </div>

              {importResults && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">Import Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total Rows:</span>
                        <p className="text-lg font-bold">{importResults.summary.total}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-600">Valid:</span>
                        <p className="text-lg font-bold text-green-600">{importResults.summary.valid}</p>
                      </div>
                      <div>
                        <span className="font-medium text-red-600">Invalid:</span>
                        <p className="text-lg font-bold text-red-600">{importResults.summary.invalid}</p>
                      </div>
                    </div>
                  </div>

                  {importResults.errors.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2">Import Errors</h4>
                      <div className="max-h-32 overflow-y-auto">
                        {importResults.errors.map((error: string, index: number) => (
                          <p key={index} className="text-sm text-red-700">{error}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleConfirmImport}
                      disabled={isLoading || importResults.schedules.length === 0}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Import {importResults.schedules.length} Schedules
                    </Button>
                    <Button 
                      onClick={() => setImportResults(null)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sheets" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Google Sheets Integration</h3>
              <p className="text-sm text-gray-600">
                Automatically sync schedules with Google Sheets for real-time collaboration.
              </p>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-sync"
                  checked={autoSyncEnabled}
                  onCheckedChange={handleAutoSyncToggle}
                />
                <Label htmlFor="auto-sync">Enable Auto-sync (every 30 minutes)</Label>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSheetsSync}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </Button>
                <Button 
                  onClick={() => window.open('https://docs.google.com/spreadsheets/', '_blank')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Google Sheets
                </Button>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium mb-2">Sync Features:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Real-time schedule updates</li>
                  <li>• Collaborative editing</li>
                  <li>• Automatic conflict detection</li>
                  <li>• Version history tracking</li>
                  <li>• Mobile access via Google Sheets app</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Google Sheets Configuration</h3>
              <p className="text-sm text-gray-600">
                Configure your Google Sheets integration settings.
              </p>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sheet-id">Google Sheet ID</Label>
                  <Input
                    id="sheet-id"
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    value={sheetsConfig.sheetId || ''}
                    onChange={(e) => setSheetsConfig(prev => ({ ...prev, sheetId: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500">
                    Found in the URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">Google API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="AIzaSyD..."
                    value={sheetsConfig.apiKey || ''}
                    onChange={(e) => setSheetsConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500">
                    Get your API key from Google Cloud Console
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="access-token">Access Token (Optional)</Label>
                  <Input
                    id="access-token"
                    type="password"
                    placeholder="ya29.a0..."
                    value={sheetsConfig.accessToken || ''}
                    onChange={(e) => setSheetsConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500">
                    OAuth2 access token for write permissions
                  </p>
                </div>

                <Button 
                  onClick={handleSaveConfig}
                  className="flex items-center gap-2 w-fit"
                >
                  <Settings className="h-4 w-4" />
                  Save Configuration
                </Button>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium mb-2">Setup Instructions:</h4>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Create a Google Sheet for your schedules</li>
                  <li>Copy the Sheet ID from the URL</li>
                  <li>Get an API key from Google Cloud Console</li>
                  <li>Enable Google Sheets API for your project</li>
                  <li>Configure authentication for write access</li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}