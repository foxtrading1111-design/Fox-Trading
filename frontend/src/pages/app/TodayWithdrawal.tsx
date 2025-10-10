import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowDownLeft, 
  TrendingDown, 
  Clock, 
  RefreshCw,
  Calendar,
  CreditCard
} from 'lucide-react';

type Withdrawal = {
  id: string;
  amount: number;
  type: string;
  income_source: string;
  description: string;
  timestamp: string;
  status: string;
};

type TodayWithdrawalData = {
  totalTodayWithdrawal: number;
  withdrawals: Withdrawal[];
  withdrawalCount: number;
};

const TodayWithdrawal: React.FC = () => {
  const { data: withdrawalData, isLoading, refetch } = useQuery<TodayWithdrawalData>({ 
    queryKey: ['today-withdrawal'], 
    queryFn: () => api<TodayWithdrawalData>('/api/user/dashboard/today-withdrawal'),
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-orange-600 bg-orange-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">Today's Withdrawals</h1>
          <p className="text-muted-foreground mt-2">
            View all withdrawal transactions made today
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

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const completedWithdrawals = withdrawalData?.withdrawals.filter(w => w.status === 'COMPLETED') || [];
  const pendingWithdrawals = withdrawalData?.withdrawals.filter(w => w.status === 'PENDING') || [];
  const failedWithdrawals = withdrawalData?.withdrawals.filter(w => w.status === 'FAILED') || [];

  const completedAmount = completedWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
  const pendingAmount = pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">Today's Withdrawals</h1>
          <p className="text-muted-foreground mt-2">
            All withdrawal transactions for {todayDate}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Today</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(withdrawalData?.totalTodayWithdrawal || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">All withdrawals</p>
              </div>
              <TrendingDown className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(completedAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{completedWithdrawals.length} transactions</p>
              </div>
              <ArrowDownLeft className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(pendingAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{pendingWithdrawals.length} transactions</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Count</p>
                <p className="text-2xl font-bold text-purple-600">
                  {withdrawalData?.withdrawalCount || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Transactions today</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Today's Withdrawal Transactions</span>
          </CardTitle>
          <CardDescription>
            Detailed breakdown of all withdrawals made today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {withdrawalData?.withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      withdrawal.status === 'COMPLETED' ? 'bg-green-100' : 
                      withdrawal.status === 'PENDING' ? 'bg-orange-100' : 'bg-red-100'
                    }`}>
                      <ArrowDownLeft className={`h-5 w-5 ${
                        withdrawal.status === 'COMPLETED' ? 'text-green-600' : 
                        withdrawal.status === 'PENDING' ? 'text-orange-600' : 'text-red-600'
                      }`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-lg">{formatCurrency(Number(withdrawal.amount))}</p>
                      <Badge className={getStatusColor(withdrawal.status)}>
                        {withdrawal.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{withdrawal.description || 'Withdrawal request'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatTime(withdrawal.timestamp)}</p>
                  <p className="text-xs text-muted-foreground">Transaction ID: {withdrawal.id.slice(-8)}</p>
                </div>
              </div>
            ))}
            
            {withdrawalData?.withdrawals.length === 0 && (
              <div className="text-center py-8">
                <ArrowDownLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No withdrawals made today</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You haven't made any withdrawal requests today. Visit the withdrawal page to request a withdrawal.
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Remember that deposited amounts are locked for 6 months. 
                    Only income from referrals, team, and salary can be withdrawn immediately.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {withdrawalData?.withdrawals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-green-600">Completed Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Count:</span>
                  <span className="font-medium">{completedWithdrawals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Amount:</span>
                  <span className="font-medium">{formatCurrency(completedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Average:</span>
                  <span className="font-medium">
                    {completedWithdrawals.length > 0 
                      ? formatCurrency(completedAmount / completedWithdrawals.length) 
                      : '$0.00'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-orange-600">Pending Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Count:</span>
                  <span className="font-medium">{pendingWithdrawals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Amount:</span>
                  <span className="font-medium">{formatCurrency(pendingAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Average:</span>
                  <span className="font-medium">
                    {pendingWithdrawals.length > 0 
                      ? formatCurrency(pendingAmount / pendingWithdrawals.length) 
                      : '$0.00'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-gray-600">Processing Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Processing Time:</span>
                  <span className="font-medium">1-24 hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Withdrawal Fee:</span>
                  <span className="font-medium">$1.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Min Amount:</span>
                  <span className="font-medium">$10.00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TodayWithdrawal;