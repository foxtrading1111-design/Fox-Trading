import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, XCircle, Eye, Image as ImageIcon, ArrowDownCircle, ArrowUpCircle, History, Copy } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

// This type defines the shape of the data we expect from the API
type PendingDeposit = {
  id: string;
  amount: number;
  timestamp: string;
  description: string;
  income_source: string;
  users: {
    full_name: string;
    email: string;
  };
  deposit_metadata?: {
    blockchain: string;
    screenshot?: string;
    transaction_hash?: string;
    wallet_address?: string;
    created_at: string;
  };
};

type PendingWithdrawal = {
  id: string;
  amount: number;
  timestamp: string;
  description: string;
  income_source: string;
  users: {
    full_name: string;
    email: string;
  };
  withdrawal_details?: {
    blockchain: string;
    address: string;
    full_description: string;
  };
};

type TransactionHistory = {
  id: string;
  amount: number;
  timestamp: string;
  description: string;
  income_source: string;
  status: string;
  type: string;
  users: {
    full_name: string;
    email: string;
  };
  withdrawal_details?: {
    blockchain: string;
    address: string;
    full_description: string;
  };
};

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('deposits');

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Fetching deposit data
  const { data: deposits, isLoading: isLoadingDeposits, error: depositsError } = useQuery<PendingDeposit[]>({
    queryKey: ['admin', 'pending-deposits'],
    queryFn: () => api('/api/admin/deposits/pending'),
  });

  // Fetching withdrawal data
  const { data: withdrawals, isLoading: isLoadingWithdrawals, error: withdrawalsError } = useQuery<PendingWithdrawal[]>({
    queryKey: ['admin', 'pending-withdrawals'],
    queryFn: () => api('/api/admin/withdrawals/pending'),
  });

  // Fetching transaction history
  const { data: historyData, isLoading: isLoadingHistory, error: historyError } = useQuery<{
    transactions: TransactionHistory[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>({
    queryKey: ['admin', 'transaction-history'],
    queryFn: () => api('/api/admin/transactions/history?limit=100'),
  });

  // Mutation for approving a deposit
  const approveMutation = useMutation({
    mutationFn: (transactionId: string) => 
      api(`/api/admin/deposits/approve/${transactionId}`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Deposit approved successfully!');
      // Refetch the data to update the list
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-deposits'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to approve deposit.');
    },
  });

  // Mutation for declining a deposit
  const declineMutation = useMutation({
    mutationFn: (transactionId: string) => 
      api(`/api/admin/deposits/reject/${transactionId}`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Deposit declined successfully!');
      // Refetch the data to update the list
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-deposits'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to decline deposit.');
    },
  });

  // Mutation for approving a withdrawal
  const approveWithdrawalMutation = useMutation({
    mutationFn: (transactionId: string) => 
      api(`/api/admin/withdrawals/approve/${transactionId}`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Withdrawal approved successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-withdrawals'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to approve withdrawal.');
    },
  });

  // Mutation for declining a withdrawal
  const declineWithdrawalMutation = useMutation({
    mutationFn: (transactionId: string) => 
      api(`/api/admin/withdrawals/reject/${transactionId}`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Withdrawal declined successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-withdrawals'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to decline withdrawal.');
    },
  });

  // Helper function to get blockchain info from income_source
  const getBlockchainInfo = (incomeSource: string) => {
    if (incomeSource.includes('_deposit')) {
      const blockchain = incomeSource.replace('_deposit', '');
      return {
        symbol: blockchain,
        name: blockchain === 'BTC' ? 'Bitcoin' : 
              blockchain === 'ETH' ? 'Ethereum' :
              blockchain === 'USDT' ? 'Tether USD' :
              blockchain === 'USDC' ? 'USD Coin' :
              blockchain === 'BNB' ? 'Binance Coin' : blockchain
      };
    }
    return { symbol: 'MANUAL', name: 'Manual Deposit' };
  };

  // Helper function to render deposits content
  const renderDepositsContent = () => {
    if (isLoadingDeposits) {
      return <div className="text-center text-muted-foreground py-8">Loading deposit requests...</div>;
    }

    if (depositsError) {
      return (
        <div className="text-center text-red-500 flex items-center justify-center gap-2 py-8">
            <AlertCircle className="h-4 w-4" />
            <span>Error loading deposits: {depositsError.message}</span>
        </div>
      );
    }

    if (!deposits || deposits.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          There are no pending deposit requests at the moment.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">User</TableHead>
              <TableHead className="hidden sm:table-cell min-w-[160px]">Email</TableHead>
              <TableHead className="min-w-[80px]">Network</TableHead>
              <TableHead className="text-right min-w-[80px]">Amount</TableHead>
              <TableHead className="hidden md:table-cell min-w-[120px]">Tx Hash</TableHead>
              <TableHead className="min-w-[80px]">Screenshot</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[120px]">Requested On</TableHead>
              <TableHead className="text-center min-w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {deposits.map((deposit) => {
            const blockchainInfo = getBlockchainInfo(deposit.income_source);
            const metadata = deposit.deposit_metadata;
            
            return (
              <TableRow key={deposit.id}>
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <div className="font-medium">{deposit.users.full_name}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">{deposit.users.email}</div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{deposit.users.email}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-sm sm:text-lg">
                      {(metadata?.blockchain || blockchainInfo.symbol) === 'BEP20' ? '🔶' :
                       (metadata?.blockchain || blockchainInfo.symbol) === 'TRC20' ? '🔴' :
                       blockchainInfo.symbol === 'BTC' ? '₿' :
                       blockchainInfo.symbol === 'ETH' ? 'Ξ' :
                       blockchainInfo.symbol === 'USDT' ? '₮' :
                       blockchainInfo.symbol === 'USDC' ? '$' :
                       blockchainInfo.symbol === 'BNB' ? 'B' : '💳'}
                    </span>
                    <span className="text-xs sm:text-sm font-medium">
                      {metadata?.blockchain || blockchainInfo.symbol}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">${Number(deposit.amount).toFixed(2)}</TableCell>
                <TableCell className="hidden md:table-cell max-w-xs text-sm">
                  {metadata?.transaction_hash ? (
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {metadata.transaction_hash.substring(0, 10)}...
                    </code>
                  ) : (
                    <span className="text-muted-foreground text-xs">Not provided</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {metadata?.screenshot ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-blue-600 hover:bg-blue-100 text-xs sm:text-sm px-2 sm:px-3"
                        >
                          <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Transaction Screenshot</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="text-sm space-y-1">
                            <div><strong>User:</strong> {deposit.users.full_name}</div>
                            <div><strong>Amount:</strong> ${Number(deposit.amount).toFixed(2)}</div>
                            <div><strong>Network:</strong> {metadata.blockchain}</div>
                            {metadata.transaction_hash && (
                              <div><strong>Tx Hash:</strong> <code className="text-xs">{metadata.transaction_hash}</code></div>
                            )}
                          </div>
                          <div className="border rounded-lg p-4 bg-gray-50">
                            <img 
                              src={metadata.screenshot} 
                              alt="Transaction Screenshot" 
                              className="w-full h-auto max-h-96 object-contain rounded" 
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <span className="text-muted-foreground text-xs">No screenshot</span>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{new Date(deposit.timestamp).toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col sm:flex-row justify-center gap-1 sm:gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-green-600 hover:bg-green-100 hover:text-green-700 text-xs sm:text-sm px-2 sm:px-3"
                      onClick={() => approveMutation.mutate(deposit.id)}
                      disabled={approveMutation.isPending || declineMutation.isPending}
                    >
                      <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Approve</span>
                      <span className="sm:hidden">✓</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-600 hover:bg-red-100 hover:text-red-700 text-xs sm:text-sm px-2 sm:px-3"
                      onClick={() => declineMutation.mutate(deposit.id)}
                      disabled={approveMutation.isPending || declineMutation.isPending}
                    >
                       <XCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                       <span className="hidden sm:inline">Decline</span>
                       <span className="sm:hidden">✕</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Helper function to render withdrawals content
  const renderWithdrawalsContent = () => {
    if (isLoadingWithdrawals) {
      return <div className="text-center text-muted-foreground py-8">Loading withdrawal requests...</div>;
    }

    if (withdrawalsError) {
      return (
        <div className="text-center text-red-500 flex items-center justify-center gap-2 py-8">
            <AlertCircle className="h-4 w-4" />
            <span>Error loading withdrawals: {withdrawalsError.message}</span>
        </div>
      );
    }

    if (!withdrawals || withdrawals.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          There are no pending withdrawal requests at the moment.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">User</TableHead>
              <TableHead className="hidden sm:table-cell min-w-[160px]">Email</TableHead>
              <TableHead className="min-w-[80px]">Type</TableHead>
              <TableHead className="text-right min-w-[80px]">Amount</TableHead>
              <TableHead className="hidden md:table-cell min-w-[200px]">Withdrawal Address</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[120px]">Requested On</TableHead>
              <TableHead className="text-center min-w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {withdrawals.map((withdrawal) => {
            const isIncomeWithdrawal = withdrawal.income_source === 'income_withdrawal';
            
            return (
              <TableRow key={withdrawal.id}>
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <div className="font-medium">{withdrawal.users.full_name}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">{withdrawal.users.email}</div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{withdrawal.users.email}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-sm sm:text-lg">
                      {isIncomeWithdrawal ? '💰' : '💎'}
                    </span>
                    <span className="text-xs sm:text-sm font-medium">
                      {isIncomeWithdrawal ? 'Income' : 'Investment'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">${Number(withdrawal.amount).toFixed(2)}</TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {withdrawal.withdrawal_details?.address ? (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {withdrawal.withdrawal_details.blockchain}
                          </Badge>
                        </div>
                        <code className="text-xs bg-muted p-1 rounded mt-1 font-mono truncate max-w-[150px]">
                          {withdrawal.withdrawal_details.address}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(withdrawal.withdrawal_details?.address || '')}
                        className="h-6 w-6 p-0 hover:bg-yellow-100"
                        title="Copy address"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">No address</span>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{new Date(withdrawal.timestamp).toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col sm:flex-row justify-center gap-1 sm:gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-green-600 hover:bg-green-100 hover:text-green-700 text-xs sm:text-sm px-2 sm:px-3"
                      onClick={() => approveWithdrawalMutation.mutate(withdrawal.id)}
                      disabled={approveWithdrawalMutation.isPending || declineWithdrawalMutation.isPending}
                    >
                      <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Approve</span>
                      <span className="sm:hidden">✓</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-600 hover:bg-red-100 hover:text-red-700 text-xs sm:text-sm px-2 sm:px-3"
                      onClick={() => declineWithdrawalMutation.mutate(withdrawal.id)}
                      disabled={approveWithdrawalMutation.isPending || declineWithdrawalMutation.isPending}
                    >
                       <XCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                       <span className="hidden sm:inline">Decline</span>
                       <span className="sm:hidden">✕</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Helper function to render transaction history
  const renderHistoryContent = () => {
    if (isLoadingHistory) {
      return <div className="text-center text-muted-foreground py-8">Loading transaction history...</div>;
    }

    if (historyError) {
      return (
        <div className="text-center text-red-500 flex items-center justify-center gap-2 py-8">
            <AlertCircle className="h-4 w-4" />
            <span>Error loading history: {historyError.message}</span>
        </div>
      );
    }

    if (!historyData?.transactions || historyData.transactions.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          No transaction history available.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {historyData.transactions.length} of {historyData.pagination.total} transactions
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">User</TableHead>
                <TableHead className="hidden sm:table-cell min-w-[100px]">Type</TableHead>
                <TableHead className="text-right min-w-[80px]">Amount</TableHead>
                <TableHead className="min-w-[80px]">Status</TableHead>
                <TableHead className="hidden md:table-cell min-w-[200px]">Address/Details</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[120px]">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyData.transactions.map((transaction) => {
                const isWithdrawal = transaction.type === 'debit';
                const isDeposit = transaction.type === 'credit';
                const isCompleted = transaction.status === 'COMPLETED';
                
                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div className="font-medium">{transaction.users.full_name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">{transaction.users.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">
                          {isWithdrawal ? (
                            transaction.income_source === 'income_withdrawal' ? '💰' : '💎'
                          ) : (
                            transaction.income_source?.includes('_deposit') ? '📥' : '💳'
                          )}
                        </span>
                        <span className="text-xs font-medium">
                          {isWithdrawal ? (
                            transaction.income_source === 'income_withdrawal' ? 'Income' : 'Investment'
                          ) : 'Deposit'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${
                      isWithdrawal ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {isWithdrawal ? '-' : '+'}${Number(transaction.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={isCompleted ? 'default' : 'destructive'}
                        className={isCompleted ? 'bg-green-100 text-green-800' : ''}
                      >
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {isWithdrawal && transaction.withdrawal_details?.address ? (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <Badge variant="outline" className="text-xs mb-1 w-fit">
                              {transaction.withdrawal_details.blockchain}
                            </Badge>
                            <code className="text-xs bg-muted p-1 rounded font-mono truncate max-w-[150px]">
                              {transaction.withdrawal_details.address}
                            </code>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(transaction.withdrawal_details?.address || '')}
                            className="h-6 w-6 p-0 hover:bg-yellow-100"
                            title="Copy address"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : isDeposit ? (
                        <span className="text-xs text-muted-foreground">
                          {transaction.income_source?.replace('_deposit', '').toUpperCase() || 'Manual'} Deposit
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {new Date(transaction.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5" />
            Manage Payment Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="deposits" className="flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4" />
                Deposits ({deposits?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4" />
                Withdrawals ({withdrawals?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                History ({historyData?.pagination.total || 0})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="deposits" className="mt-6">
              {renderDepositsContent()}
            </TabsContent>
            <TabsContent value="withdrawals" className="mt-6">
              {renderWithdrawalsContent()}
            </TabsContent>
            <TabsContent value="history" className="mt-6">
              {renderHistoryContent()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}