import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, Upload, ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';

interface WalletAddress {
  blockchain: string;
  address: string;
}

interface CryptoDepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddresses: WalletAddress[];
}

type DepositStep = 'network' | 'amount' | 'upload' | 'otp' | 'success';

const CryptoDepositDialog: React.FC<CryptoDepositDialogProps> = ({
  isOpen,
  onClose,
  walletAddresses,
}) => {
  const { token } = useAuth();
  const [currentStep, setCurrentStep] = useState<DepositStep>('network');
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('');
  const [copiedAddress, setCopiedAddress] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [otpCode, setOtpCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const selectedAddress = walletAddresses.find(
    (wallet) => wallet.blockchain === selectedBlockchain
  )?.address;

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success('Address copied to clipboard!');
      
      // Reset copy state after 2 seconds
      setTimeout(() => setCopiedAddress(''), 2000);
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and ensure it's a multiple of 10
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      setDepositAmount('');
      return;
    }
    setDepositAmount(value);
  };

  const isAmountValid = () => {
    const amount = parseFloat(depositAmount);
    return amount >= 100 && amount % 10 === 0;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      setScreenshot(file);
      toast.success('Screenshot uploaded successfully!');
    }
  };

  const handleSendOTP = async () => {
    setIsLoading(true);
    try {
      await api('/api/auth/send-deposit-otp', {
        method: 'POST',
        body: {
          amount: parseFloat(depositAmount),
          blockchain: selectedBlockchain
        }
      });
      setOtpSent(true);
      toast.success('OTP sent to your email!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!screenshot) {
      toast.error('Please upload transaction screenshot');
      return;
    }
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      // Convert screenshot to base64 for JSON API
      const screenshotBase64 = screenshot ? await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(screenshot);
      }) : undefined;

      await api('/api/auth/verify-deposit-otp', {
        method: 'POST',
        body: {
          amount: parseFloat(depositAmount),
          blockchain: selectedBlockchain,
          otp_code: otpCode,
          transaction_hash: undefined, // Optional - user can provide if they have it
          screenshot: screenshotBase64
        }
      });

      setCurrentStep('success');
      toast.success('Deposit request submitted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit deposit');
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setCurrentStep('network');
    setSelectedBlockchain('');
    setDepositAmount('');
    setScreenshot(null);
    setOtpCode('');
    setOtpSent(false);
    setCopiedAddress('');
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  const blockchainOptions = [
    { value: 'BEP20', label: 'BEP20 (Binance Smart Chain)', color: 'text-yellow-600', description: 'USDT, USDC, BNB on BSC' },
    { value: 'TRC20', label: 'TRC20 (Tron Network)', color: 'text-red-500', description: 'USDT on Tron Network' },
  ];

  const getQRCodeUrl = (address: string, blockchain: string) => {
    // Use custom QR code images if available, otherwise fall back to generated QR codes
    // Try PNG first, then SVG
    const customQRPath = `/qr-codes/${blockchain.toLowerCase()}-qr.png`;
    
    // For now, we'll use the custom path and handle errors in the onError handler
    // If the custom image doesn't exist, it will fall back to generated QR code
    return customQRPath;
  };
  
  const getCustomQRCodeSvg = (blockchain: string) => {
    // Alternative SVG path for custom QR codes
    return `/qr-codes/${blockchain.toLowerCase()}-qr.svg`;
  };
  
  const getFallbackQRCodeUrl = (address: string, blockchain: string) => {
    // Fallback to generated QR codes
    const qrData = `${blockchain.toLowerCase()}:${address}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'network': return 'Select Network';
      case 'amount': return 'Deposit Amount';
      case 'upload': return 'Upload Screenshot';
      case 'otp': return 'Verify OTP';
      case 'success': return 'Deposit Submitted';
      default: return 'Crypto Deposit';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'network': return 'Choose your preferred deposit network';
      case 'amount': return 'Enter deposit amount and copy wallet address';
      case 'upload': return 'Upload transaction screenshot';
      case 'otp': return 'Enter OTP sent to your email';
      case 'success': return 'Your deposit request has been submitted for review';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[95vh] overflow-y-auto m-2 sm:m-8 p-4 sm:p-6">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-yellow-500 text-lg sm:text-xl flex items-center gap-2">
            {currentStep !== 'network' && currentStep !== 'success' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (currentStep === 'amount') setCurrentStep('network');
                  if (currentStep === 'upload') setCurrentStep('amount');
                  if (currentStep === 'otp') setCurrentStep('upload');
                }}
                className="p-1 h-8 w-8 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span className="truncate">{getStepTitle()}</span>
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base leading-relaxed">
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Network Selection */}
          {currentStep === 'network' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Select Network</Label>
                <Select value={selectedBlockchain} onValueChange={setSelectedBlockchain}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Choose network (BEP20 or TRC20)" />
                  </SelectTrigger>
                  <SelectContent>
                    {blockchainOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={!walletAddresses.some(w => w.blockchain === option.value)}
                      >
                        <div className="flex flex-col">
                          <span className={`${option.color} font-medium`}>{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setCurrentStep('amount')}
                  disabled={!selectedBlockchain}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  Next: Enter Amount
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Amount Entry */}
          {currentStep === 'amount' && selectedAddress && (
            <div className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Deposit Amount (USD)</Label>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="Enter amount (min $100, multiples of $10)"
                  className="h-12 text-base sm:text-lg"
                  min="100"
                  step="10"
                />
                {depositAmount && !isAmountValid() && (
                  <p className="text-sm text-red-500">
                    Amount must be minimum $100 and in multiples of $10
                  </p>
                )}
              </div>

              {/* Wallet Address Display */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-center py-2 sm:py-4">
                    <div className="p-2 sm:p-3 bg-white rounded-xl shadow-sm border">
                      <img
                        src={getQRCodeUrl(selectedAddress, selectedBlockchain)}
                        alt={`${selectedBlockchain} QR Code`}
                        className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          // Try SVG version first, then fallback generated QR code
                          if (target.src.includes('.png')) {
                            target.src = getCustomQRCodeSvg(selectedBlockchain);
                          } else if (!target.src.includes('qrserver.com')) {
                            target.src = getFallbackQRCodeUrl(selectedAddress, selectedBlockchain);
                          } else {
                            // If all options fail, show placeholder
                            target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="sans-serif" font-size="12">QR Code</text></svg>';
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Send {selectedBlockchain === 'BEP20' ? 'USDT/USDC/BNB' : 'USDT'} to this address
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Network: {selectedBlockchain === 'BEP20' ? 'Binance Smart Chain (BSC)' : 'Tron (TRC20)'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      📱 Scan QR code with your wallet app
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">Wallet Address</Label>
                    <div className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                      <code className="flex-1 text-xs sm:text-sm font-mono text-gray-700 dark:text-gray-300 break-all leading-relaxed">
                        {selectedAddress}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyAddress(selectedAddress)}
                        className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        {copiedAddress === selectedAddress ? (
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Amount Summary */}
                  {depositAmount && isAmountValid() && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-800 mb-2">Deposit Summary</h4>
                      <div className="text-sm text-yellow-700 space-y-1">
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span className="font-medium">${depositAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Network:</span>
                          <span className="font-medium">{selectedBlockchain}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setCurrentStep('upload')}
                  disabled={!isAmountValid()}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  Next: Upload Screenshot
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Screenshot Upload */}
          {currentStep === 'upload' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <Label className="text-sm font-medium text-foreground">Upload Transaction Screenshot</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center">
                  {screenshot ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <img
                          src={URL.createObjectURL(screenshot)}
                          alt="Transaction screenshot"
                          className="max-h-48 max-w-full rounded-lg shadow-md"
                        />
                      </div>
                      <p className="text-sm text-green-600 font-medium">
                        ✓ {screenshot.name} uploaded successfully
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setScreenshot(null)}
                      >
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="screenshot-upload"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('screenshot-upload')?.click()}
                      >
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Important Instructions</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Upload a clear screenshot of your transaction</li>
                    <li>• Make sure transaction hash/ID is visible</li>
                    <li>• Ensure the amount matches your deposit amount</li>
                    <li>• Screenshot should show the correct network ({selectedBlockchain})</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setCurrentStep('otp')}
                  disabled={!screenshot}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  Next: Verify OTP
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: OTP Verification */}
          {currentStep === 'otp' && (
            <div className="space-y-6">
              <div className="space-y-4">
                {!otpSent ? (
                  <div className="text-center space-y-4">
                    <Mail className="mx-auto h-16 w-16 text-yellow-500" />
                    <div>
                      <h3 className="font-medium text-lg">Send OTP to Email</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        We'll send a 6-digit verification code to your registered email
                      </p>
                    </div>
                    <Button
                      onClick={handleSendOTP}
                      disabled={isLoading}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    >
                      {isLoading ? (
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
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-foreground">Enter OTP Code</Label>
                    <Input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      className="h-12 text-base sm:text-lg text-center tracking-wider sm:tracking-widest"
                      maxLength={6}
                    />
                    <p className="text-sm text-muted-foreground text-center">
                      OTP sent to your registered email. Check your inbox and spam folder.
                    </p>
                    <div className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSendOTP}
                        disabled={isLoading}
                      >
                        Resend OTP
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {otpSent && (
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSubmitDeposit}
                    disabled={!otpCode || otpCode.length !== 6 || isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Deposit Request'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Success */}
          {currentStep === 'success' && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-lg text-green-600">Deposit Request Submitted!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your deposit request has been sent to our admin team for review. You'll receive an email notification once it's processed.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h4 className="font-medium mb-2">Deposit Details:</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-medium">${depositAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network:</span>
                    <span className="font-medium">{selectedBlockchain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-yellow-600 font-medium">Pending Review</span>
                  </div>
                </div>
              </div>
            </div>
          )}          

          {/* Address and QR Code */}
          {selectedAddress && (
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* QR Code */}
                <div className="flex justify-center py-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm border">
                    <img
                      src={getQRCodeUrl(selectedAddress, selectedBlockchain)}
                      alt={`${selectedBlockchain} QR Code`}
                      className="w-44 h-44 rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Try SVG version first, then fallback generated QR code
                        if (target.src.includes('.png')) {
                          target.src = getCustomQRCodeSvg(selectedBlockchain);
                        } else if (!target.src.includes('qrserver.com')) {
                          target.src = getFallbackQRCodeUrl(selectedAddress, selectedBlockchain);
                        } else {
                          // If all options fail, show placeholder
                          target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="sans-serif" font-size="12">QR Code</text></svg>';
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Network Info */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Send {selectedBlockchain === 'BEP20' ? 'USDT/USDC/BNB' : 'USDT'} to this address
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Network: {selectedBlockchain === 'BEP20' ? 'Binance Smart Chain (BSC)' : 'Tron (TRC20)'}
                  </p>
                </div>

                {/* Address */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Wallet Address</label>
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <code className="flex-1 text-sm font-mono text-gray-700 dark:text-gray-300 break-all leading-relaxed">
                      {selectedAddress}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyAddress(selectedAddress)}
                      className="flex-shrink-0 h-9 w-9 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      {copiedAddress === selectedAddress ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Important Notice</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {selectedBlockchain === 'BEP20' ? (
                      <>
                        <li>• Only send BEP20 tokens (USDT, USDC, BNB) to this address</li>
                        <li>• Must use Binance Smart Chain (BSC) network</li>
                        <li>• Do not send ERC20 or other network tokens</li>
                      </>
                    ) : (
                      <>
                        <li>• Only send TRC20 USDT to this address</li>
                        <li>• Must use Tron (TRC20) network</li>
                        <li>• Do not send ERC20 or BEP20 tokens</li>
                      </>
                    )}
                    <li>• Sending wrong network tokens may result in permanent loss</li>
                    <li>• Deposits typically confirm within 5-15 minutes</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        <div className="flex justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 pb-2">
          {currentStep === 'success' ? (
            <Button onClick={handleClose} className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 sm:px-6 text-sm sm:text-base">
              Done
            </Button>
          ) : (
            <Button variant="outline" onClick={handleClose} className="px-4 sm:px-6 text-sm sm:text-base">
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CryptoDepositDialog;