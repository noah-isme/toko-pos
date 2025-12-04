'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Smartphone, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface QRISPaymentFormProps {
  totalAmount: number;
  onSuccess: (amountPaid: number) => void;
  onBack: () => void;
  isProcessing: boolean;
}

type QRISStatus = 'generating' | 'waiting' | 'success' | 'failed' | 'timeout';

export function QRISPaymentForm({
  totalAmount,
  onSuccess,
  onBack,
  isProcessing,
}: QRISPaymentFormProps) {
  const [status, setStatus] = useState<QRISStatus>('generating');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [errorMessage, setErrorMessage] = useState('');

  // Generate QR Code on mount
  useEffect(() => {
    generateQRCode();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (status !== 'waiting') return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setStatus('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Poll payment status
  useEffect(() => {
    if (status !== 'waiting') return;

    const pollInterval = setInterval(() => {
      checkPaymentStatus();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(pollInterval);
  }, [status, transactionId]);

  // Generate QR Code
  const generateQRCode = async () => {
    try {
      setStatus('generating');

      // Simulate API call to generate QR code
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate mock transaction ID
      const mockTransactionId = `QRIS-${Date.now()}`;
      setTransactionId(mockTransactionId);

      // Generate QR code URL using a QR code generator API
      // In production, this would be your payment gateway's QR code
      const qrData = `https://qris.example.com/pay?id=${mockTransactionId}&amount=${totalAmount}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

      setQrCodeUrl(qrUrl);
      setStatus('waiting');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      setStatus('failed');
      setErrorMessage('Gagal membuat QR Code. Silakan coba lagi.');
    }
  };

  // Check payment status (mock implementation)
  const checkPaymentStatus = async () => {
    try {
      // In production, this would call your payment gateway API
      // For demo purposes, we'll simulate a random success after some time

      // Simulate: 5% chance of success each check (simulating customer payment)
      if (Math.random() < 0.05) {
        setStatus('success');
        // Wait a moment to show success state
        setTimeout(() => {
          onSuccess(totalAmount);
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to check payment status:', error);
    }
  };

  const handleRetry = () => {
    setTimeRemaining(300);
    setErrorMessage('');
    generateQRCode();
  };

  const handleCancel = () => {
    onBack();
  };

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Method Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="p-3 bg-blue-50 rounded-lg">
          <Smartphone className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pembayaran QRIS</h3>
          <p className="text-sm text-gray-600">Scan QR Code untuk melanjutkan pembayaran</p>
        </div>
      </div>

      {/* QR Code Display */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
        <div className="flex flex-col items-center">
          {/* QR Code Container */}
          <div className="relative bg-white p-6 rounded-2xl shadow-xl">
            {status === 'generating' && (
              <div className="w-[300px] h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Membuat QR Code...</p>
                </div>
              </div>
            )}

            {status === 'waiting' && qrCodeUrl && (
              <div className="animate-fade-in">
                <img
                  src={qrCodeUrl}
                  alt="QRIS QR Code"
                  className="w-[300px] h-[300px] rounded-lg"
                />
                {/* Scanning animation overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-blue-500/50 animate-scan"></div>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="w-[300px] h-[300px] flex items-center justify-center animate-bounce-in">
                <div className="text-center">
                  <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto mb-4" />
                  <p className="text-xl font-bold text-green-600">Pembayaran Berhasil!</p>
                  <p className="text-sm text-gray-600 mt-2">Terima kasih</p>
                </div>
              </div>
            )}

            {(status === 'failed' || status === 'timeout') && (
              <div className="w-[300px] h-[300px] flex items-center justify-center animate-fade-in">
                <div className="text-center">
                  <XCircle className="w-20 h-20 text-red-600 mx-auto mb-4" />
                  <p className="text-xl font-bold text-red-600">
                    {status === 'timeout' ? 'Waktu Habis' : 'Pembayaran Gagal'}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {errorMessage || 'Silakan coba lagi'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Status Info */}
          <div className="mt-6 text-center space-y-2">
            {status === 'waiting' && (
              <>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <p className="text-sm font-medium text-gray-700">
                    Menunggu pembayaran...
                  </p>
                </div>
                <p className="text-xs text-gray-600">
                  Waktu tersisa: <span className="font-mono font-bold text-blue-600">{formatTime(timeRemaining)}</span>
                </p>
              </>
            )}

            {status === 'generating' && (
              <p className="text-sm text-gray-600">Mohon tunggu sebentar</p>
            )}

            {status === 'success' && (
              <p className="text-sm text-green-600 font-medium animate-fade-in">
                Transaksi sedang diproses...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Pembayaran</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
        </div>
        {transactionId && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">ID Transaksi</span>
            <span className="text-xs font-mono text-gray-700">{transactionId}</span>
          </div>
        )}
      </div>

      {/* Instructions */}
      {status === 'waiting' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 animate-fade-in">
          <p className="text-sm font-medium text-blue-900 mb-2">Cara Pembayaran:</p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Buka aplikasi e-wallet atau mobile banking Anda</li>
            <li>Pilih menu Scan QRIS atau Bayar</li>
            <li>Arahkan kamera ke QR Code di atas</li>
            <li>Konfirmasi pembayaran di aplikasi Anda</li>
          </ol>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {status === 'waiting' && (
          <>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-gray-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-5 h-5" />
              Kembali
            </button>
          </>
        )}

        {(status === 'failed' || status === 'timeout') && (
          <>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-6 py-4 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-gray-400/20"
            >
              Ganti Metode
            </button>
            <button
              type="button"
              onClick={handleRetry}
              className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/50"
            >
              Coba Lagi
            </button>
          </>
        )}
      </div>

      {/* Helper text */}
      {status === 'waiting' && (
        <div className="text-center text-xs text-gray-500">
          <p>Status pembayaran akan otomatis diperbarui</p>
        </div>
      )}
    </div>
  );
}
