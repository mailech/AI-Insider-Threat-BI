
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "../styles/Settings.css";

function Settings() {
  const [settings, setSettings] = useState({
    insiderMonitoring: true,
    alertNotifications: true,
    emailNotifications: false,
    poisoningMonitoring: true,
    backdoorDetection: true,
    automaticInvestigation: false,
    riskThreshold: 70,
    highRiskThreshold: 85,
  });

  const handleToggle = (setting) => {
    setSettings((current) => ({
      ...current,
      [setting]: !current[setting],
    }));
  };

  const handleSave = () => {
    alert("Security settings saved successfully.");
  };

  const handleReset = () => {
    setSettings({
      insiderMonitoring: true,
      alertNotifications: true,
      emailNotifications: false,
      poisoningMonitoring: true,
      backdoorDetection: true,
      automaticInvestigation: false,
      riskThreshold: 70,
      highRiskThreshold: 85,
    });
  };

  return (
    <>
      <Sidebar />
      <Navbar />

      <main className="settings-page">

        {/* Header */}
        <div className="settings-header">
          <div>
            <h1>Security Settings</h1>
            <p>
              Configure insider-threat detection and AI security monitoring.
            </p>
          </div>

          <span className="settings-status">
            ● Configuration Active
          </span>
        </div>

        {/* Monitoring Settings */}
        <section className="settings-panel">

          <div className="settings-panel-header">
            <div>
              <h2>Security Monitoring</h2>
              <p>
                Control the security monitoring modules used by the platform.
              </p>
            </div>
          </div>

          <div className="settings-list">

            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-icon">👤</div>
                <div>
                  <strong>Insider Risk Monitoring</strong>
                  <p>
                    Monitor employee activities for suspicious behaviour.
                  </p>
                </div>
              </div>

              <button
                className={`toggle ${
                  settings.insiderMonitoring ? "active" : ""
                }`}
                onClick={() => handleToggle("insiderMonitoring")}
              >
                <span></span>
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-icon">🚨</div>
                <div>
                  <strong>Security Alert Notifications</strong>
                  <p>
                    Generate notifications when suspicious activity is
                    detected.
                  </p>
                </div>
              </div>

              <button
                className={`toggle ${
                  settings.alertNotifications ? "active" : ""
                }`}
                onClick={() => handleToggle("alertNotifications")}
              >
                <span></span>
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-icon">📧</div>
                <div>
                  <strong>Email Notifications</strong>
                  <p>
                    Send security notifications through email.
                  </p>
                </div>
              </div>

              <button
                className={`toggle ${
                  settings.emailNotifications ? "active" : ""
                }`}
                onClick={() => handleToggle("emailNotifications")}
              >
                <span></span>
              </button>
            </div>

          </div>
        </section>

        {/* AI Security Settings */}
        <section className="settings-panel">

          <div className="settings-panel-header">
            <div>
              <h2>AI Security Monitoring</h2>
              <p>
                Configure monitoring for poisoned data and suspicious model
                behaviour.
              </p>
            </div>
          </div>

          <div className="settings-list">

            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-icon">🧪</div>
                <div>
                  <strong>Poisoning Analysis</strong>
                  <p>
                    Analyze training data for suspected poisoning indicators.
                  </p>
                </div>
              </div>

              <button
                className={`toggle ${
                  settings.poisoningMonitoring ? "active" : ""
                }`}
                onClick={() => handleToggle("poisoningMonitoring")}
              >
                <span></span>
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-icon">🛡️</div>
                <div>
                  <strong>Backdoor Detection</strong>
                  <p>
                    Evaluate models for unexpected trigger-based behaviour.
                  </p>
                </div>
              </div>

              <button
                className={`toggle ${
                  settings.backdoorDetection ? "active" : ""
                }`}
                onClick={() => handleToggle("backdoorDetection")}
              >
                <span></span>
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-icon">🤖</div>
                <div>
                  <strong>Automatic Investigation</strong>
                  <p>
                    Automatically flag suspicious activity for investigation.
                  </p>
                </div>
              </div>

              <button
                className={`toggle ${
                  settings.automaticInvestigation ? "active" : ""
                }`}
                onClick={() => handleToggle("automaticInvestigation")}
              >
                <span></span>
              </button>
            </div>

          </div>
        </section>

        {/* Risk Thresholds */}
        <section className="settings-panel">

          <div className="settings-panel-header">
            <div>
              <h2>Risk Detection Thresholds</h2>
              <p>
                Configure the score levels used for insider-risk assessment.
              </p>
            </div>
          </div>

          <div className="threshold-settings">

            <div className="threshold-item">
              <div className="threshold-heading">
                <label>Risk Detection Threshold</label>
                <strong>{settings.riskThreshold}</strong>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={settings.riskThreshold}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    riskThreshold: Number(e.target.value),
                  }))
                }
              />

              <div className="range-labels">
                <span>0</span>
                <span>100</span>
              </div>

              <p>
                Activities above this score are considered suspicious.
              </p>
            </div>

            <div className="threshold-item">
              <div className="threshold-heading">
                <label>High Risk Threshold</label>
                <strong>{settings.highRiskThreshold}</strong>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={settings.highRiskThreshold}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    highRiskThreshold: Number(e.target.value),
                  }))
                }
              />

              <div className="range-labels">
                <span>0</span>
                <span>100</span>
              </div>

              <p>
                Scores above this level are classified as high risk.
              </p>
            </div>

          </div>
        </section>

        {/* System Information */}
        <section className="settings-panel">

          <div className="settings-panel-header">
            <div>
              <h2>System Information</h2>
              <p>Current platform configuration</p>
            </div>
          </div>

          <div className="system-info-grid">

            <div>
              <span>Platform</span>
              <strong>AI Insider Threat & Security Intelligence</strong>
            </div>

            <div>
              <span>Monitoring Mode</span>
              <strong>Security Analysis</strong>
            </div>

            <div>
              <span>AI Analysis</span>
              <strong>Enabled</strong>
            </div>

            <div>
              <span>Environment</span>
              <strong>Prototype</strong>
            </div>

          </div>
        </section>

        {/* Actions */}
        <div className="settings-actions">
          <button
            className="reset-settings"
            onClick={handleReset}
          >
            Reset
          </button>

          <button
            className="save-settings"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>

      </main>
    </>
  );
}

export default Settings;