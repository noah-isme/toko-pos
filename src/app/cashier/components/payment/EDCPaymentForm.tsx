'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/trpc/client';

interface EDCPaymentFormProps {
  outletId: string;
  totalAmount: number;
  onSuccess: (amountPaid: number, gatewayReference?: string) => void;
  onBack: () => void;
  isProcessing: boolean;
}

type EDCStatus = 'waiting' | 'success' | 'failed' | 'timeout';

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_SECONDS = 120;

export function EDCPaymentForm({
  outletId,
  totalAmount,
  onSuccess,
  onBack,
  isProcessing,
}: EDCPaymentFormProps) {
  const [status, setStatus] = useState<EDCStatus>('waiting');
  const [transactionId, setTransactionId] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(TIMEOUT_SECONDS);
  const [errorMessage, setErrorMessage] = useState('');
  const [cardInfo, setCardInfo] = useState<{ brand?: string; lastFour?: string } | null>(null);

  const initiateEDC = api.payments.initiateEDC.useMutation();
  const checkStatus = api.payments.checkEDC.useQuery(
    { transactionId },
    {
      enabled: Boolean(transactionId) && status === 'waiting',
      refetchInterval: POLL_INTERVAL_MS,
    },
  );

  const startPayment = useCallback(async () => {
    try {
      setStatus('waiting');
      setErrorMessage('');

      const newReferenceId = `EDC-${Date.now()}`;
      setReferenceId(newReferenceId);

      const result = await initiateEDC.mutateAsync({
        outletId,
        amount: Math.round(totalAmount),
        referenceId: newReferenceId,
        description: `Pembayaran EDC ${newReferenceId}`,
      });

      setTransactionId(result.transactionId);
      setCardInfo(
        result.cardBrand || result.cardLastFour
          ? { brand: result.cardBrand, lastFour: result.cardLastFour }
          : null,
      );
      setTimeRemaining(TIMEOUT_SECONDS);
    } catch (error) {
      console.error('Failed to initiate EDC payment:', error);
      setStatus('failed');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Gagal memulai pembayaran kartu. Silakan coba lagi.',
      );
    }
  }, [outletId, totalAmount, initiateEDC]);

  // Initiate EDC payment once on mount. This is a one-time fetch triggered by
  // mounting the payment form, equivalent to loading state in other data-fetch effects.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    void startPayment();
  }, [startPayment]);

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

  // Handle payment status changes from polling. State updates mirror the external
  // gateway status, so they must be synchronized in an effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (status !== 'waiting' || !checkStatus.data) return;

    const gatewayStatus = checkStatus.data.status;

    if (gatewayStatus === 'PAID') {
      setStatus('success');
      const timer = setTimeout(() => {
        onSuccess(totalAmount, transactionId);
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (gatewayStatus === 'FAILED' || gatewayStatus === 'EXPIRED' || gatewayStatus === 'CANCELLED') {
      setStatus('failed');
      setErrorMessage(
        gatewayStatus === 'EXPIRED'
          ? 'Waktu pembayaran kartu habis. Silakan coba lagi.'
          : 'Pembayaran kartu gagal. Silakan coba lagi.',
      );
    }
  }, [checkStatus.data, status, totalAmount, onSuccess, transactionId]);

  const handleRetry = () => {
    setTransactionId('');
    void startPayment();
  };

  const handleCancel = () => {
    onBack();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Method Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="p-3 bg-indigo-50 rounded-lg">
          <CreditCard className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pembayaran Kartu</h3>
          <p className="text-sm text-gray-600">Ikuti instruksi di terminal EDC</p>
        </div>
      </div>

      {/* Terminal Display */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8">
        <div className="flex flex-col items-center">
          <div className="relative bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
            {status === 'waiting' && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-900">Menunggu transaksi EDC</p>
                <p className="text-sm text-gray-600 mt-2">
                  Silakan tap/insert kartu di terminal dan masukkan PIN
                </p>
                {transactionId && (
                  <p className="text-xs font-mono text-gray-500 mt-4">
                    TX: {transactionId}
                  </p>
                )}
              </div>
            )}

            {status === 'success' && (
              <div className="text-center py-12 animate-bounce-in">
                <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto mb-4" />
                <p className="text-xl font-bold text-green-600">Pembayaran Berhasil!</p>
                <p className="text-sm text-gray-600 mt-2">Transaksi kartu disetujui</p>
              </div>
            )}

            {(status === 'failed' || status === 'timeout') && (
              <div className="text-center py-12 animate-fade-in">
                <XCircle className="w-20 h-20 text-red-600 mx-auto mb-4" />
                <p className="text-xl font-bold text-red-600">
                  {status === 'timeout' ? 'Waktu Habis' : 'Pembayaran Gagal'}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {errorMessage || 'Silakan coba lagi'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 text-center space-y-2">
            {status === 'waiting' && (
              <>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                  <p className="text-sm font-medium text-gray-700">Menunggu approval terminal...</p>
                </div>
                <p className="text-xs text-gray-600">
                  Waktu tersisa:{' '}
                  <span className="font-mono font-bold text-indigo-600">{formatTime(timeRemaining)}</span>
                </p>
              </>
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
        {cardInfo && (cardInfo.brand || cardInfo.lastFour) && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Kartu</span>
            <span className="text-xs font-mono text-gray-700">
              {cardInfo.brand ?? 'CARD'} {cardInfo.lastFour ? `**** ${cardInfo.lastFour}` : ''}
            </span>
          </div>
        )}
        {referenceId && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Reference</span>
            <span className="text-xs font-mono text-gray-700">{referenceId}</span>
          </div>
        )}
      </div>

      {/* Instructions */}
      {status === 'waiting' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 animate-fade-in">
          <p className="text-sm font-medium text-indigo-900 mb-2">Cara Pembayaran:</p>
          <ol className="text-sm text-indigo-800 space-y-1 list-decimal list-inside">
            <li>Pastikan terminal EDC menyala dan terhubung</li>
            <li>Masukkan jumlah pembayaran di terminal</li>
            <li>Tap/insert kartu debit/kredit pelanggan</li>
            <li>Minta pelanggan memasukkan PIN dan konfirmasi</li>
          </ol>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {status === 'waiting' && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-gray-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali
          </button>
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
              className="flex-1 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
            >
              Coba Lagi
            </button>
          </>
        )}
      </div>
    </div>
  );
}
