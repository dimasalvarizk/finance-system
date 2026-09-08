import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  getBankingGateways,
  updateBankingGateway,
  testBankingGatewayPing,
  getBankingAuditHistory,
  type BankingGateway,
  type SystemAuditLog
} from '../../../services/settingService';

export const BankingApiIntegrationTab: React.FC = () => {
  const { t } = useTranslation();
  const [gateways, setGateways] = useState<BankingGateway[]>([]);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('gw_danamon');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testingPing, setTestingPing] = useState<boolean>(false);
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pingResult, setPingResult] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);

  // Current selected gateway form state
  const [formData, setFormData] = useState<Partial<BankingGateway>>({
    bankName: '',
    bankCode: '',
    country: 'Indonesia',
    currency: 'IDR',
    environment: 'sandbox',
    clientId: '',
    clientSecret: '',
    merchantId: '',
    channelId: '',
    baseUrl: '',
    webhookUrl: '',
    webhookSecret: '',
    certificateData: '',
    ipWhitelist: '',
    isActive: true
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [gws, logs] = await Promise.all([
        getBankingGateways().catch(() => []),
        getBankingAuditHistory().catch(() => [])
      ]);
      setGateways(gws || []);
      setAuditLogs(logs || []);

      const current = (gws || []).find((g: BankingGateway) => g.id === selectedGatewayId) || gws?.[0];
      if (current) {
        setSelectedGatewayId(current.id);
        setFormData({
          ...current,
          isActive: Boolean(current.isActive)
        });
      }
    } catch (err: any) {
      console.error('Failed to load banking API config:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedGatewayId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectGateway = (gw: BankingGateway) => {
    setSelectedGatewayId(gw.id);
    setFormData({
      ...gw,
      isActive: Boolean(gw.isActive)
    });
    setPingResult(null);
    setFeedback(null);
  };

  const handleInputChange = (field: keyof BankingGateway, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGatewayId) return;

    setSaving(true);
    setFeedback(null);
    try {
      const payload: Partial<BankingGateway> = {
        bankName: formData.bankName,
        bankCode: formData.bankCode,
        country: formData.country,
        currency: formData.currency,
        environment: formData.environment,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
        merchantId: formData.merchantId,
        channelId: formData.channelId,
        baseUrl: formData.baseUrl,
        webhookUrl: formData.webhookUrl,
        webhookSecret: formData.webhookSecret,
        certificateData: formData.certificateData,
        ipWhitelist: formData.ipWhitelist,
        isActive: formData.isActive ? 1 : 0
      };

      const updated = await updateBankingGateway(selectedGatewayId, payload);

      setGateways((prev) =>
        prev.map((g) => (g.id === selectedGatewayId ? { ...g, ...updated, isActive: Boolean(updated.isActive) } : g))
      );

      setFeedback({
        type: 'success',
        message: t('superAdmin.bankingApi.feedback.saveSuccess', { name: formData.bankName || 'Gateway' })
      });

      const logs = await getBankingAuditHistory().catch(() => []);
      setAuditLogs(logs || []);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || t('superAdmin.bankingApi.feedback.saveError')
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestPing = async () => {
    if (!selectedGatewayId) return;
    setTestingPing(true);
    setFeedback(null);
    try {
      const res = await testBankingGatewayPing(selectedGatewayId);
      setPingResult(res.data);
      setFeedback({
        type: 'success',
        message: t('superAdmin.bankingApi.feedback.pingSuccess', { ms: res.data.latencyMs })
      });

      setGateways((prev) =>
        prev.map((g) =>
          g.id === selectedGatewayId
            ? {
                ...g,
                lastPingLatency: res.data.latencyMs,
                lastPingAt: res.data.timestamp,
                lastPingStatus: 'ONLINE'
              }
            : g
        )
      );

      const logs = await getBankingAuditHistory().catch(() => []);
      setAuditLogs(logs || []);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || t('superAdmin.bankingApi.feedback.pingError')
      });
    } finally {
      setTestingPing(false);
    }
  };

  const activeGateway = gateways.find((g) => g.id === selectedGatewayId) || gateways[0];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-[#1d2857] border-t-transparent rounded-full animate-spin" />
          <span>{t('superAdmin.bankingApi.feedback.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Simple Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xl font-bold text-slate-800">{t('superAdmin.bankingApi.metrics.snapBiTitle')}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">{t('superAdmin.bankingApi.metrics.snapBiDesc')}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xl font-bold text-emerald-600">{t('superAdmin.bankingApi.metrics.tlsTitle')}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">{t('superAdmin.bankingApi.metrics.tlsDesc')}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xl font-bold text-slate-800">
            {gateways.find((g) => g.id === 'gw_danamon')?.lastPingLatency || 42} ms
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">{t('superAdmin.bankingApi.metrics.latencyDesc')}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xl font-bold text-slate-800">{t('superAdmin.bankingApi.metrics.shaTitle')}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">{t('superAdmin.bankingApi.metrics.shaDesc')}</div>
        </div>
      </div>

      {/* Gateway Selector Tabs (Only if multiple gateways) */}
      {gateways.length > 1 && (
        <div className="flex items-center space-x-2 border-b border-slate-200">
          {gateways.map((gw) => {
            const isSelected = gw.id === selectedGatewayId;
            return (
              <button
                key={gw.id}
                onClick={() => handleSelectGateway(gw)}
                className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'border-[#1d2857] text-[#1d2857]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <span>{gw.bankName}</span>
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-normal uppercase ${
                  gw.environment === 'production' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {gw.environment}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Configuration Card */}
      {activeGateway && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {t('superAdmin.bankingApi.form.title', { name: formData.bankName || 'Gateway' })}
              </h3>
              <p className="text-[11px] text-slate-400 font-normal">
                {t('superAdmin.bankingApi.form.subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestPing}
                disabled={testingPing}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${testingPing ? 'animate-spin' : ''}`} />
                <span>{testingPing ? t('superAdmin.bankingApi.form.testing') : t('superAdmin.bankingApi.form.testPing')}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Bank Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.gatewayName')}</label>
                <input
                  type="text"
                  value={formData.bankName || ''}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d2857] focus:bg-white"
                  required
                />
              </div>

              {/* Bank Code */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.gatewayCode')}</label>
                <input
                  type="text"
                  value={formData.bankCode || ''}
                  onChange={(e) => handleInputChange('bankCode', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d2857] focus:bg-white"
                  required
                />
              </div>

              {/* Environment */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.environment')}</label>
                <select
                  value={formData.environment || 'sandbox'}
                  onChange={(e) => handleInputChange('environment', e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d2857] focus:bg-white cursor-pointer"
                >
                  <option value="sandbox">{t('superAdmin.bankingApi.form.envSandbox')}</option>
                  <option value="production">{t('superAdmin.bankingApi.form.envProduction')}</option>
                </select>
              </div>

              {/* Operational Status Toggle */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.operationalStatus')}</label>
                <div className="flex items-center space-x-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleInputChange('isActive', !formData.isActive)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      formData.isActive ? 'bg-[#15803d]' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        formData.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-semibold text-slate-700">
                    {formData.isActive ? t('superAdmin.bankingApi.form.active') : t('superAdmin.bankingApi.form.inactive')}
                  </span>
                </div>
              </div>

              {/* Client ID */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.clientId')}</label>
                <input
                  type="text"
                  value={formData.clientId || ''}
                  onChange={(e) => handleInputChange('clientId', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d2857] focus:bg-white"
                  required
                />
              </div>

              {/* Client Secret */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.clientSecret')}</label>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSecret ? t('superAdmin.bankingApi.form.hide') : t('superAdmin.bankingApi.form.show')}</span>
                  </button>
                </div>
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={formData.clientSecret || ''}
                  onChange={(e) => handleInputChange('clientSecret', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d2857] focus:bg-white"
                  required
                />
              </div>

              {/* Merchant ID */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.merchantCode')}</label>
                <input
                  type="text"
                  value={formData.merchantId || ''}
                  onChange={(e) => handleInputChange('merchantId', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d2857] focus:bg-white"
                />
              </div>

              {/* Channel ID */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.channelId')}</label>
                <input
                  type="text"
                  value={formData.channelId || ''}
                  onChange={(e) => handleInputChange('channelId', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d2857] focus:bg-white"
                />
              </div>

              {/* Base URL */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.endpointUrl')}</label>
                <input
                  type="url"
                  value={formData.baseUrl || ''}
                  onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d2857] focus:bg-white"
                  required
                />
              </div>

              {/* Webhook URL */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.webhookUrl')}</label>
                <input
                  type="url"
                  value={formData.webhookUrl || ''}
                  onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d2857] focus:bg-white"
                />
              </div>

              {/* Webhook Secret */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.webhookSecret')}</label>
                <input
                  type="password"
                  value={formData.webhookSecret || ''}
                  onChange={(e) => handleInputChange('webhookSecret', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d2857] focus:bg-white"
                />
              </div>

              {/* IP Whitelist */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.ipWhitelist')}</label>
                <input
                  type="text"
                  value={formData.ipWhitelist || ''}
                  onChange={(e) => handleInputChange('ipWhitelist', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d2857] focus:bg-white"
                  placeholder="172.16.5.10, 10.200.4.88, 127.0.0.1"
                />
              </div>

              {/* Certificate Data */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">{t('superAdmin.bankingApi.form.certificateData')}</label>
                <textarea
                  rows={2}
                  value={formData.certificateData || ''}
                  onChange={(e) => handleInputChange('certificateData', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d2857] focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-[#1d2857] hover:bg-[#2b3a7a] text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? t('superAdmin.bankingApi.form.saving') : t('superAdmin.bankingApi.form.saveConfig')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Live Ping Diagnostic Summary */}
      {pingResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
            <div>
              <span className="font-bold text-slate-800">{t('superAdmin.bankingApi.diagnostics.title')}</span>
              <span className="ml-2 text-[10px] text-slate-500 font-normal">{t('superAdmin.bankingApi.diagnostics.standardNote')}</span>
            </div>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
              {pingResult.responseMessage}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
            <div>
              <span className="text-slate-400 block text-[10px]">{t('superAdmin.bankingApi.diagnostics.handshakeLatency')}</span>
              <span className="text-slate-800 font-bold font-mono">{pingResult.latencyMs} ms</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">{t('superAdmin.bankingApi.diagnostics.encryptionProtocol')}</span>
              <span className="text-emerald-700 font-bold font-mono">{pingResult.tls?.version || 'TLSv1.3'} ({t('superAdmin.bankingApi.diagnostics.mandatory')})</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">{t('superAdmin.bankingApi.diagnostics.cipherSuite')}</span>
              <span className="text-slate-800 font-mono truncate block" title={pingResult.tls?.cipher}>
                {pingResult.tls?.cipher || 'TLS_AES_256_GCM_SHA384'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">{t('superAdmin.bankingApi.diagnostics.testTimestamp')}</span>
              <span className="text-slate-600 font-mono">
                {new Date(pingResult.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Traffic & Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-800">
            {t('superAdmin.bankingApi.table.title')}
          </h3>
          <p className="text-[11px] text-slate-400 font-normal">
            {t('superAdmin.bankingApi.table.subtitle')}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold text-[11px]">
                <th className="py-2.5 px-4">{t('superAdmin.bankingApi.table.colTimestamp')}</th>
                <th className="py-2.5 px-4">{t('superAdmin.bankingApi.table.colExecutor')}</th>
                <th className="py-2.5 px-4">{t('superAdmin.bankingApi.table.colAction')}</th>
                <th className="py-2.5 px-4">{t('superAdmin.bankingApi.table.colTarget')}</th>
                <th className="py-2.5 px-4">{t('superAdmin.bankingApi.table.colTraceId')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    {t('superAdmin.bankingApi.table.noAuditLogs')}
                  </td>
                </tr>
              ) : (
                auditLogs.slice(0, 10).map((log) => {
                  let parsedDetails: any = null;
                  try {
                    parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                  } catch {
                    parsedDetails = { message: log.details };
                  }

                  const isSettlement = log.action === 'BANK_SETTLEMENT_EXECUTED';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {log.performed_by_name || 'Super Admin'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isSettlement ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isSettlement ? t('superAdmin.bankingApi.table.settlementBadge') : log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {log.target_user || 'System'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                        {parsedDetails?.traceId ? (
                          <span className="text-blue-700 font-semibold">{parsedDetails.traceId}</span>
                        ) : (
                          <span className="text-slate-400 truncate block max-w-xs">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
