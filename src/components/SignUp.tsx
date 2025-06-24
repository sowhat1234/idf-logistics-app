import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Lock, 
  Shield, 
  MapPin, 
  Phone, 
  Calendar,
  AlertCircle,
  ArrowLeft,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';

interface SignUpProps {
  onBackToLogin: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onBackToLogin }) => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '',
    
    // Military Information
    serviceNumber: '',
    rank: '',
    unit: '',
    specialization: '',
    yearsOfService: '',
    
    // System Access
    role: 'RESERVIST' as const,
    
    // Terms
    acceptTerms: false,
    acceptPrivacy: false,
  });

  const ranks = [
    'טוראי (Private)',
    'רב טוראי (Corporal)', 
    'סמל (Sergeant)',
    'סמל ראשון (Staff Sergeant)',
    'רב סמל (Master Sergeant)',
    'רב סמל מתקדם (Senior Master Sergeant)',
    'סגן (Second Lieutenant)',
    'סגן משנה (First Lieutenant)',
    'סרן (Captain)',
    'רב סרן (Major)',
    'סא"ל (Lieutenant Colonel)',
    'אל"מ (Colonel)',
  ];

  const units = [
    'חטיבת גולני',
    'חטיבת גבעתי',
    'חטיבת הנח"ל',
    'חטיבת צנחנים',
    'חיל השריון',
    'חיל התותחנים',
    'חיל ההנדסה',
    'חיל הקשר',
    'חיל הרפואה',
    'חיל האוויר',
    'חיל הים',
    'יחידה מיוחדת',
    'אחר',
  ];

  const specializations = [
    'קרבי',
    'טכנולוגיה ותחזוקה',
    'מודיעין',
    'לוגיסטיקה',
    'רפואה',
    'תקשורת',
    'הנדסה',
    'אחר',
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.firstName || !formData.lastName) {
      setError('שם פרטי ושם משפחה נדרשים');
      return false;
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('אימייל תקין נדרש');
      return false;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('סיסמה חייבת להכיל לפחות 6 תווים');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('סיסמאות אינן תואמות');
      return false;
    }

    if (!formData.serviceNumber || formData.serviceNumber.length < 7) {
      setError('מספר אישי תקין נדרש (7 ספרות לפחות)');
      return false;
    }

    if (!formData.rank || !formData.unit) {
      setError('דרגה ויחידה נדרשים');
      return false;
    }

    if (!formData.acceptTerms || !formData.acceptPrivacy) {
      setError('יש לאשר את תנאי השימוש ומדיניות הפרטיות');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Create new user
      const newUser = await apiService.createUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        serviceNumber: formData.serviceNumber,
        rank: formData.rank,
        unit: formData.unit,
        specialization: formData.specialization,
        yearsOfService: parseInt(formData.yearsOfService) || 0,
        role: formData.role,
        status: 'ACTIVE',
        joinedAt: new Date().toISOString(),
      });

      // Automatically log in the new user
      await login(formData.email, formData.password);
      
    } catch (error: any) {
      setError(error.message || 'שגיאה ביצירת המשתמש');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto shadow-2xl">
        <CardHeader className="text-center space-y-1">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/images/idf-logo.png" 
              alt="IDF Logo" 
              className="h-16 w-16 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            הרשמה למערכת ניהול מילואים
          </CardTitle>
          <CardDescription className="text-gray-600">
            יצירת חשבון חדש למילואימניקים
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                מידע אישי
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>שם פרטי *</span>
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="הכנס שם פרטי"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="lastName">שם משפחה *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="הכנס שם משפחה"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>אימייל *</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="example@email.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password" className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>סיסמה *</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="לפחות 6 תווים"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">אישור סיסמה *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="חזור על הסיסמה"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>טלפון</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="05X-XXXXXXX"
                  />
                </div>

                <div>
                  <Label htmlFor="dateOfBirth" className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>תאריך לידה</span>
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Military Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                מידע צבאי
              </h3>

              <div>
                <Label htmlFor="serviceNumber" className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>מספר אישי *</span>
                </Label>
                <Input
                  id="serviceNumber"
                  type="text"
                  value={formData.serviceNumber}
                  onChange={(e) => handleInputChange('serviceNumber', e.target.value)}
                  placeholder="1234567"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rank">דרגה *</Label>
                  <Select 
                    value={formData.rank} 
                    onValueChange={(value) => handleInputChange('rank', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר דרגה" />
                    </SelectTrigger>
                    <SelectContent>
                      {ranks.map(rank => (
                        <SelectItem key={rank} value={rank}>
                          {rank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="unit" className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>יחידה *</span>
                  </Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(value) => handleInputChange('unit', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר יחידה" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="specialization">התמחות</Label>
                  <Select 
                    value={formData.specialization} 
                    onValueChange={(value) => handleInputChange('specialization', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר התמחות" />
                    </SelectTrigger>
                    <SelectContent>
                      {specializations.map(spec => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="yearsOfService">שנות שירות</Label>
                  <Input
                    id="yearsOfService"
                    type="number"
                    min="0"
                    max="40"
                    value={formData.yearsOfService}
                    onChange={(e) => handleInputChange('yearsOfService', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => handleInputChange('acceptTerms', !!checked)}
                />
                <Label htmlFor="acceptTerms" className="text-sm leading-5">
                  אני מסכים לתנאי השימוש ולתקנון המערכת *
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptPrivacy"
                  checked={formData.acceptPrivacy}
                  onCheckedChange={(checked) => handleInputChange('acceptPrivacy', !!checked)}
                />
                <Label htmlFor="acceptPrivacy" className="text-sm leading-5">
                  אני מסכים למדיניות הפרטיות ולהגנת המידע *
                </Label>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={loading}
              >
                {loading ? (
                  'יוצר חשבון...'
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <UserPlus className="h-4 w-4" />
                    <span>יצירת חשבון</span>
                  </div>
                )}
              </Button>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={onBackToLogin}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                חזרה להתחברות
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUp;