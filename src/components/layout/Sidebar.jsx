import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  Activity,
  Bell,
  Settings,
  X
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ICON_MAP = {
  Dashboard: LayoutDashboard,
  Employees: Users,
  'Risk Analysis': Activity,
  Alerts: Bell,
  Settings: Settings
};

export default function Sidebar({
  activeTab,
  navItems,
  isMobileOpen = false,
  onCloseMobile
}) {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleNavClick = (path) => {
    navigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 95,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={isMobileOpen ? '' : 'sidebar-mobile-hidden'}
        style={{
          width: '260px',
          minHeight: '100vh',
          backgroundColor: theme.surface,
          borderRight: `1px solid ${theme.border}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 16px',
          boxSizing: 'border-box',
          flexShrink: 0,
          position: isMobileOpen ? 'fixed' : 'relative',
          top: 0,
          left: 0,
          zIndex: isMobileOpen ? 100 : 'auto',
          transition: 'all 0.2s ease'
        }}
      >
        <div>
          {/* Brand Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
              paddingLeft: '8px'
            }}
          >
            <div
              onClick={() => handleNavClick('/dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  backgroundColor: theme.primary,
                  color: '#ffffff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 16px ${theme.primary}55`
                }}
              >
                <ShieldAlert size={20} strokeWidth={2.2} />
              </div>

              <div>
                <span
                  style={{
                    fontWeight: '800',
                    fontSize: '18px',
                    letterSpacing: '-0.02em',
                    color: theme.textPrimary,
                    display: 'block',
                    lineHeight: 1.1
                  }}
                >
                  Threat AI
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: theme.textSecondary,
                    fontWeight: '600',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase'
                  }}
                >
                  Behavioral Intel
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            {isMobileOpen && (
              <button
                onClick={onCloseMobile}
                style={{
                  border: 'none',
                  background: 'none',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Section Category */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: '700',
              color: theme.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              marginBottom: '10px',
              paddingLeft: '10px'
            }}
          >
            SOC Command Center
          </div>

          {/* Navigation Links */}
          <nav
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.label;
              const Icon = ICON_MAP[item.label] || LayoutDashboard;

              return (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.path)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    fontSize: '13.5px',
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? theme.primary : theme.textSecondary,
                    backgroundColor: isActive
                      ? theme.primaryContainer
                      : 'transparent',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = theme.surfaceHover;
                      e.currentTarget.style.color = theme.textPrimary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = theme.textSecondary;
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      color={isActive ? theme.primary : 'currentColor'}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      style={{
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        borderRadius: '999px',
                        padding: '2px 7px',
                        lineHeight: 1.2
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer: Live Engine Status */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: theme.surfaceVariant,
            border: `1px solid ${theme.borderSubtle}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '11.5px',
            color: theme.textSecondary
          }}
        >
          <span
            className="pulse-dot"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              flexShrink: 0
            }}
          />
          <div>
            <div style={{ fontWeight: '700', color: theme.textPrimary }}>
              SOC ENGINE ACTIVE
            </div>
            <div style={{ fontSize: '10.5px', opacity: 0.8 }}>
              Real-time anomaly stream
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
