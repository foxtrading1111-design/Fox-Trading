import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (step === 1) {
      // Step 1: Send OTP
      if (!email) return setError('Email is required');
      
      setLoading(true);
      setError(null);
      setMessage(null);
      
      try {
        const response = await api<{ success: boolean; message: string; email: string; otp?: string }>('/api/auth/forgot-password/send-otp', {
          method: 'POST',
          body: { email }
        });
        
        setMessage(response.message);
        setStep(2); // Move to OTP verification step
        
        // In development, show OTP in console
        if (response.otp) {
          console.log('Development OTP:', response.otp);
          toast.success(`Development OTP: ${response.otp}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send OTP');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    if (step === 2) {
      // Step 2: Verify OTP and reset password
      if (!otp || otp.length !== 6) return setError('Please enter the 6-digit OTP');
      if (!newPassword || newPassword.length < 8) return setError('Password must be at least 8 characters');
      
      setLoading(true);
      setError(null);
      setMessage(null);
      
      try {
        const response = await api<{ success: boolean; message: string }>('/api/auth/forgot-password/reset', {
          method: 'POST',
          body: { email, otp, newPassword }
        });
        
        setMessage(response.message);
        toast.success('Password reset successful!');
        
        // Redirect to login after successful password reset
        setTimeout(() => navigate('/login'), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reset password');
      } finally {
        setLoading(false);
      }
      return;
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background p-0 m-0 w-screen h-screen overflow-auto">
      <Card className="w-full max-w-lg shadow-card border-0 mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === 1 
              ? 'Enter your email to receive a password reset code' 
              : 'Enter the OTP and your new password'
            }
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {step === 1 ? (
              <div>
                <label className="block mb-2">Email Address</label>
                <Input 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="you@example.com" 
                  type="email" 
                  required 
                />
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Please check your email and enter the 6-digit OTP sent to:</p>
                  <p className="font-medium text-foreground">{email}</p>
                </div>
                <div>
                  <label className="block mb-2">Enter OTP</label>
                  <Input 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                    placeholder="123456" 
                    maxLength={6}
                    className="text-center text-lg tracking-wider"
                    required 
                  />
                </div>
                <div>
                  <label className="block mb-2">New Password</label>
                  <div className="relative">
                    <Input 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="••••••••" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {error && <p className="text-destructive text-sm">{error}</p>}
            {message && <p className="text-green-600 text-sm">{message}</p>}
            
            <Button className="w-full bg-accent text-foreground hover:shadow-gold-glow" disabled={loading}>
              {loading ? 'Please wait...' : step === 1 ? 'Send OTP' : 'Reset Password'}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm space-y-2">
            {step === 1 && (
              <>
                <span className="text-muted-foreground">Remember your password? </span>
                <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
              </>
            )}
            {step === 2 && (
              <button 
                onClick={() => setStep(1)} 
                className="font-medium text-primary hover:underline"
              >
                Back to email entry
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}