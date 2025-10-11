import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sponsorCode, setSponsorCode] = useState('');
  const [sponsorName, setSponsorName] = useState<string | null>(null);
  const [position, setPosition] = useState<'LEFT' | 'RIGHT' | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Auto-fill referral code from URL parameter
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setSponsorCode(refCode);
      toast.success(`Referral code ${refCode} applied!`);
      // Auto-verify the sponsor code
      setLoading(true);
      setError(null);
      api<{ full_name: string; referral_code: string }>(`/api/auth/sponsor/${encodeURIComponent(refCode)}`)
        .then(res => {
          setSponsorName(res.full_name);
        })
        .catch(() => {
          // Don't show error automatically, let user try again
          setSponsorName(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (step === 1) {
      // Step 1: Verify sponsor code
      if (!sponsorCode) return setError('Sponsor referral code required');
      setLoading(true);
      setError(null);
      try {
        const res = await api<{ full_name: string; referral_code: string }>(`/api/auth/sponsor/${encodeURIComponent(sponsorCode)}`);
        setSponsorName(res.full_name);
        setStep(2);
      } catch (err) {
        setSponsorName(null);
        setError(err instanceof Error ? err.message : 'Invalid sponsor code');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    if (step === 2) {
      // Step 2: Send OTP
      if (!position) return setError('Please select your position (Left or Right)');
      if (!fullName) return setError('Full name is required');
      if (!email) return setError('Email is required');
      if (!password || password.length < 8) return setError('Password must be at least 8 characters');
      
      setLoading(true);
      setError(null);
      setMessage(null);
      
      try {
        const response = await api<{ success: boolean; message: string; email: string; otp?: string }>('/api/auth/register/send-otp', {
          method: 'POST',
          body: {
            full_name: fullName,
            email,
            password,
            sponsor_referral_code: sponsorCode,
            position
          }
        });
        
        setMessage(response.message);
        setStep(3); // Move to OTP verification step
        
        // In development, show OTP in console
        if (response.otp) {
          console.log('Development OTP:', response.otp);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send OTP');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    if (step === 3) {
      // Step 3: Verify OTP and complete registration
      if (!otp || otp.length !== 6) return setError('Please enter the 6-digit OTP');
      
      setLoading(true);
      setError(null);
      setMessage(null);
      
      try {
        const response = await api<{ token: string; referral_code: string; message: string }>('/api/auth/register/verify-otp', {
          method: 'POST',
          body: { email, otp }
        });
        
        setToken(response.token);
        setMessage(response.message);
        
        // Redirect to dashboard after successful registration
        setTimeout(() => navigate('/app'), 1000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OTP verification failed');
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
          <CardTitle className="text-2xl font-bold text-foreground">Create your account</CardTitle>
          <p className="text-sm text-muted-foreground">Join our platform to start your journey</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {step === 1 ? (
              <div>
                <label className="block mb-2">Sponsor Referral Code</label>
                <Input value={sponsorCode} onChange={(e) => setSponsorCode(e.target.value)} placeholder="e.g. ABC123XYZ" required />
                {sponsorName && (
                  <p className="mt-2 text-sm">Sponsor: <span className="font-medium">{sponsorName}</span></p>
                )}
              </div>
            ) : step === 2 ? (
              <>
                {sponsorName && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Sponsor: <span className="font-medium text-foreground">{sponsorName}</span></p>
                  </div>
                )}
                <div>
                  <label className="block mb-2">Choose Your Position</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={position === 'LEFT' ? 'default' : 'outline'}
                      onClick={() => setPosition('LEFT')}
                      className="h-12"
                    >
                      Left Side
                    </Button>
                    <Button
                      type="button"
                      variant={position === 'RIGHT' ? 'default' : 'outline'}
                      onClick={() => setPosition('RIGHT')}
                      className="h-12"
                    >
                      Right Side
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block mb-2">Full Name</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
                </div>
                <div>
                  <label className="block mb-2">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" required />
                </div>
                <div>
                  <label className="block mb-2">Password</label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" required />
                </div>
              </>
            ) : step === 3 ? (
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
              </>
            ) : null}
            {error && <p className="text-destructive text-sm">{error}</p>}
            {message && <p className="text-green-600 text-sm">{message}</p>}
            <Button className="w-full bg-accent text-foreground hover:shadow-gold-glow" disabled={loading}>
              {loading ? 'Please wait...' : step === 1 ? 'Continue' : step === 2 ? 'Send OTP' : 'Verify & Register'}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}