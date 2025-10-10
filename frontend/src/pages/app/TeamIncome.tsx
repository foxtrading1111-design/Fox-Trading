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
  RefreshCw,
  Target
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

type Transaction = {
  id: string;
  amount: number;
  type: string;
  income_source: string;
  description: string;
  timestamp: string;
  referral_level?: number;
  monthly_income_source_user_id?: string;
};

type TeamIncomeData = {
  totalTeamIncome: number;
  todaysTeamIncome: number;
  levelBreakdown: {
    [level: number]: {
      count: number;
      amount: number;
      transactions: Transaction[];
    };
  };
  transactions: Transaction[];
  transactionCount: number;
};

const TeamIncome: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');

  const { data: teamIncomeData, isLoading, refetch } = useQuery<TeamIncomeData>({ 
    queryKey: ['team-income'], 
    queryFn: () => api<TeamIncomeData>('/api/user/dashboard/team-income') 
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

  const getLevelColor = (level: number) => {
    const colors = [
      '#3b82f6', // Level 1 - Blue
      '#10b981', // Level 2 - Green  
      '#f59e0b', // Level 3 - Yellow
      '#8b5cf6', // Level 4 - Purple
      '#ef4444', // Level 5 - Red
      '#06b6d4', // Level 6+ - Cyan variations
      '#84cc16', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'
    ];
    return colors[(level - 1) % colors.length] || '#6b7280';
  };

  const getLevelPercentage = (level: number) => {
    if (level === 1) return 10;
    if (level === 2) return 5;
    if (level === 3) return 3;
    if (level === 4) return 2;
    if (level === 5) return 1;
    if (level >= 6 && level <= 20) return 0.5;
    return 0;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">Team Income</h1>
          <p className="text-muted-foreground mt-2">
            Track your multi-level team income from monthly earnings
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

  const filteredTransactions = filterTransactionsByTime(teamIncomeData?.transactions || [])
    .filter(transaction => {
      if (levelFilter === 'ALL') return true;
      return (transaction.referral_level || 1).toString() === levelFilter;
    });

  const periodTotal = filteredTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount), 
    0
  );

  // Prepare chart data for level breakdown
  const levelChartData = Object.entries(teamIncomeData?.levelBreakdown || {})
    .map(([level, data]) => ({
      level: `Level ${level}`,
      amount: data.amount,
      count: data.count,
      percentage: getLevelPercentage(parseInt(level)),
      color: getLevelColor(parseInt(level))
    }))
    .sort((a, b) => parseInt(a.level.replace('Level ', '')) - parseInt(b.level.replace('Level ', '')));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-yellow-500">Team Income</h1>
        <p className="text-muted-foreground mt-2">
          Multi-level income from your team's monthly earnings (10%, 5%, 3%, 2%, 1%, 0.5% structure)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Team Income</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(teamIncomeData?.totalTeamIncome || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">All-time earnings</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Team Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(teamIncomeData?.todaysTeamIncome || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Today's earnings</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Period Total</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(periodTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {timeFilter === 'ALL' ? 'All transactions' : `Last ${timeFilter}`}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold text-orange-600">
                  {teamIncomeData?.transactionCount || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Team income payments</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Income by Level</span>
            </CardTitle>
            <CardDescription>Team income distribution across levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="level" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    formatter={(value, name, props) => [
                      formatCurrency(Number(value)), 
                      `Income (${props.payload.percentage}%)`
                    ]}
                    labelFormatter={(label) => `${label} - ${levelChartData.find(d => d.level === label)?.count || 0} payments`}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="#f59e0b" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters & Level Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Level Filter</label>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Levels</SelectItem>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((level) => (
                      <SelectItem key={level} value={level.toString()}>
                        Level {level} ({getLevelPercentage(level)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setTimeFilter('ALL');
                  setLevelFilter('ALL');
                }}
                className="flex-1"
              >
                Clear Filters
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            {/* Level Structure Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-3">Team Income Structure</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Level 1 (Direct):</span>
                  <span className="font-medium text-blue-600">10%</span>
                </div>
                <div className="flex justify-between">
                  <span>Level 2:</span>
                  <span className="font-medium text-green-600">5%</span>
                </div>
                <div className="flex justify-between">
                  <span>Level 3:</span>
                  <span className="font-medium text-yellow-600">3%</span>
                </div>
                <div className="flex justify-between">
                  <span>Level 4:</span>
                  <span className="font-medium text-purple-600">2%</span>
                </div>
                <div className="flex justify-between">
                  <span>Level 5:</span>
                  <span className="font-medium text-red-600">1%</span>
                </div>
                <div className="flex justify-between">
                  <span>Levels 6-20:</span>
                  <span className="font-medium text-cyan-600">0.5% each</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Breakdown Cards */}
      {Object.keys(teamIncomeData?.levelBreakdown || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Level Breakdown</CardTitle>
            <CardDescription>Income received from each team level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(teamIncomeData?.levelBreakdown || {})
                .filter(([level]) => levelFilter === 'ALL' || level === levelFilter)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([level, data]) => (
                <Card key={level} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getLevelColor(parseInt(level)) }}
                        />
                        <span className="font-semibold">Level {level}</span>
                      </div>
                      <Badge variant="secondary">{data.count} payments</Badge>
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: getLevelColor(parseInt(level)) }}>
                        {formatCurrency(data.amount)}
                      </p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Percentage:</span>
                          <span className="font-medium">{getLevelPercentage(parseInt(level))}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Payment:</span>
                          <span>{formatCurrency(data.amount / data.count)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions History */}
      <Card>
        <CardHeader>
          <CardTitle>Team Income History</CardTitle>
          <CardDescription>
            Detailed list of all team income transactions from monthly distributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => {
              const level = transaction.referral_level || 1;
              const percentage = getLevelPercentage(level);
              return (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <ArrowUpRight className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium">{formatCurrency(Number(transaction.amount))}</p>
                        <Badge style={{ backgroundColor: getLevelColor(level), color: 'white' }}>
                          Level {level} ({percentage}%)
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{transaction.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{formatDate(transaction.timestamp)}</p>
                  </div>
                </div>
              );
            })}
            
            {filteredTransactions.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No team income transactions found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {timeFilter !== 'ALL' || levelFilter !== 'ALL'
                    ? 'Try adjusting your filters to see more transactions' 
                    : 'Team income is distributed monthly based on team members\' earnings'}
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Info:</strong> Team income is calculated monthly from your team's earnings. 
                    You receive percentages based on levels: 10%, 5%, 3%, 2%, 1%, and 0.5% for levels 6-20.
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

export default TeamIncome;