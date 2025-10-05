import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWithdrawalOTP } from '@/hooks/use-withdrawal-otp';

interface WithdrawalOTPVerificationProps {
  type: 'income' | 'investment';
  amount?: number;
  investmentId?: string;
  blockchain: string;
  withdrawalAddress: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const WithdrawalOTPVerification: React.FC<WithdrawalOTPVerificationProps> = ({
  type,
  amount,
  investmentId,
  blockchain,
  withdrawalAddress,
  onSuccess,
  onCancel,
}) => {
  const {
    otpState,
    setOtpCode,
    sendOTP,
    verifyAndSubmit,
    resendOTP,
  } = useWithdrawalOTP();

  const withdrawalData = {
    type,
    amount,
    investmentId,
    blockchain,
    withdrawalAddress,
  };

  const handleSendOTP = async () => {
    await sendOTP(withdrawalData);
  };

  const handleVerifyAndSubmit = async () => {
    const success = await verifyAndSubmit(withdrawalData);
    if (success) {
      onSuccess();
    }
  };

  const handleResendOTP = async () => {
    await resendOTP(withdrawalData);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
          <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span>Verify OTP</span>
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          {!otpState.isSent 
            ? "We'll send a verification code to your registered email address"
            : "Enter the 6-digit code sent to your email"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Withdrawal Summary */}
        <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2 border border-border">
          <h4 className="font-medium text-foreground text-sm sm:text-base">Withdrawal Summary</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex justify-between sm:block">
              <span className="text-muted-foreground">Type:</span>
              <span className="sm:ml-2 font-medium capitalize">{type}</span>
            </div>
            {amount && (
              <div className="flex justify-between sm:block">
                <span className="text-muted-foreground">Amount:</span>
                <span className="sm:ml-2 font-medium">${amount}</span>
              </div>
            )}
            <div className="flex justify-between sm:block">
              <span className="text-muted-foreground">Network:</span>
              <span className="sm:ml-2 font-medium">{blockchain}</span>
            </div>
            <div className="sm:col-span-2">
              <div className="flex flex-col space-y-1">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-mono text-xs break-all bg-background p-2 rounded border border-border text-foreground">{withdrawalAddress}</span>
              </div>
            </div>
          </div>
        </div>

        {/* OTP Flow */}
        {!otpState.isSent ? (
          <div className="text-center space-y-3 sm:space-y-4">
            <Mail className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-yellow-500" />
            <div>
              <h3 className="font-medium text-base sm:text-lg">Send OTP to Email</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                We'll send a 6-digit verification code to your registered email
              </p>
            </div>
            <Button
              onClick={handleSendOTP}
              disabled={otpState.isSending}
              className="bg-yellow-500 hover:bg-yellow-600 text-black w-full sm:w-auto"
            >
              {otpState.isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send OTP'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-sm sm:text-base">Enter OTP Code</Label>
              <Input
                id="otp"
                type="text"
                value={otpState.code}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="h-12 sm:h-14 text-lg sm:text-xl text-center tracking-widest"
                maxLength={6}
                disabled={otpState.isLoading}
              />
              <p className="text-xs sm:text-sm text-muted-foreground text-center">
                OTP sent to your registered email. Check your inbox and spam folder.
              </p>
            </div>

            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendOTP}
                disabled={otpState.isSending}
                className="text-yellow-600 hover:text-yellow-700 text-sm sm:text-base"
              >
                {otpState.isSending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Resend OTP
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {otpState.error && (
          <Alert variant="destructive">
            <AlertDescription>{otpState.error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 sm:justify-end pt-4">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={otpState.isLoading}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          {otpState.isSent && (
            <Button
              onClick={handleVerifyAndSubmit}
              disabled={!otpState.code || otpState.code.length !== 6 || otpState.isLoading}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto order-1 sm:order-2"
            >
              {otpState.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Submitting...</span>
                  <span className="sm:hidden">Processing...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Submit Withdrawal Request</span>
                  <span className="sm:hidden">Submit Request</span>
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WithdrawalOTPVerification;