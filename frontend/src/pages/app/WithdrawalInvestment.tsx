import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  PiggyBank, 
  Lock, 
  Unlock, 
  ArrowDownRight, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import WithdrawalOTPVerification from '@/components/WithdrawalOTPVerification';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

type Investment = {
  id: string;
  amount: number;
  package_name: string;
  start_date: string;
  unlock_date: string;
  status: string;
  monthly_profit_rate: number;
  withdrawal_eligible: boolean;
  eligible_date: string;
  days_until_eligible: number;
  lock_period_months: number;
};

type WithdrawalDialogStep = 'form' | 'otp' | 'success';

const WithdrawalInvestment: React.FC = React.memo(() => {
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [withdrawalAddress, setWithdrawalAddress] = useState<string>('');
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<WithdrawalDialogStep>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  const { data: investments, isLoading, refetch } = useQuery<Investment[]>({
    queryKey: ['withdrawal-investments'],
    queryFn: () => api<{ investments: Investment[] }>('/api/withdrawal/investments').then(res => res.investments),
    staleTime: 60 * 1000, // 60 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Remove old mutation - now handled by WithdrawalOTPVerification component

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleWithdrawClick = (investment: Investment) => {
    if (!investment.withdrawal_eligible) {
      toast.error(`Investment locked until ${formatDate(investment.eligible_date)}`);
      return;
    }
    setSelectedInvestment(investment);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInvestment) {
      toast.error('No investment selected');
      return;
    }

    if (!withdrawalAddress.trim()) {
      toast.error('Please enter a withdrawal address');
      return;
    }

    if (!selectedBlockchain) {
      toast.error('Please select a blockchain network');
      return;
    }

    // Proceed to OTP verification step
    setDialogStep('otp');
  };

  const handleOTPSuccess = () => {
    setDialogStep('success');
    queryClient.invalidateQueries({ queryKey: ['withdrawal-investments'] });
    queryClient.invalidateQueries({ queryKey: ['withdrawal-stats'] });
    queryClient.invalidateQueries({ queryKey: ['withdrawal-history'] });
  };

  const handleBackToForm = () => {
    setDialogStep('form');
  };

  const resetDialog = () => {
    setDialogStep('form');
    setSelectedInvestment(null);
    setWithdrawalAddress('');
    setSelectedBlockchain('');
  };

  const getLockProgress = (investment: Investment) => {
    if (investment.withdrawal_eligible) return 100;
    const totalDays = investment.lock_period_months * 30; // Approximate
    const daysPassed = totalDays - investment.days_until_eligible;
    return (daysPassed / totalDays) * 100;
  };

  const blockchainOptions = [
    { value: 'BEP20', label: 'BEP20 (Binance Smart Chain)', color: 'text-yellow-600', description: 'USDT, USDC, BNB on BSC' },
    { value: 'TRC20', label: 'TRC20 (Tron Network)', color: 'text-red-500', description: 'USDT on Tron Network' },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">Withdrawal Investment</h1>
          <p className="text-muted-foreground mt-2">
            Withdraw your investment principal after lock period
          </p>
        </div>
        
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const eligibleInvestments = investments?.filter(inv => inv.withdrawal_eligible) || [];
  const lockedInvestments = investments?.filter(inv => !inv.withdrawal_eligible && inv.status === 'active') || [];
  const withdrawingInvestments = investments?.filter(inv => inv.status === 'withdrawing') || [];

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-yellow-500">Withdrawal Investment</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Withdraw your investment principal after the 6-month lock period
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Eligible to Withdraw</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{eligibleInvestments.length}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {formatCurrency(eligibleInvestments.reduce((sum, inv) => sum + inv.amount, 0))}
                </p>
              </div>
              <Unlock className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Still Locked</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">{lockedInvestments.length}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {formatCurrency(lockedInvestments.reduce((sum, inv) => sum + inv.amount, 0))}
                </p>
              </div>
              <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Processing</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{withdrawingInvestments.length}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {formatCurrency(withdrawingInvestments.reduce((sum, inv) => sum + inv.amount, 0))}
                </p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total Investments</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{investments?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {formatCurrency(investments?.reduce((sum, inv) => sum + inv.amount, 0) || 0)}
                </p>
              </div>
              <PiggyBank className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important Information */}
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          <strong>6-Month Lock Period:</strong> Investments are locked for 6 months from the investment date. 
          You can withdraw the principal amount after this period, but you'll lose future profit earnings.
        </AlertDescription>
      </Alert>

      {/* Eligible for Withdrawal */}
      {eligibleInvestments.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <Unlock className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
              <span>Ready for Withdrawal</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              These investments have completed the 6-month lock period and can be withdrawn
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {eligibleInvestments.map((investment) => (
                <div key={investment.id} className="border rounded-lg p-3 sm:p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
                          <h3 className="font-semibold text-base sm:text-lg truncate">{investment.package_name}</h3>
                          <div className="flex space-x-2">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Unlocked</Badge>
                            <Badge variant="outline" className="text-xs">{investment.monthly_profit_rate}% monthly</Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <p className="text-muted-foreground">Investment Amount</p>
                            <p className="font-semibold">{formatCurrency(investment.amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Start Date</p>
                            <p className="font-semibold">{formatDate(investment.start_date)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Unlock Date</p>
                            <p className="font-semibold">{formatDate(investment.eligible_date)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <p className="font-semibold text-green-600">Available</p>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => handleWithdrawClick(investment)}
                        className="w-full sm:w-auto sm:ml-4 sm:shrink-0"
                        disabled={investment.status === 'withdrawing'}
                        size="sm"
                      >
                        <ArrowDownRight className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Withdraw</span>
                        <span className="sm:hidden">Withdraw Investment</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locked Investments */}
      {lockedInvestments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-orange-500" />
              <span>Locked Investments</span>
            </CardTitle>
            <CardDescription>
              These investments are still in their 6-month lock period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lockedInvestments.map((investment) => (
                <div key={investment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-lg">{investment.package_name}</h3>
                      <Badge variant="secondary">Locked</Badge>
                      <Badge variant="outline">{investment.monthly_profit_rate}% monthly</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Unlocks in</p>
                      <p className="font-semibold text-orange-600">{investment.days_until_eligible} days</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground">Investment Amount</p>
                      <p className="font-semibold">{formatCurrency(investment.amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-semibold">{formatDate(investment.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Unlock Date</p>
                      <p className="font-semibold">{formatDate(investment.eligible_date)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lock Period</p>
                      <p className="font-semibold">{investment.lock_period_months} months</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Lock Progress</span>
                      <span>{Math.round(getLockProgress(investment))}%</span>
                    </div>
                    <Progress value={getLockProgress(investment)} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Withdrawals */}
      {withdrawingInvestments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <span>Processing Withdrawals</span>
            </CardTitle>
            <CardDescription>
              These withdrawal requests are being processed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {withdrawingInvestments.map((investment) => (
                <div key={investment.id} className="border rounded-lg p-4 bg-purple-50 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">{investment.package_name}</h3>
                        <Badge className="bg-purple-100 text-purple-800">Processing</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-semibold">{formatCurrency(investment.amount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Processing Time</p>
                          <p className="font-semibold">3-5 business days</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-purple-600">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">In Progress</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Investments */}
      {(!investments || investments.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center">
            <PiggyBank className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Investments Found</h3>
            <p className="text-muted-foreground">
              You don't have any investments yet. Make an investment to start earning and withdraw later.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Withdrawal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) resetDialog();
        setIsDialogOpen(open);
      }}>
        <DialogContent className={dialogStep === 'otp' ? "sm:max-w-2xl" : "sm:max-w-md"}>
          <DialogHeader>
            <DialogTitle>
              {dialogStep === 'form' && 'Withdraw Investment'}
              {dialogStep === 'otp' && 'Verify OTP'}
              {dialogStep === 'success' && 'Withdrawal Submitted'}
            </DialogTitle>
            <DialogDescription>
              {dialogStep === 'form' && selectedInvestment && (
                <>
                  Withdraw {formatCurrency(selectedInvestment.amount)} from {selectedInvestment.package_name}
                </>
              )}
              {dialogStep === 'otp' && 'Enter the verification code sent to your email'}
              {dialogStep === 'success' && 'Your investment withdrawal request has been submitted'}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Form */}
          {dialogStep === 'form' && selectedInvestment && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Investment Details */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Package:</span>
                  <span className="font-medium">{selectedInvestment.package_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-lg">{formatCurrency(selectedInvestment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investment Date:</span>
                  <span className="font-medium">{formatDate(selectedInvestment.start_date)}</span>
                </div>
              </div>

              {/* Blockchain Selection */}
              <div className="space-y-2">
                <Label>Blockchain Network</Label>
                <Select value={selectedBlockchain} onValueChange={setSelectedBlockchain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blockchain" />
                  </SelectTrigger>
                  <SelectContent>
                    {blockchainOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className={`font-medium ${option.color}`}>{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Withdrawal Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Withdrawal Address</Label>
                <Input
                  id="address"
                  placeholder="Enter your crypto wallet address"
                  value={withdrawalAddress}
                  onChange={(e) => setWithdrawalAddress(e.target.value)}
                  disabled={isSubmitting}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Ensure this address supports the selected blockchain
                </p>
              </div>

              {/* Warning */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Withdrawing your investment will stop all future profit earnings from this package.
                </AlertDescription>
              </Alert>

              {/* Submit Buttons */}
              <div className="flex space-x-2 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isSubmitting || !withdrawalAddress || !selectedBlockchain}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="mr-2 h-4 w-4" />
                      Confirm Withdrawal
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {dialogStep === 'otp' && selectedInvestment && (
            <div className="py-4">
              <WithdrawalOTPVerification
                type="investment"
                investmentId={selectedInvestment.id}
                blockchain={selectedBlockchain}
                withdrawalAddress={withdrawalAddress}
                onSuccess={handleOTPSuccess}
                onCancel={handleBackToForm}
              />
            </div>
          )}

          {/* Step 3: Success */}
          {dialogStep === 'success' && selectedInvestment && (
            <div className="py-6 text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-lg text-green-600">Investment Withdrawal Submitted!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your investment withdrawal request has been sent to our admin team for review.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h4 className="font-medium mb-3">Withdrawal Details:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Package:</span>
                    <span className="font-medium">{selectedInvestment.package_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">{formatCurrency(selectedInvestment.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network:</span>
                    <span className="font-medium">{selectedBlockchain}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="font-mono text-xs break-all max-w-48">{withdrawalAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="secondary">Pending Review</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Time:</span>
                    <span className="font-medium">3-5 business days</span>
                  </div>
                </div>
              </div>
              <Button onClick={() => setIsDialogOpen(false)} className="w-full">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default WithdrawalInvestment;
