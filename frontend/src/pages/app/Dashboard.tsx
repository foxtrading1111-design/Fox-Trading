import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target,
  Copy,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  DollarSign,
  BarChart3,
  UserCheck,
  Loader2
} from 'lucide-react';
import { useDashboardData } from '@/hooks/use-api';
import { toast } from '@/hooks/use-toast';
import CryptoPrices from '@/components/CryptoPrices';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DirectIncome from './DirectIncome';
import TeamIncome from './TeamIncome';
import TodayWithdrawal from './TodayWithdrawal';
import TotalWithdrawal from './TotalWithdrawal';
import MyIncome from './MyIncome'; // Salary Income (existing component)

const Dashboard: React.FC = () => {
  const [showBalance, setShowBalance] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { data, loading, error } = useDashboardData();
  
  // Update timestamp when data changes
  React.useEffect(() => {
    if (data && !loading) {
      setLastUpdate(new Date());
    }
  }, [data, loading]);
  

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-2">Error loading dashboard</div>
        <div className="text-muted-foreground">{error}</div>
      </div>
    );
  }

  // If no data, show empty state
  if (!data) {
    return (
      <div className="p-6 text-center">
        <div className="text-muted-foreground">No dashboard data available</div>
      </div>
    );
  }

  // Use real data from API
  const userStats = {
    name: data.user_name,
    referralCode: data.referral_code,
    email: data.user_email,
    totalBalance: Number(data.wallet_balance),
    dailyIncome: Number(data.daily_income),
    totalIncome: Number(data.total_income),
    totalWithdrawal: Number(data.total_withdrawal),
    investment: Number(data.total_investment),
    todayInvestmentProfit: Number(data.today_investment_profit || 0),
    totalInvestmentProfit: Number(data.total_investment_profit || 0),
    rightLegBusiness: Number(data.right_leg_business),
    leftLegBusiness: Number(data.left_leg_business),
    totalBusiness: Number(data.total_business),
    directTeam: data.direct_team,
    totalTeam: data.total_team
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 rounded-lg p-4 sm:p-6 border border-yellow-500/20">
        {/* Real-time update indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">
              Live • Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* User Info */}
          <div className="space-y-1 sm:space-y-2">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">Welcome Back!</h2>
            <p className="text-xl sm:text-2xl font-bold text-yellow-500 truncate">{userStats.name}</p>
          </div>
          
          {/* Referral Code */}
          <div className="space-y-1 sm:space-y-2">
            <p className="text-xs sm:text-sm text-muted-foreground">Referral Code</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 px-2 sm:px-3 py-1 text-xs sm:text-sm">
                {userStats.referralCode}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-yellow-500/10 shrink-0"
                onClick={() => copyToClipboard(userStats.referralCode)}
              >
                <Copy size={12} className="sm:w-3.5 sm:h-3.5" />
              </Button>
            </div>
          </div>
          
          {/* Email */}
          <div className="space-y-1 sm:space-y-2 sm:col-span-2 lg:col-span-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Email ID</p>
            <p className="font-medium text-sm sm:text-base truncate">{userStats.email}</p>
          </div>
        </div>
      </div>

      {/* Balance Section */}
      <Card className="border-yellow-500/20">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <CardTitle className="text-lg sm:text-xl">Total Balance</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setShowBalance(!showBalance)}
              >
                {showBalance ? <Eye size={14} className="sm:w-4 sm:h-4" /> : <EyeOff size={14} className="sm:w-4 sm:h-4" />}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                <Wallet size={14} className="mr-2 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Wallet</span>
                <span className="sm:hidden">Balance</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-500 mb-2 sm:mb-4">
            {showBalance ? `$${userStats.totalBalance.toLocaleString()}` : '****'}
          </div>
        </CardContent>
      </Card>

      {/* Income & Withdrawal Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Daily Income */}
        <Card className="border-green-500/20">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <TrendingUp size={14} className="text-green-500 sm:w-4 sm:h-4" />
              Daily Income
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-500">
              ${userStats.dailyIncome.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Total Income */}
        <Card className="border-blue-500/20">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <DollarSign size={14} className="text-blue-500 sm:w-4 sm:h-4" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-500">
              ${userStats.totalIncome.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Today's Investment Profit */}
        <Card className="border-purple-500/20">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <BarChart3 size={14} className="text-purple-500 sm:w-4 sm:h-4" />
              Today's Investment Profit
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-500">
              ${userStats.todayInvestmentProfit.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              0.333% daily from investments
            </div>
          </CardContent>
        </Card>

        {/* Total Withdrawal */}
        <Card className="border-red-500/20">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <TrendingDown size={14} className="text-red-500 sm:w-4 sm:h-4" />
              Total Withdrawal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-500">
              ${userStats.totalWithdrawal.toLocaleString()}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full hover:bg-red-500/10 hover:border-red-500/50"
            >
              <ArrowUp size={12} className="mr-2 sm:w-3.5 sm:h-3.5" />
              Withdraw
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Business Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investment & Business */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Business Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                <p className="text-sm text-muted-foreground mb-1">Investment</p>
                <p className="text-xl font-bold text-yellow-500">${userStats.investment.toLocaleString()}</p>
                <p className="text-xs text-green-400 mt-1">+${userStats.todayInvestmentProfit.toFixed(2)} today</p>
                <p className="text-xs text-blue-400 mt-1">Total profit: ${userStats.totalInvestmentProfit.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-blue-500/5 rounded-lg border border-blue-500/10">
                <p className="text-sm text-muted-foreground mb-1">Total Business</p>
                <p className="text-xl font-bold text-blue-500">${userStats.totalBusiness.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-500/5 rounded-lg border border-green-500/10">
                <span className="text-sm font-medium">Right Leg Business</span>
                <span className="font-bold text-green-500">${userStats.rightLegBusiness.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-500/5 rounded-lg border border-purple-500/10">
                <span className="text-sm font-medium">Left Leg Business</span>
                <span className="font-bold text-purple-500">${userStats.leftLegBusiness.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users size={18} />
              Team Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-500/5 rounded-lg border border-green-500/10">
                <UserCheck size={24} className="mx-auto mb-2 text-green-500" />
                <p className="text-sm text-muted-foreground mb-1">Direct Team</p>
                <p className="text-2xl font-bold text-green-500">{userStats.directTeam}</p>
              </div>
              <div className="text-center p-4 bg-blue-500/5 rounded-lg border border-blue-500/10">
                <Target size={24} className="mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-muted-foreground mb-1">Total Team</p>
                <p className="text-2xl font-bold text-blue-500">{userStats.totalTeam}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Tabs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <BarChart3 size={20} />
            Dashboard Tabs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="direct-income" className="text-xs sm:text-sm">Direct Income</TabsTrigger>
              <TabsTrigger value="team-income" className="text-xs sm:text-sm">Team Income</TabsTrigger>
              <TabsTrigger value="salary-income" className="text-xs sm:text-sm">Salary Income</TabsTrigger>
              <TabsTrigger value="today-withdrawal" className="text-xs sm:text-sm">Today Withdrawal</TabsTrigger>
              <TabsTrigger value="total-withdrawal" className="text-xs sm:text-sm">Total Withdrawal</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6">
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Main Dashboard Overview</p>
                <p className="text-sm text-muted-foreground mt-2">
                  This is your main dashboard showing key metrics and recent activity.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="direct-income" className="mt-6">
              <DirectIncome />
            </TabsContent>
            
            <TabsContent value="team-income" className="mt-6">
              <TeamIncome />
            </TabsContent>
            
            <TabsContent value="salary-income" className="mt-6">
              <MyIncome />
            </TabsContent>
            
            <TabsContent value="today-withdrawal" className="mt-6">
              <TodayWithdrawal />
            </TabsContent>
            
            <TabsContent value="total-withdrawal" className="mt-6">
              <TotalWithdrawal />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Live Crypto Markets */}
      <CryptoPrices />
    </div>
  );
};

export default Dashboard;