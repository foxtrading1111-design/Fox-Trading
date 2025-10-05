import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Target,
  BarChart3,
  Coins
} from 'lucide-react';

type Investment = {
  id: string;
  amount: number;
  investmentDate: string;
  daysSinceInvestment: number;
  dailyProfitRate: string;
  monthlyProfitRate: string;
  totalProfitEarned: string;
  todayProfit: string;
  status: string;
  description: string;
  blockchain: string;
};

type InvestmentData = {
  investments: Investment[];
  summary: {
    totalInvested: number;
    totalProfitEarned: string;
    totalTodayProfit: string;
    totalInvestments: number;
    averageInvestment: string;
  };
};

const MyInvestments: React.FC = () => {
  const { data: investmentData, isLoading } = useQuery<InvestmentData>({ 
    queryKey: ['my-investments'], 
    queryFn: () => api<InvestmentData>('/api/user/investments/my') 
  });

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getBlockchainColor = (blockchain: string) => {
    const colors: { [key: string]: string } = {
      'BEP20': '#f59e0b',
      'TRC20': '#10b981',
      'BTC': '#f97316',
      'ETH': '#8b5cf6',
      'USDT': '#06b6d4',
      'DEPOSIT': '#6b7280',
    };
    return colors[blockchain] || '#6b7280';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">My Investments</h1>
          <p className="text-muted-foreground mt-2">
            Track your investments and daily profit earnings
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-yellow-500">My Investments</h1>
        <p className="text-muted-foreground mt-2">
          Track your investments with 10% monthly returns (0.333% daily)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invested</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(investmentData?.summary.totalInvested || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Principal amount</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Profit Earned</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(investmentData?.summary.totalProfitEarned || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">All-time profit</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Profit</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(investmentData?.summary.totalTodayProfit || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Daily earnings</p>
              </div>
              <Coins className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Investments</p>
                <p className="text-2xl font-bold text-orange-600">{investmentData?.summary.totalInvestments || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Active investments</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Details</CardTitle>
          <CardDescription>
            All your investments with profit calculations (10% monthly return)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {investmentData?.investments.map((investment) => (
              <div key={investment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-semibold text-lg">{formatCurrency(investment.amount)}</p>
                      <Badge style={{ backgroundColor: getBlockchainColor(investment.blockchain), color: 'white' }}>
                        {investment.blockchain}
                      </Badge>
                      <Badge variant="secondary">
                        {investment.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Invested:</span> {formatDate(investment.investmentDate)}
                      </div>
                      <div>
                        <span className="font-medium">Days:</span> {investment.daysSinceInvestment}
                      </div>
                      <div>
                        <span className="font-medium">Daily Rate:</span> {investment.dailyProfitRate}%
                      </div>
                      <div>
                        <span className="font-medium">Monthly Rate:</span> {investment.monthlyProfitRate}%
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600 text-lg">
                    +{formatCurrency(investment.totalProfitEarned)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Today: +{formatCurrency(investment.todayProfit)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Total: {formatCurrency(investment.amount + parseFloat(investment.totalProfitEarned))}
                  </div>
                </div>
              </div>
            ))}
            
            {(!investmentData?.investments || investmentData.investments.length === 0) && (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">No investments yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Make your first deposit to start earning 10% monthly returns
                </p>
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-blue-400">
                    <strong>How it works:</strong> Each deposit becomes an active investment earning 10% monthly profit (0.333% daily)
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

export default MyInvestments;