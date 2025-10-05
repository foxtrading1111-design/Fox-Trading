import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface OTPState {
  code: string;
  isLoading: boolean;
  isSending: boolean;
  isSent: boolean;
  isVerified: boolean;
  error: string | null;
}

interface WithdrawalOTPData {
  type: 'income' | 'investment';
  amount?: number;
  investmentId?: string;
  blockchain: string;
  withdrawalAddress: string;
}

export const useWithdrawalOTP = () => {
  const [otpState, setOtpState] = useState<OTPState>({
    code: '',
    isLoading: false,
    isSending: false,
    isSent: false,
    isVerified: false,
    error: null,
  });

  const setOtpCode = (code: string) => {
    // Only allow 6 digits
    const numericCode = code.replace(/\D/g, '').slice(0, 6);
    setOtpState(prev => ({ ...prev, code: numericCode, error: null }));
  };

  const sendOTP = async (data: WithdrawalOTPData) => {
    setOtpState(prev => ({ ...prev, isSending: true, error: null }));
    
    try {
      const endpoint = data.type === 'income' 
        ? '/api/auth/send-withdrawal-otp'
        : '/api/auth/send-investment-withdrawal-otp';
      
      await api(endpoint, {
        method: 'POST',
        body: data.type === 'income' 
          ? {
              type: 'income',
              amount: data.amount,
              blockchain: data.blockchain,
              withdrawal_address: data.withdrawalAddress,
            }
          : {
              type: 'investment',
              investment_id: data.investmentId,
              blockchain: data.blockchain,
              withdrawal_address: data.withdrawalAddress,
            },
      });
      
      setOtpState(prev => ({ 
        ...prev, 
        isSending: false, 
        isSent: true 
      }));
      toast.success('OTP sent to your email!');
    } catch (error: any) {
      setOtpState(prev => ({ 
        ...prev, 
        isSending: false, 
        error: error.message || 'Failed to send OTP' 
      }));
      toast.error(error.message || 'Failed to send OTP');
    }
  };

  const verifyAndSubmit = async (data: WithdrawalOTPData) => {
    if (!otpState.code || otpState.code.length !== 6) {
      toast.error('Please enter valid 6-digit OTP');
      return false;
    }

    setOtpState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const endpoint = data.type === 'income' 
        ? '/api/withdrawal/income'
        : '/api/withdrawal/investment';
      
      const body = data.type === 'income'
        ? {
            amount: data.amount,
            withdrawal_address: data.withdrawalAddress,
            blockchain: data.blockchain,
            otp_code: otpState.code,
          }
        : {
            investment_id: data.investmentId,
            withdrawal_address: data.withdrawalAddress,
            blockchain: data.blockchain,
            otp_code: otpState.code,
          };

      await api(endpoint, {
        method: 'POST',
        body,
      });

      setOtpState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isVerified: true 
      }));
      
      toast.success('Withdrawal request submitted successfully!');
      return true;
    } catch (error: any) {
      setOtpState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to submit withdrawal' 
      }));
      toast.error(error.message || 'Failed to submit withdrawal');
      return false;
    }
  };

  const resetOTP = () => {
    setOtpState({
      code: '',
      isLoading: false,
      isSending: false,
      isSent: false,
      isVerified: false,
      error: null,
    });
  };

  const resendOTP = async (data: WithdrawalOTPData) => {
    await sendOTP(data);
  };

  return {
    otpState,
    setOtpCode,
    sendOTP,
    verifyAndSubmit,
    resetOTP,
    resendOTP,
  };
};