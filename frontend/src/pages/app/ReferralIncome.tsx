import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  ArrowUpRight,
  Filter,
  RefreshCw
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Transaction = {
  id: string;
  amount: number;
  type: string;
  income_source: string;
  description: string;
  timestamp: string;
};

type DashboardData = {
  income_breakdown: Array<{
    source: string;
    amount: number;
  }>;
  recent_transactions: Transaction[];
};

type ReferralIncomeData = {
  total_completed: number;
  total_pending: number;
  total_transactions: number;
  level_breakdown: {
    [key: number]: {
      completed: number;
      pending: number;
      count: number;
    };
  };
  recent_transactions: Transaction[];
  last_updated: string;
};

const ReferralIncome: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [showPending, setShowPending] = useState<boolean>(true);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({ 
    queryKey: ['dashboard'], 
    queryFn: () => api<DashboardData>('/api/user/dashboard') 
  });

  const { data: referralData, isLoading: referralLoading, refetch } = useQuery<ReferralIncomeData>({ 
    queryKey: ['referral-income'], 
    queryFn: () => api<ReferralIncomeData>('/api/user/referral-income'),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getReferralLevel = (description: string) => {
    const levelMatch = description.match(/level\s*(\d+)|L(\d+)/i);
    if (levelMatch) {
      return parseInt(levelMatch[1] || levelMatch[2]);
    }
    return 1; // Default to level 1 if no level specified
  };

  const filterTransactionsByTime = (transactions: Transaction[]) => {
    if (timeFilter === 'ALL') return transactions;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (timeFilter) {
      case '7D':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30D':
        filterDate.setDate(now.getDate() - 30);
        break;
      case '90D':
        filterDate.setDate(now.getDate() - 90);
        break;
      default:
        return transactions;
    }
    
    return transactions.filter(t => new Date(t.timestamp) >= filterDate);
  };

  // Get referral transactions from dedicated endpoint
  const referralTransactions = referralData?.recent_transactions || [];

  // Apply filters
  const filteredTransactions = filterTransactionsByTime(referralTransactions).filter(
    transaction => {
      if (levelFilter === 'ALL') return true;
      const level = getReferralLevel(transaction.description);
      return level.toString() === levelFilter;
    }
  );

  // Calculate totals
  const totalReferralIncome = referralData?.total_completed || 0;
  const totalPendingIncome = referralData?.total_pending || 0;
  const totalAllIncome = totalReferralIncome + (showPending ? totalPendingIncome : 0);

  const periodTotal = filteredTransactions
    .filter(tx => showPending || tx.status === 'COMPLETED')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  // Use backend calculated level breakdown
  const levelBreakdown = referralData?.level_breakdown || {};
  const filteredLevelBreakdown = Object.entries(levelBreakdown)
    .filter(([level]) => levelFilter === 'ALL' || level === levelFilter)
    .reduce((acc, [level, data]) => {
      const levelNum = parseInt(level);
      acc[levelNum] = {
        count: data.count,
        amount: data.completed + (showPending ? data.pending : 0),
        completed: data.completed,
        pending: data.pending
      };
      return acc;
    }, {} as { [key: number]: { count: number; amount: number; completed: number; pending: number } });

  const getLevelColor = (level: number) => {
    const colors = [
      '#3b82f6', // Level 1 - Blue
      '#10b981', // Level 2 - Green  
      '#f59e0b', // Level 3 - Yellow
      '#8b5cf6', // Level 4 - Purple
      '#ef4444', // Level 5 - Red
      '#06b6d4', // Level 6 - Cyan
      '#84cc16', // Level 7 - Lime
    ];
    return colors[(level - 1) % colors.length] || '#6b7280';
  };

  const isLoading = dashboardLoading || referralLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">Referral Income</h1>
          <p className="text-muted-foreground mt-2">
            Track your multi-level referral commissions
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-yellow-500">Referral Income (Multi-Level)</h1>
        <p className="text-muted-foreground mt-2">
          Track your multi-level referral commissions from all downline levels (real-time updates)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Income</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalReferralIncome)}</p>
                <p className="text-xs text-muted-foreground mt-1">Available earnings</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Income</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalPendingIncome)}</p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Period Total</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(periodTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {timeFilter === 'ALL' ? 'All transactions' : `Last ${timeFilter}`}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold text-purple-600">{referralData?.total_transactions || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Referral commissions</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Time</SelectItem>
                <SelectItem value="7D">Last 7 Days</SelectItem>
                <SelectItem value="30D">Last 30 Days</SelectItem>
                <SelectItem value="90D">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Levels</SelectItem>
                {Array.from({ length: 7 }, (_, i) => i + 1).map((level) => (
                  <SelectItem key={level} value={level.toString()}>
                    Level {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant={showPending ? "default" : "outline"}
              onClick={() => setShowPending(!showPending)}
            >
              {showPending ? 'Hide Pending' : 'Show Pending'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setTimeFilter('ALL');
                setLevelFilter('ALL');
                setShowPending(true);
              }}
            >
              Clear Filters
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Level Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Income by Level</CardTitle>
          <CardDescription>Breakdown of referral income by commission levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(filteredLevelBreakdown)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([level, data]) => (
              <Card key={level} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getLevelColor(Number(level)) }}
                      />
                      <span className="font-semibold">Level {level}</span>
                    </div>
                    <Badge variant="secondary">{data.count} transactions</Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: getLevelColor(Number(level)) }}>
                      {formatCurrency(data.amount)}
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <span className="font-medium text-green-600">{formatCurrency(data.completed)}</span>
                      </div>
                      {data.pending > 0 && (
                        <div className="flex justify-between">
                          <span>Pending:</span>
                          <span className="font-medium text-orange-600">{formatCurrency(data.pending)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Avg:</span>
                        <span>{formatCurrency(data.amount / data.count)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {Object.keys(filteredLevelBreakdown).length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No referral income found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters or refer more people to start earning
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions History */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Income History</CardTitle>
          <CardDescription>
            Detailed list of all referral commission transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions
              .filter(tx => showPending || tx.status === 'COMPLETED')
              .map((transaction) => {
                const level = getReferralLevel(transaction.description);
                const isCompleted = transaction.status === 'COMPLETED';
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-green-100' : 'bg-orange-100'
                        }`}>
                          <ArrowUpRight className={`h-5 w-5 ${
                            isCompleted ? 'text-green-600' : 'text-orange-600'
                          }`} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium">{formatCurrency(Number(transaction.amount))}</p>
                          <Badge style={{ backgroundColor: getLevelColor(level) }}>
                            Level {level}
                          </Badge>
                          <Badge variant={isCompleted ? "default" : "secondary"}>
                            {transaction.status || 'COMPLETED'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{transaction.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{formatDate(transaction.timestamp)}</p>
                      {referralData?.last_updated && (
                        <p className="text-xs text-muted-foreground">
                          Updated: {new Date(referralData.last_updated).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            
            {filteredTransactions.length === 0 && (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No referral transactions found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {timeFilter !== 'ALL' || levelFilter !== 'ALL' 
                    ? 'Try adjusting your filters to see more transactions' 
                    : 'Start referring people to earn referral commissions'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralIncome;