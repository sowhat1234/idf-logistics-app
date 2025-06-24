import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginProps {
  onShowSignUp?: () => void;
}

const Login: React.FC<LoginProps> = ({ onShowSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'admin@idf.mil', role: 'Super Admin', description: 'Full system access' },
    { email: 'commander@idf.mil', role: 'Commander', description: 'Unit management' },
    { email: 'dutyofficer@idf.mil', role: 'Duty Officer', description: 'Daily operations' },
    { email: 'nco1@idf.mil', role: 'NCO', description: 'Squad coordination' },
    { email: 'reservist1@idf.mil', role: 'Reservist', description: 'Basic access' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/images/command-center.jpg')] bg-cover bg-center opacity-10"></div>
      
      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel - Branding */}
        <div className="flex flex-col justify-center text-white space-y-6">
          <div className="flex items-center space-x-4 mb-8">
            <img src="/images/idf-logo.png" alt="IDF Logo" className="h-16 w-16 object-contain" />
            <div>
              <h1 className="text-4xl font-bold">IDF Logistics</h1>
              <p className="text-xl text-blue-200">Reserve Duty Management</p>
            </div>
          </div>
          
          <div className="space-y-4 text-lg">
            <p className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-blue-300" />
              <span>Secure military-grade system</span>
            </p>
            <p className="text-blue-200">
              Advanced shift planning and logistics management for IDF reserve units.
            </p>
          </div>

          {/* Demo Accounts */}
          <div className="bg-blue-800/30 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Demo Accounts</h3>
            <div className="space-y-2 text-sm">
              {demoAccounts.map((account) => (
                <div key={account.email} className="flex flex-col space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-xs">{account.email}</span>
                    <span className="text-blue-200">{account.role}</span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-blue-300 mt-2">Password: any 3+ characters</p>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">Sign In</CardTitle>
              <CardDescription className="text-gray-600">
                Access the IDF Reserve Duty Management System
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pr-10"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>

              {onShowSignUp && (
                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or</span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={onShowSignUp}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create New Account
                  </Button>
                </div>
              )}

              <div className="mt-6 text-center text-sm text-gray-500">
                <p>Secure access to military systems</p>
                <p className="mt-1">All activities are logged and monitored</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
