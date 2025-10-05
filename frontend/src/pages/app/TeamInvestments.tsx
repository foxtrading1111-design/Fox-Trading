import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target,
  BarChart3
} from 'lucide-react';

type TeamInvestment = {
  id: string;
  amount: number;
  investmentDate: string;
  daysSinceInvestment: number;
  totalProfitEarned: string;
  todayProfit: string;
  investor: {
    name: string;
    email: string;
  };
  blockchain: string;
};

type TeamInvestmentData = {
  teamInvestments: TeamInvestment[];
  summary: {
    totalTeamInvested: string;
    totalTeamProfitEarned: string;
    totalTeamInvestments: number;
    teamMembers: number;
  };
};

const TeamInvestments: React.FC = () => {
  const { data: teamData, isLoading } = useQuery<TeamInvestmentData>({ 
    queryKey: ['team-investments'], 
    queryFn: () => api<TeamInvestmentData>('/api/user/investments/team') 
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">Team Investments</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your team's investment activities and profits
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
        <h1 className="text-2xl font-bold text-yellow-500">Team Investments</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your team's investment activities with 10% monthly returns
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Team Invested</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(teamData?.summary.totalTeamInvested || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Team principal</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Profit Earned</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(teamData?.summary.totalTeamProfitEarned || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total team profit</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Investments</p>
                <p className="text-2xl font-bold text-purple-600">{teamData?.summary.totalTeamInvestments || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Active investments</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold text-orange-600">{teamData?.summary.teamMembers || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total downline</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Investment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Team Investment Details</CardTitle>
          <CardDescription>
            All team member investments with profit calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamData?.teamInvestments.map((investment) => (
              <div key={investment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {getInitials(investment.investor.name)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-semibold text-lg">{formatCurrency(investment.amount)}</p>
                      <Badge style={{ backgroundColor: getBlockchainColor(investment.blockchain), color: 'white' }}>
                        {investment.blockchain}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <p className="font-medium">{investment.investor.name}</p>
                      <p className="text-xs">{investment.investor.email}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Invested:</span> {formatDate(investment.investmentDate)}
                      </div>
                      <div>
                        <span className="font-medium">Days Active:</span> {investment.daysSinceInvestment}
                      </div>
                      <div>
                        <span className="font-medium">Today's Profit:</span> +{formatCurrency(investment.todayProfit)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600 text-lg">
                    +{formatCurrency(investment.totalProfitEarned)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Total Profit Earned
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Current Value: {formatCurrency(investment.amount + parseFloat(investment.totalProfitEarned))}
                  </div>
                </div>
              </div>
            ))}
            
            {(!teamData?.teamInvestments || teamData.teamInvestments.length === 0) && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">No team investments yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your team members haven't made any investments yet
                </p>
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-green-400">
                    <strong>Grow your team:</strong> Refer more people to expand your investment network and earn referral income
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Investment Performance Chart could be added here */}
      {teamData?.teamInvestments && teamData.teamInvestments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Investment Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrency(
                    teamData.teamInvestments.reduce((sum, inv) => sum + Number(inv.todayProfit), 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Team's Today Profit</p>
              </div>
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-2xl font-bold text-green-400">
                  {teamData.teamInvestments.length > 0 
                    ? (teamData.teamInvestments.reduce((sum, inv) => sum + inv.amount, 0) / teamData.teamInvestments.length).toFixed(0)
                    : '0'}
                </p>
                <p className="text-sm text-muted-foreground">Avg Investment Size</p>
              </div>
              <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-2xl font-bold text-purple-400">
                  {teamData.teamInvestments.length > 0 
                    ? Math.round(teamData.teamInvestments.reduce((sum, inv) => sum + inv.daysSinceInvestment, 0) / teamData.teamInvestments.length)
                    : '0'}
                </p>
                <p className="text-sm text-muted-foreground">Avg Days Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamInvestments;