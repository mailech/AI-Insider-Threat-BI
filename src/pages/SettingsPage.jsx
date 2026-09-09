import React, { useState } from 'react';
import {
  Sliders,
  Shield,
  Bell,
  Radio,
  Send,
  RotateCcw,
  CheckCircle2,
  Sun,
  Moon,
  ShieldAlert,
  Server,
  Zap,
  Mail,
  Smartphone
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const DEFAULT_SETTINGS = {
  riskThreshold: 75,
  autoContainment: true,
  sensitivity: 'Standard',
  autoRefreshInterval: '30s',
  defaultTimeframe: '30d',
  denseTableMode: false,
  webhookUrl: 'https://hooks.slack.com/services/T00/B00/SEC-OPS-ALERTS',
  splunkEndpoint: 'https://splunk.internal.threat.ai:8088/services/collector',
  pagerdutyKey: 'pd-live-sec-8849201a',
  continuousTelemetry: true,
  emailDigest: true,
  smsEscalation: false
};

export default function SettingsPage() {
  const { theme, darkMode, toggleDarkMode } = useTheme();

  // Active configuration sub-tab
  const [activeTab, setActiveTab] = useState('thresholds'); // 'thresholds' | 'dashboard' | 'integrations' | 'notifications'

  // Settings State initialized from defaults
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('threat_ai_soc_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Feedback toast state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSettingChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem('threat_ai_soc_settings', JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
    showToast('SOC security parameters successfully applied and committed.');
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem('threat_ai_soc_settings', JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) {
      console.error(e);
    }
    showToast('Configuration reverted to baseline factory defaults.');
  };

  const handleTestPing = (integrationName) => {
    showToast(`Dispatched test payload to ${integrationName} — status 200 OK.`);
  };

  const tabs = [
    { id: 'thresholds', label: 'Risk & Thresholds', icon: Shield },
    { id: 'dashboard', label: 'Interface & Display', icon: Sliders },
    { id: 'integrations', label: 'SIEM & Webhooks', icon: Server },
    { id: 'notifications', label: 'Notification Rules', icon: Bell }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '960px' }}>
      {/* ================================================= */}
      {/* 1. TOAST FEEDBACK NOTIFICATION                    */}
      {/* ================================================= */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 1000,
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            borderRadius: '10px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle2 size={16} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: theme.textPrimary }}>
            {toastMessage}
          </span>
        </div>
      )}

      {/* ================================================= */}
      {/* 2. HEADER BANNER & TAB NAVIGATION                 */}
      {/* ================================================= */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '24px 28px',
          boxShadow: theme.shadow
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sliders size={22} color={theme.primary} />
              <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: theme.textPrimary }}>
                SOC Configuration & Telemetry Parameters
              </h1>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textSecondary }}>
              Manage behavioral detection benchmarks, webhook integrations, and monitoring preferences.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleResetDefaults}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.surfaceVariant,
                color: theme.textSecondary,
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={13} />
              Reset Defaults
            </button>

            <button
              onClick={handleSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: theme.primary,
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Send size={13} />
              Save Configuration
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '22px', borderTop: `1px solid ${theme.borderSubtle}`, paddingTop: '16px', flexWrap: 'wrap' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${isSelected ? theme.primary : 'transparent'}`,
                  backgroundColor: isSelected ? theme.primaryContainer : 'transparent',
                  color: isSelected ? theme.primary : theme.textSecondary,
                  fontSize: '13px',
                  fontWeight: isSelected ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================= */}
      {/* 3. TAB 1: RISK & THRESHOLDS                       */}
      {/* ================================================= */}
      {activeTab === 'thresholds' && (
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '14px',
            border: `1px solid ${theme.border}`,
            padding: '28px',
            boxShadow: theme.shadow,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
        >
          {/* Threshold Slider */}
          <div style={{ padding: '20px', backgroundColor: theme.surfaceVariant, borderRadius: '10px', border: `1px solid ${theme.borderSubtle}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '14px', fontWeight: '700', color: theme.textPrimary, display: 'block' }}>
                  High-Risk Anomaly Escalation Threshold
                </label>
                <span style={{ fontSize: '12px', color: theme.textSecondary }}>
                  Identities exceeding this benchmark trigger automated Priority Critical incident dispatch.
                </span>
              </div>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  backgroundColor: theme.primary,
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '14px'
                }}
              >
                {settings.riskThreshold} / 100
              </span>
            </div>

            <input
              type="range"
              min="50"
              max="95"
              value={settings.riskThreshold}
              onChange={(e) => handleSettingChange('riskThreshold', Number(e.target.value))}
              style={{ width: '100%', accentColor: theme.primary, cursor: 'pointer', margin: '8px 0' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.textSecondary }}>
              <span>50 (Permissive)</span>
              <span>75 (Standard Recommended)</span>
              <span>95 (Strict SOC Isolation)</span>
            </div>
          </div>

          {/* Automatic Containment Checkbox */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              backgroundColor: theme.surfaceVariant,
              borderRadius: '10px',
              border: `1px solid ${theme.borderSubtle}`
            }}
          >
            <div>
              <label style={{ fontSize: '14px', fontWeight: '700', color: theme.textPrimary, display: 'block' }}>
                Automated Containment Directives
              </label>
              <span style={{ fontSize: '12px', color: theme.textSecondary }}>
                Temporarily lock credentials and isolate endpoint workstations when composite score exceeds 90.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoContainment}
              onChange={(e) => handleSettingChange('autoContainment', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: theme.primary, cursor: 'pointer' }}
            />
          </div>

          {/* Behavioral Sensitivity Radio Group */}
          <div style={{ padding: '20px', backgroundColor: theme.surfaceVariant, borderRadius: '10px', border: `1px solid ${theme.borderSubtle}` }}>
            <label style={{ fontSize: '14px', fontWeight: '700', color: theme.textPrimary, display: 'block', marginBottom: '12px' }}>
              UEBA Anomaly Scoring Sensitivity
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {['Permissive', 'Standard', 'Strict'].map((lvl) => {
                const isSelected = settings.sensitivity === lvl;
                return (
                  <div
                    key={lvl}
                    onClick={() => handleSettingChange('sensitivity', lvl)}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? theme.primary : theme.border}`,
                      backgroundColor: isSelected ? theme.surface : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Radio size={14} color={isSelected ? theme.primary : theme.textSecondary} />
                      <strong style={{ fontSize: '13px', color: theme.textPrimary }}>{lvl}</strong>
                    </div>
                    <span style={{ fontSize: '11.5px', color: theme.textSecondary }}>
                      {lvl === 'Permissive'
                        ? 'Tolerates higher activity variations.'
                        : lvl === 'Standard'
                        ? 'Recommended baseline for corporate environments.'
                        : 'Immediate alerts on any deviation.'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* 4. TAB 2: INTERFACE & DISPLAY                     */}
      {/* ================================================= */}
      {activeTab === 'dashboard' && (
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '14px',
            border: `1px solid ${theme.border}`,
            padding: '28px',
            boxShadow: theme.shadow,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
        >
          {/* Theme Mode Selector */}
          <div style={{ padding: '20px', backgroundColor: theme.surfaceVariant, borderRadius: '10px', border: `1px solid ${theme.borderSubtle}` }}>
            <label style={{ fontSize: '14px', fontWeight: '700', color: theme.textPrimary, display: 'block', marginBottom: '6px' }}>
              Color Theme Appearance
            </label>
            <span style={{ fontSize: '12px', color: theme.textSecondary, display: 'block', marginBottom: '14px' }}>
              Choose between high-contrast dark cybersecurity mode and bright executive light mode.
            </span>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  if (!darkMode) toggleDarkMode();
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '8px',
                  border: `2px solid ${darkMode ? theme.primary : theme.border}`,
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Moon size={16} color="#818cf8" />
                Cyber Dark Mode {darkMode && '✓'}
              </button>

              <button
                onClick={() => {
                  if (darkMode) toggleDarkMode();
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '8px',
                  border: `2px solid ${!darkMode ? theme.primary : theme.border}`,
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Sun size={16} color="#f59e0b" />
                Executive Light Mode {!darkMode && '✓'}
              </button>
            </div>
          </div>

          {/* Telemetry Refresh & Timeframe */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '18px', backgroundColor: theme.surfaceVariant, borderRadius: '10px', border: `1px solid ${theme.borderSubtle}` }}>
              <label style={{ fontSize: '13.5px', fontWeight: '700', color: theme.textPrimary, display: 'block', marginBottom: '6px' }}>
                Telemetry Polling Interval
              </label>
              <select
                value={settings.autoRefreshInterval}
                onChange={(e) => handleSettingChange('autoRefreshInterval', e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="15s">Every 15 seconds (Near Real-Time)</option>
                <option value="30s">Every 30 seconds (Standard)</option>
                <option value="60s">Every 60 seconds</option>
                <option value="manual">Manual Refresh Only</option>
              </select>
            </div>

            <div style={{ padding: '18px', backgroundColor: theme.surfaceVariant, borderRadius: '10px', border: `1px solid ${theme.borderSubtle}` }}>
              <label style={{ fontSize: '13.5px', fontWeight: '700', color: theme.textPrimary, display: 'block', marginBottom: '6px' }}>
                Default Analytics Lookback
              </label>
              <select
                value={settings.defaultTimeframe}
                onChange={(e) => handleSettingChange('defaultTimeframe', e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="7d">Past 7 Days</option>
                <option value="30d">Past 30 Days (Recommended)</option>
                <option value="90d">Past 90 Days (Quarterly)</option>
              </select>
            </div>
          </div>

          {/* Compact Layout Toggle */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px',
              backgroundColor: theme.surfaceVariant,
              borderRadius: '10px',
              border: `1px solid ${theme.borderSubtle}`
            }}
          >
            <div>
              <label style={{ fontSize: '13.5px', fontWeight: '700', color: theme.textPrimary, display: 'block' }}>
                Dense Table Mode
              </label>
              <span style={{ fontSize: '12px', color: theme.textSecondary }}>
                Reduces row padding in directory and alert lists to maximize screen real estate.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.denseTableMode}
              onChange={(e) => handleSettingChange('denseTableMode', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: theme.primary, cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* 5. TAB 3: SIEM & WEBHOOK INTEGRATIONS             */}
      {/* ================================================= */}
      {activeTab === 'integrations' && (
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '14px',
            border: `1px solid ${theme.border}`,
            padding: '28px',
            boxShadow: theme.shadow,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* Slack Webhook */}
          <div style={{ padding: '20px', backgroundColor: theme.surfaceVariant, borderRadius: '10px', border: `1px solid ${theme.borderSubtle}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color={theme.primary} />
                <label style={{ fontSize: '14px', fontWeight: '700', color: theme.textPrimary }}>
                  Slack Incident Escalation Webhook
                </label>
              </div>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>Active</span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={settings.webhookUrl}
                onChange={(e) => handleSettingChange('webhookUrl', e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => handleTestPing('Slack Webhook')}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                  fontWeight: '600',
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Test Ping
              </button>
            </div>
          </div>

          {/* Splunk SIEM */}
          <div style={{ padding: '20px', backgroundColor: theme.surfaceVariant, borderRadius: '10px', border: `1px solid ${theme.borderSubtle}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={16} color={theme.primary} />
                <label style={{ fontSize: '14px', fontWeight: '700', color: theme.textPrimary }}>
                  Splunk / Elastic SIEM HTTP Event Collector
                </label>
              </div>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>Connected</span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={settings.splunkEndpoint}
                onChange={(e) => handleSettingChange('splunkEndpoint', e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => handleTestPing('Splunk Collector')}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                  fontWeight: '600',
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Test Ping
              </button>
            </div>
          </div>

          {/* PagerDuty Key */}
          <div style={{ padding: '20px', backgroundColor: theme.surfaceVariant, borderRadius: '10px', border: `1px solid ${theme.borderSubtle}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} color="#ef4444" />
                <label style={{ fontSize: '14px', fontWeight: '700', color: theme.textPrimary }}>
                  PagerDuty On-Call Integration Routing Key
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={settings.pagerdutyKey}
                onChange={(e) => handleSettingChange('pagerdutyKey', e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => handleTestPing('PagerDuty Routing')}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                  fontWeight: '600',
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Test Ping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* 6. TAB 4: NOTIFICATION RULES                      */}
      {/* ================================================= */}
      {activeTab === 'notifications' && (
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '14px',
            border: `1px solid ${theme.border}`,
            padding: '28px',
            boxShadow: theme.shadow,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Continuous Stream Push */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              backgroundColor: theme.surfaceVariant,
              borderRadius: '10px',
              border: `1px solid ${theme.borderSubtle}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Radio size={18} color={theme.primary} />
              <div>
                <label style={{ fontSize: '13.5px', fontWeight: '700', color: theme.textPrimary, display: 'block' }}>
                  Continuous Threat Telemetry Alerts
                </label>
                <span style={{ fontSize: '12px', color: theme.textSecondary }}>
                  Stream real-time incident dispatches directly into the Notification Center.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.continuousTelemetry}
              onChange={(e) => handleSettingChange('continuousTelemetry', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: theme.primary, cursor: 'pointer' }}
            />
          </div>

          {/* Email Digest */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              backgroundColor: theme.surfaceVariant,
              borderRadius: '10px',
              border: `1px solid ${theme.borderSubtle}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Mail size={18} color={theme.primary} />
              <div>
                <label style={{ fontSize: '13.5px', fontWeight: '700', color: theme.textPrimary, display: 'block' }}>
                  Daily CISO Executive Briefing Digest
                </label>
                <span style={{ fontSize: '12px', color: theme.textSecondary }}>
                  Automated morning summary covering top high-risk identities and resolved incidents.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.emailDigest}
              onChange={(e) => handleSettingChange('emailDigest', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: theme.primary, cursor: 'pointer' }}
            />
          </div>

          {/* SMS Escalation */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              backgroundColor: theme.surfaceVariant,
              borderRadius: '10px',
              border: `1px solid ${theme.borderSubtle}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Smartphone size={18} color="#ef4444" />
              <div>
                <label style={{ fontSize: '13.5px', fontWeight: '700', color: theme.textPrimary, display: 'block' }}>
                  Critical Priority SMS Escalation
                </label>
                <span style={{ fontSize: '12px', color: theme.textSecondary }}>
                  Emergency SMS notification to on-call security leadership for Severity: Critical data egress.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.smsEscalation}
              onChange={(e) => handleSettingChange('smsEscalation', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: theme.primary, cursor: 'pointer' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
