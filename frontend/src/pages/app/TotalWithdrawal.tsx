import React, { useState } from 'react';
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
  CreditCard,
  CheckCircle,
  AlertCircle,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

type Withdrawal = {
  id: string;
  amount: number;
  type: string;
  income_source: string;
  description: string;
  timestamp: string;
  status: string;
};

type TotalWithdrawalData = {
  totalWithdrawals: number;
  totalCompleted: number;
  totalPending: number;
  withdrawals: Withdrawal[];
  withdrawalCount: number;
  completedCount: number;
  pendingCount: number;
};

const TotalWithdrawal: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<string>('ALL');

  const { data: withdrawalData, isLoading, refetch } = useQuery<TotalWithdrawalData>({ 
    queryKey: ['total-withdrawal'], 
    queryFn: () => api<TotalWithdrawalData>('/api/user/dashboard/total-withdrawal'),
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const filterTransactionsByTime = (withdrawals: Withdrawal[]) => {
    if (timeFilter === 'ALL') return withdrawals;
    
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
      case '1Y':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return withdrawals;
    }
    
    return withdrawals.filter(w => new Date(w.timestamp) >= filterDate);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">Total Withdrawals</h1>
          <p className="text-muted-foreground mt-2">
            Complete history of all withdrawal transactions
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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

  const filteredWithdrawals = filterTransactionsByTime(withdrawalData?.withdrawals || [])
    .filter(withdrawal => {
      if (statusFilter === 'ALL') return true;
      return withdrawal.status === statusFilter;
    });

  const filteredTotal = filteredWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

  // Prepare chart data - group by month
  const monthlyData = filteredWithdrawals.reduce((acc, withdrawal) => {
    const month = new Date(withdrawal.timestamp).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
    
    if (!acc[month]) {
      acc[month] = { month, amount: 0, count: 0 };
    }
    
    acc[month].amount += Number(withdrawal.amount);
    acc[month].count += 1;
    
    return acc;
  }, {} as { [key: string]: { month: string; amount: number; count: number } });

  const chartData = Object.values(monthlyData).sort((a, b) => 
    new Date(a.month).getTime() - new Date(b.month).getTime()
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">Total Withdrawals</h1>
          <p className="text-muted-foreground mt-2">
            Complete history and analytics of all your withdrawal transactions
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
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(withdrawalData?.totalWithdrawals || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">All-time withdrawals</p>
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
                  {formatCurrency(withdrawalData?.totalCompleted || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{withdrawalData?.completedCount || 0} transactions</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(withdrawalData?.totalPending || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{withdrawalData?.pendingCount || 0} transactions</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
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
                <p className="text-xs text-muted-foreground mt-1">All transactions</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Withdrawal Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Monthly Withdrawal Trend</span>
            </CardTitle>
            <CardDescription>Withdrawal amounts over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    formatter={(value, name) => [formatCurrency(Number(value)), 'Amount']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters & Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status Filter</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Time Period</label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Time</SelectItem>
                    <SelectItem value="7D">Last 7 Days</SelectItem>
                    <SelectItem value="30D">Last 30 Days</SelectItem>
                    <SelectItem value="90D">Last 90 Days</SelectItem>
                    <SelectItem value="1Y">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStatusFilter('ALL');
                  setTimeFilter('ALL');
                }}
                className="flex-1"
              >
                Clear Filters
              </Button>
            </div>

            {/* Analytics */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-3">Period Statistics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Filtered Total:</span>
                  <span className="font-medium">{formatCurrency(filteredTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transactions:</span>
                  <span className="font-medium">{filteredWithdrawals.length}</span>
                </div>
                {filteredWithdrawals.length > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>Average:</span>
                      <span className="font-medium">
                        {formatCurrency(filteredTotal / filteredWithdrawals.length)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Largest:</span>
                      <span className="font-medium">
                        {formatCurrency(Math.max(...filteredWithdrawals.map(w => Number(w.amount))))}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate */}
      {withdrawalData && withdrawalData.withdrawalCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Performance</CardTitle>
            <CardDescription>Success rates and processing analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {((withdrawalData.completedCount / withdrawalData.withdrawalCount) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">Success Rate</p>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {((withdrawalData.pendingCount / withdrawalData.withdrawalCount) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">Pending Rate</p>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {withdrawalData.withdrawalCount > 0 
                    ? formatCurrency(withdrawalData.totalWithdrawals / withdrawalData.withdrawalCount)
                    : '$0.00'
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-1">Average Amount</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Withdrawal History</span>
          </CardTitle>
          <CardDescription>
            Complete list of all withdrawal transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredWithdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      withdrawal.status === 'COMPLETED' ? 'bg-green-100' : 
                      withdrawal.status === 'PENDING' ? 'bg-orange-100' : 'bg-red-100'
                    }`}>
                      {withdrawal.status === 'COMPLETED' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : withdrawal.status === 'PENDING' ? (
                        <Clock className="h-5 w-5 text-orange-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-lg">{formatCurrency(Number(withdrawal.amount))}</p>
                      <Badge className={getStatusColor(withdrawal.status)}>
                        {withdrawal.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {withdrawal.description || 'Withdrawal request'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatDate(withdrawal.timestamp)}</p>
                  <p className="text-xs text-muted-foreground">ID: {withdrawal.id.slice(-8)}</p>
                </div>
              </div>
            ))}
            
            {filteredWithdrawals.length === 0 && (
              <div className="text-center py-8">
                <ArrowDownLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No withdrawal transactions found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {statusFilter !== 'ALL' || timeFilter !== 'ALL'
                    ? 'Try adjusting your filters to see more transactions' 
                    : 'You haven\'t made any withdrawal requests yet. Visit the withdrawal page to request a withdrawal.'}
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Remember:</strong> Deposited amounts are locked for 6 months. 
                    Only income from direct referrals, team income, and salary can be withdrawn immediately.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TotalWithdrawal;