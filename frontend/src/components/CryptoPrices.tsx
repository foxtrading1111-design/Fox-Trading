import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  BarChart3, 
  DollarSign,
  Clock,
  Activity,
  Zap
} from 'lucide-react';

type CryptoPriceData = {
  id: number;
  symbol: string;
  name: string;
  price: number;
  priceFormatted: string;
  percentChange1h: number;
  percentChange24h: number;
  percentChange7d: number;
  marketCap: number;
  volume24h: number;
  marketCapFormatted: string;
  volume24hFormatted: string;
  lastUpdated: string;
  rank: number;
  trend?: {
    '1h': 'up' | 'down' | 'neutral';
    '24h': 'up' | 'down' | 'neutral';
    '7d': 'up' | 'down' | 'neutral';
  };
};

type CryptoPricesResponse = {
  success: boolean;
  data: CryptoPriceData[];
  cached: boolean;
  lastUpdated: string;
  nextUpdate?: string;
  error?: string;
};

type MarketOverview = {
  totalMarketCap: number;
  totalMarketCapFormatted: string;
  total24hVolume: number;
  total24hVolumeFormatted: string;
  avgChange24h: number;
  topGainers: CryptoPriceData[];
  topLosers: CryptoPriceData[];
};

const CRYPTO_ICONS: Record<string, string> = {
  BTC: '₿',
  ETH: 'Ξ',
  USDT: '₮',
  USDC: '$',
  BNB: '🔸',
  ADA: '₳',
  SOL: '◎',
  MATIC: '🟣',
  XRP: '◉',
  DOGE: 'Ð',
  DOT: '●',
  AVAX: '🔺',
  LINK: '🔗',
  UNI: '🦄',
  LTC: 'Ł'
};

export default function CryptoPrices() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d'>('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Query for crypto prices
  const { 
    data: pricesData, 
    isLoading: pricesLoading, 
    error: pricesError, 
    refetch: refetchPrices 
  } = useQuery({
    queryKey: ['crypto-prices'],
    queryFn: () => api<CryptoPricesResponse>('/api/crypto/prices'),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 2
  });

  // Query for market overview
  const { data: marketData, isLoading: marketLoading } = useQuery({
    queryKey: ['market-overview'],
    queryFn: () => api<{ success: boolean; data: MarketOverview }>('/api/crypto/market-overview'),
    refetchInterval: 5 * 60 * 1000,
    retry: 2
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchPrices();
    setIsRefreshing(false);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral', size = 16) => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={size} className="text-green-500" />;
      case 'down':
        return <TrendingDown size={size} className="text-red-500" />;
      default:
        return <Minus size={size} className="text-gray-500" />;
    }
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getCryptoIcon = (symbol: string) => {
    return CRYPTO_ICONS[symbol] || '●';
  };

  if (pricesLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
            <span className="text-muted-foreground">Loading crypto prices...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pricesError || !pricesData?.success) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-500 mb-4">Failed to load cryptocurrency prices</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw size={16} className="mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const prices = pricesData.data || [];
  const market = marketData?.data;

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      {market && !marketLoading && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-yellow-500 sm:w-5 sm:h-5" />
                <span>Market Overview</span>
              </div>
              <Badge variant={market.avgChange24h >= 0 ? "default" : "destructive"} className="text-xs w-fit">
                {formatPercent(market.avgChange24h)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Market Cap</p>
                <p className="text-sm sm:text-base lg:text-lg font-bold truncate">{market.totalMarketCapFormatted}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">24h Volume</p>
                <p className="text-sm sm:text-base lg:text-lg font-bold truncate">{market.total24hVolumeFormatted}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Top Gainer</p>
                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                  <span className="text-sm sm:text-base lg:text-lg font-bold truncate">{market.topGainers[0]?.symbol}</span>
                  <span className="text-green-500 text-xs sm:text-sm shrink-0">
                    +{market.topGainers[0]?.percentChange24h.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Top Loser</p>
                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                  <span className="text-sm sm:text-base lg:text-lg font-bold truncate">{market.topLosers[0]?.symbol}</span>
                  <span className="text-red-500 text-xs sm:text-sm shrink-0">
                    {market.topLosers[0]?.percentChange24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Price Display */}
      <Card>
        <CardHeader className="pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-yellow-500 sm:w-5 sm:h-5" />
                <span>Cryptocurrency Prices</span>
              </div>
              {pricesData.cached && (
                <Badge variant="secondary" className="text-xs w-fit">
                  Cached
                </Badge>
              )}
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Timeframe selector */}
              <div className="flex rounded-lg border">
                {(['1h', '24h', '7d'] as const).map((timeframe) => (
                  <Button
                    key={timeframe}
                    variant={selectedTimeframe === timeframe ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedTimeframe(timeframe)}
                    className="rounded-none first:rounded-l-lg last:rounded-r-lg px-2 sm:px-3 py-1 h-8 flex-1 sm:flex-none"
                  >
                    {timeframe}
                  </Button>
                ))}
              </div>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                className="w-full sm:w-auto"
              >
                <RefreshCw size={14} className={`mr-2 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Refresh Prices</span>
              </Button>
            </div>
          </div>
          {pricesData.lastUpdated && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-2">
              <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
              Last updated: {new Date(pricesData.lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Top 5 cryptos in a grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
            {prices.slice(0, 5).map((crypto) => {
              const change = crypto[`percentChange${selectedTimeframe}` as keyof CryptoPriceData] as number;
              const trend = crypto.trend?.[selectedTimeframe] || (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral');
              
              return (
                <Card key={crypto.id} className="relative overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                        <span className="text-lg sm:text-xl lg:text-2xl shrink-0">{getCryptoIcon(crypto.symbol)}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm truncate">{crypto.symbol}</p>
                          <p className="text-xs text-muted-foreground">#{crypto.rank}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getTrendIcon(trend, 16)}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm sm:text-base lg:text-lg font-bold truncate">{crypto.priceFormatted}</p>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs sm:text-sm font-medium ${getChangeColor(change)} truncate`}>
                          {formatPercent(change)}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {selectedTimeframe}
                        </span>
                      </div>
                    </div>
                    
                    {/* Background gradient based on trend */}
                    <div className={`absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full blur-2xl opacity-10 ${
                      trend === 'up' ? 'bg-green-500' : 
                      trend === 'down' ? 'bg-red-500' : 'bg-gray-500'
                    }`} />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detailed table for all cryptos */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 sm:p-3 font-medium text-xs sm:text-sm">#</th>
                    <th className="text-left p-2 sm:p-3 font-medium text-xs sm:text-sm">Name</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm">Price</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm">1h</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm">24h</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm">7d</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm hidden md:table-cell">Market Cap</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm hidden lg:table-cell">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((crypto, index) => (
                    <tr 
                      key={crypto.id} 
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium">{crypto.rank}</span>
                      </td>
                      <td className="p-2 sm:p-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <span className="text-base sm:text-lg lg:text-xl shrink-0">{getCryptoIcon(crypto.symbol)}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate">{crypto.symbol}</p>
                            <p className="text-xs text-muted-foreground truncate hidden sm:block">{crypto.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 text-right">
                        <span className="font-mono font-medium text-xs sm:text-sm">{crypto.priceFormatted}</span>
                      </td>
                      <td className="p-2 sm:p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getTrendIcon(crypto.trend?.['1h'] || (crypto.percentChange1h > 0 ? 'up' : crypto.percentChange1h < 0 ? 'down' : 'neutral'), 10)}
                          <span className={`text-xs sm:text-sm ${getChangeColor(crypto.percentChange1h)}`}>
                            {formatPercent(crypto.percentChange1h)}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getTrendIcon(crypto.trend?.['24h'] || (crypto.percentChange24h > 0 ? 'up' : crypto.percentChange24h < 0 ? 'down' : 'neutral'), 10)}
                          <span className={`text-xs sm:text-sm font-medium ${getChangeColor(crypto.percentChange24h)}`}>
                            {formatPercent(crypto.percentChange24h)}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getTrendIcon(crypto.trend?.['7d'] || (crypto.percentChange7d > 0 ? 'up' : crypto.percentChange7d < 0 ? 'down' : 'neutral'), 10)}
                          <span className={`text-xs sm:text-sm ${getChangeColor(crypto.percentChange7d)}`}>
                            {formatPercent(crypto.percentChange7d)}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 text-right hidden md:table-cell">
                        <span className="text-xs sm:text-sm">{crypto.marketCapFormatted}</span>
                      </td>
                      <td className="p-2 sm:p-3 text-right hidden lg:table-cell">
                        <span className="text-xs sm:text-sm">{crypto.volume24hFormatted}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap size={10} className="sm:w-3 sm:h-3" />
              <span>Powered by CoinMarketCap API</span>
              {pricesData.error && (
                <Badge variant="destructive" className="text-xs">
                  API Issue
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Auto-refresh: 5 minutes
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}