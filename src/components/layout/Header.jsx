import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sun,
  Moon,
  LogOut,
  Menu,
  AlertCircle,
  Bell
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function Header({
  activeTab,
  searchTerm,
  onSearchChange,
  onToggleMobileMenu,
  unreadNotificationsCount = 0,
  onToggleNotifications
}) {
  const { darkMode, toggleDarkMode, theme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        gap: '16px',
        flexWrap: 'wrap'
      }}
    >
      {/* Left: Mobile Menu Trigger & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            aria-label="Open navigation menu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.surface,
              color: theme.textPrimary,
              cursor: 'pointer'
            }}
            className="show-on-mobile"
          >
            <Menu size={18} />
          </button>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '800',
                margin: 0,
                color: theme.textPrimary,
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}
            >
              {activeTab === 'Overview' || activeTab === 'Dashboard' ? 'Security Overview' : activeTab}
            </h1>

            {/* Posture Pill */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)'
              }}
            >
              <AlertCircle size={12} />
              ELEVATED
            </span>
          </div>

          <p
            style={{
              fontSize: '12.5px',
              color: theme.textSecondary,
              marginTop: '4px',
              marginBottom: 0
            }}
          >
            Insider Threat Behavioral Intelligence & Anomaly Telemetry
          </p>
        </div>
      </div>

      {/* Right Controls: Search, Theme, User Profile */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        {/* Search Input */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              color: theme.textSecondary,
              pointerEvents: 'none'
            }}
          />

          <input
            id="global-search-input"
            type="text"
            placeholder="Search employee or ID..."
            aria-label="Search employees and threat identifiers"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              padding: '9px 40px 9px 36px',
              backgroundColor: theme.surfaceVariant,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              width: '240px',
              color: theme.textPrimary,
              outline: 'none',
              fontSize: '13px',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => (e.target.style.borderColor = theme.primary)}
            onBlur={(e) => (e.target.style.borderColor = theme.border)}
          />

          <span
            style={{
              position: 'absolute',
              right: '8px',
              fontSize: '10.5px',
              fontWeight: '600',
              padding: '2px 5px',
              borderRadius: '4px',
              backgroundColor: theme.surface,
              color: theme.textSecondary,
              border: `1px solid ${theme.borderSubtle}`,
              pointerEvents: 'none'
            }}
          >
            ⌘K
          </span>
        </div>

        {/* Notification Bell Trigger */}
        <button
          onClick={onToggleNotifications}
          title="Open Notification Center"
          aria-label="View notifications"
          style={{
            position: 'relative',
            padding: '8px 10px',
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.surface,
            color: theme.textPrimary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.surfaceHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.surface)}
        >
          <Bell size={16} />
          {unreadNotificationsCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${theme.surface}`
              }}
            >
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Theme Mode Toggle Button */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.surface,
            color: theme.textPrimary,
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.surfaceHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.surface)}
        >
          {darkMode ? (
            <>
              <Sun size={15} color="#f59e0b" />
              <span style={{ fontSize: '12px' }}>Light</span>
            </>
          ) : (
            <>
              <Moon size={15} color="#6366f1" />
              <span style={{ fontSize: '12px' }}>Dark</span>
            </>
          )}
        </button>

        {/* Analyst Profile Pill & Logout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingLeft: '10px',
            borderLeft: `1px solid ${theme.border}`
          }}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/profile')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/profile');
              }
            }}
            title="Inspect Analyst Profile"
            aria-label="View analyst profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '3px 6px',
              borderRadius: '8px',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.surfaceHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: theme.primaryContainer,
                color: theme.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '12px',
                flexShrink: 0
              }}
            >
              {user?.initials || 'SO'}
            </div>

            <div style={{ lineHeight: 1.2 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: theme.textPrimary
                }}
              >
                {user?.name || 'Security Ops'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: theme.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    display: 'inline-block'
                  }}
                />
                {user?.role || 'Analyst'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log out of Threat AI"
            aria-label="Sign out of Threat AI"
            style={{
              marginLeft: '4px',
              padding: '7px 10px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.surface,
              borderRadius: '7px',
              cursor: 'pointer',
              color: theme.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.textSecondary;
              e.currentTarget.style.borderColor = theme.border;
            }}
          >
            <LogOut size={13} />
            <span className="hide-on-mobile">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
