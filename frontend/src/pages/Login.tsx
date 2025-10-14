import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';


export default function LoginPage() {
  const { login, loginGuest } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
    } finally {
      setLoading(false);
    }
  }

  async function onGuest() {
    setLoading(true);
    setError(null);
    try {
      await loginGuest();
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guest login failed');
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl text-gold">Welcome back</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block mb-2">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" required />
            </div>
            <div>
              <label className="block mb-2">Password</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" required />
              <div className="mt-1 text-right">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <button 
              type="submit"
              className="w-full h-10 px-4 py-2 bg-gold text-navy font-medium rounded-md hover:bg-gold/90 hover:shadow-gold-glow disabled:opacity-50 disabled:pointer-events-none transition-colors" 
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onGuest} disabled={loading}>Guest Login</Button>
            <Link to="/register" className="inline-flex items-center justify-center text-sm font-medium rounded-md px-4 py-2 bg-gold text-navy hover:bg-gold/90 text-center">Create an account</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
