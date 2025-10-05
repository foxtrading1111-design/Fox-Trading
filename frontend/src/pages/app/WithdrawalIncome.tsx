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
  Wallet, 
  DollarSign, 
  ArrowDownRight, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
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
import { toast } from 'sonner';
import WithdrawalOTPVerification from '@/components/WithdrawalOTPVerification';

type WithdrawalStats = {
  available_balance: number;
  pending_amount: number;
  pending_count: number;
  total_withdrawn: number;
  total_withdrawal_count: number;
};

type WithdrawalStep = 'form' | 'otp' | 'success';

const WithdrawalIncome: React.FC = React.memo(() => {
  const [currentStep, setCurrentStep] = useState<WithdrawalStep>('form');
  const [amount, setAmount] = useState<string>('');
  const [withdrawalAddress, setWithdrawalAddress] = useState<string>('');
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalResult, setWithdrawalResult] = useState<any>(null);

  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading, refetch } = useQuery<WithdrawalStats>({
    queryKey: ['withdrawal-stats'],
    queryFn: () => api<{ stats: WithdrawalStats }>('/api/withdrawal/stats').then(res => res.stats),
    staleTime: 30 * 1000, // 30 seconds
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawAmount = parseFloat(amount);
    
    if (!withdrawAmount || withdrawAmount <= 0) {
      toast.error('Please enter a valid withdrawal amount');
      return;
    }

    if (withdrawAmount < 10) {
      toast.error('Minimum withdrawal amount is $10');
      return;
    }

    if (withdrawAmount % 10 !== 0) {
      toast.error('Amount must be in multiples of $10');
      return;
    }

    if (!stats || withdrawAmount > stats.available_balance) {
      toast.error('Insufficient balance for this withdrawal');
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
    setCurrentStep('otp');
  };

  const handleOTPSuccess = () => {
    setCurrentStep('success');
    setWithdrawalResult({
      amount: parseFloat(amount),
      blockchain: selectedBlockchain,
      address: withdrawalAddress
    });
    queryClient.invalidateQueries({ queryKey: ['withdrawal-stats'] });
    queryClient.invalidateQueries({ queryKey: ['withdrawal-history'] });
  };

  const handleBackToForm = () => {
    setCurrentStep('form');
  };

  const handleStartOver = () => {
    setCurrentStep('form');
    setAmount('');
    setWithdrawalAddress('');
    setSelectedBlockchain('');
    setWithdrawalResult(null);
  };

  const handleMaxAmount = () => {
    if (stats && stats.available_balance > 0) {
      // Round down to nearest $10
      const maxAmount = Math.floor(stats.available_balance / 10) * 10;
      setAmount(maxAmount.toString());
    }
  };

  const copyAddress = async () => {
    if (withdrawalAddress) {
      try {
        await navigator.clipboard.writeText(withdrawalAddress);
        toast.success('Address copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy address');
      }
    }
  };

  const blockchainOptions = [
    { value: 'BEP20', label: 'BEP20 (Binance Smart Chain)', color: 'text-yellow-600', description: 'USDT, USDC, BNB on BSC' },
    { value: 'TRC20', label: 'TRC20 (Tron Network)', color: 'text-red-500', description: 'USDT on Tron Network' },
  ];

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">Withdrawal Income</h1>
          <p className="text-muted-foreground mt-2">
            Withdraw your earned income to your crypto wallet
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {currentStep === 'otp' && (
              <Button variant="ghost" size="sm" onClick={handleBackToForm} className="self-start">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-yellow-500">Withdrawal Income</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
                {currentStep === 'form' && 'Withdraw your earned income to your cryptocurrency wallet'}
                {currentStep === 'otp' && 'Verify your identity with OTP'}
                {currentStep === 'success' && 'Withdrawal request submitted successfully'}
              </p>
            </div>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center space-x-2 mt-3 sm:mt-4">
            <div className={`h-1.5 sm:h-2 w-6 sm:w-8 rounded-full ${
              currentStep === 'form' ? 'bg-yellow-500' : 'bg-green-500'
            }`}></div>
            <div className={`h-1.5 sm:h-2 w-6 sm:w-8 rounded-full ${
              currentStep === 'otp' ? 'bg-yellow-500' : currentStep === 'success' ? 'bg-green-500' : 'bg-gray-200'
            }`}></div>
            <div className={`h-1.5 sm:h-2 w-6 sm:w-8 rounded-full ${
              currentStep === 'success' ? 'bg-green-500' : 'bg-gray-200'
            }`}></div>
            <div className="text-xs text-muted-foreground ml-2">
              Step {currentStep === 'form' ? '1' : currentStep === 'otp' ? '2' : '3'} of 3
            </div>
          </div>
        </div>
        {currentStep === 'form' && (
          <Button variant="outline" onClick={() => refetch()} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Refresh Data</span>
          </Button>
        )}
      </div>

      {/* Balance Overview - Show on form and success steps */}
      {(currentStep === 'form' || currentStep === 'success') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Available Balance</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 truncate">
                    {formatCurrency(stats?.available_balance || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
                </div>
                <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Pending Withdrawals</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600 truncate">
                    {formatCurrency(stats?.pending_amount || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.pending_count || 0} requests
                  </p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total Withdrawn</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 truncate">
                    {formatCurrency(stats?.total_withdrawn || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.total_withdrawal_count || 0} completed
                  </p>
                </div>
                <ArrowDownRight className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 1: Withdrawal Form */}
      {currentStep === 'form' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>Withdraw Income</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Submit a request to withdraw your earned income
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm sm:text-base font-medium">Withdrawal Amount (USD)</Label>
                <div className="flex space-x-2">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="10"
                    step="10"
                    disabled={isSubmitting}
                    className="text-base"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleMaxAmount}
                    disabled={isSubmitting || !stats || stats.available_balance <= 0}
                    className="px-3 sm:px-4 shrink-0"
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum: $10 • Must be in multiples of $10
                </p>
              </div>

              {/* Blockchain Selection */}
              <div className="space-y-2">
                <Label className="text-sm sm:text-base font-medium">Blockchain Network</Label>
                <Select value={selectedBlockchain} onValueChange={setSelectedBlockchain}>
                  <SelectTrigger className="h-10 sm:h-11">
                    <SelectValue placeholder="Select blockchain" />
                  </SelectTrigger>
                  <SelectContent>
                    {blockchainOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className={`font-medium text-sm sm:text-base ${option.color}`}>{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Withdrawal Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm sm:text-base font-medium">Withdrawal Address</Label>
                <div className="flex space-x-2">
                  <Input
                    id="address"
                    placeholder="Enter your crypto wallet address"
                    value={withdrawalAddress}
                    onChange={(e) => setWithdrawalAddress(e.target.value)}
                    disabled={isSubmitting}
                    className="font-mono text-xs sm:text-sm"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={copyAddress}
                    disabled={!withdrawalAddress || isSubmitting}
                    className="h-10 w-10 sm:h-11 sm:w-11 shrink-0"
                  >
                    <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Make sure this address supports the selected blockchain network
                </p>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-11 text-sm sm:text-base"
                disabled={isSubmitting || !stats || stats.available_balance <= 0}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    <span className="hidden sm:inline">Processing...</span>
                    <span className="sm:hidden">Processing</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Submit Withdrawal Request</span>
                    <span className="sm:hidden">Submit Request</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Information Panel */}
        <div className="space-y-6">
          {/* Processing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Processing Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Processing Time</p>
                  <p className="text-sm text-muted-foreground">24-48 hours for income withdrawals</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Minimum Amount</p>
                  <p className="text-sm text-muted-foreground">$10 minimum, multiples of $10 only</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Wallet className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">Supported Networks</p>
                  <p className="text-sm text-muted-foreground">BEP20 (BSC), TRC20 (Tron)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Notices */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Ensure your withdrawal address is correct and supports the selected blockchain. 
              Transactions cannot be reversed once processed.
            </AlertDescription>
          </Alert>

          {/* Low Balance Warning */}
          {stats && stats.available_balance < 10 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Insufficient Balance:</strong> You need at least $10 to make a withdrawal. 
                Continue earning income to increase your balance.
              </AlertDescription>
            </Alert>
          )}

          {/* Recent Activity Summary */}
          {stats && (stats.pending_count > 0 || stats.total_withdrawal_count > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Withdrawal Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending:</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{stats.pending_count}</Badge>
                    <span className="font-medium">{formatCurrency(stats.pending_amount)}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800">{stats.total_withdrawal_count}</Badge>
                    <span className="font-medium">{formatCurrency(stats.total_withdrawn)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      )}

      {/* Step 2: OTP Verification */}
      {currentStep === 'otp' && (
        <div className="max-w-2xl mx-auto px-2 sm:px-0">
          <WithdrawalOTPVerification
            type="income"
            amount={parseFloat(amount)}
            blockchain={selectedBlockchain}
            withdrawalAddress={withdrawalAddress}
            onSuccess={handleOTPSuccess}
            onCancel={handleBackToForm}
          />
        </div>
      )}

      {/* Step 3: Success */}
      {currentStep === 'success' && withdrawalResult && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-4 sm:p-6 lg:p-8 text-center space-y-4 sm:space-y-6">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-base sm:text-lg text-green-600">Withdrawal Request Submitted!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  Your income withdrawal request has been sent to our admin team for review. You'll receive an email notification once it's processed.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 text-left">
                <h4 className="font-medium mb-3 text-sm sm:text-base">Withdrawal Details:</h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">Income Withdrawal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">${withdrawalResult.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network:</span>
                    <span className="font-medium">{withdrawalResult.blockchain}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-1 sm:space-y-0">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="font-mono text-xs break-all bg-white dark:bg-gray-700 p-2 rounded border max-w-full sm:max-w-48">{withdrawalResult.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="secondary" className="text-xs">Pending Review</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Time:</span>
                    <span className="font-medium">24-48 hours</span>
                  </div>
                </div>
              </div>
              <Button onClick={handleStartOver} className="w-full h-11 text-sm sm:text-base">
                Make Another Withdrawal
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
});

export default WithdrawalIncome;
