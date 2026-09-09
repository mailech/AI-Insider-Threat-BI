import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Flame,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import RiskBadge from '../common/RiskBadge';

export default function NotificationDrawer({
  isOpen,
  onClose,
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onClearAll
}) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const handleItemClick = (notif) => {
    if (!notif.read && onMarkRead) {
      onMarkRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
      onClose();
    }
  };

  const getSeverityIcon = (severity, type) => {
    if (severity === 'Critical') return <Flame size={16} color="#ef4444" />;
    if (severity === 'High') return <ShieldAlert size={16} color="#f97316" />;
    if (severity === 'Medium') return <AlertTriangle size={16} color="#f59e0b" />;
    return <CheckCircle2 size={16} color="#10b981" />;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 150,
        display: 'flex',
        justifyContent: 'flex-end',
        backdropFilter: 'blur(3px)'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100vh',
          backgroundColor: theme.surface,
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.22s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.surfaceVariant
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: theme.primaryContainer,
                color: theme.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Bell size={17} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: theme.textPrimary }}>
                  Notification Center
                </h2>
                {unreadCount > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      padding: '1px 6px',
                      borderRadius: '999px'
                    }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              <span style={{ fontSize: '11.5px', color: theme.textSecondary }}>
                Real-time incident & anomaly telemetry dispatches
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: theme.textSecondary,
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: `1px solid ${theme.borderSubtle}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.surface,
            fontSize: '12px'
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: filter === 'all' ? theme.surfaceVariant : 'transparent',
                color: filter === 'all' ? theme.textPrimary : theme.textSecondary,
                fontWeight: filter === 'all' ? '700' : '500',
                cursor: 'pointer'
              }}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: filter === 'unread' ? theme.surfaceVariant : 'transparent',
                color: filter === 'unread' ? theme.primary : theme.textSecondary,
                fontWeight: filter === 'unread' ? '700' : '500',
                cursor: 'pointer'
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                title="Mark all as read"
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.primary,
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px'
                }}
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                title="Clear notifications"
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.textSecondary,
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px'
                }}
              >
                <Trash2 size={13} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredNotifications.length === 0 ? (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}
            >
              <ShieldCheck size={42} color={theme.textSecondary} style={{ opacity: 0.4, marginBottom: '12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: theme.textPrimary, margin: '0 0 4px 0' }}>
                All Caught Up
              </h3>
              <p style={{ fontSize: '12.5px', color: theme.textSecondary, margin: 0, maxWidth: '240px' }}>
                {filter === 'unread'
                  ? 'No unread security dispatches at this moment.'
                  : 'No notification telemetry recorded in the SOC queue.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: notif.read ? theme.surface : theme.surfaceVariant,
                  border: `1px solid ${notif.read ? theme.borderSubtle : theme.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = notif.read ? theme.surface : theme.surfaceVariant;
                }}
              >
                {/* Unread indicator dot */}
                {!notif.read && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: theme.primary
                    }}
                  />
                )}

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '7px',
                      backgroundColor:
                        notif.severity === 'Critical'
                          ? 'rgba(239, 68, 68, 0.12)'
                          : notif.severity === 'High'
                          ? 'rgba(249, 115, 22, 0.12)'
                          : notif.severity === 'Medium'
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'rgba(16, 185, 129, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    {getSeverityIcon(notif.severity, notif.type)}
                  </div>

                  <div style={{ flex: 1, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: notif.read ? '600' : '700',
                          color: theme.textPrimary
                        }}
                      >
                        {notif.title}
                      </span>
                      <RiskBadge riskLevel={notif.severity} size="small" />
                    </div>

                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: theme.textSecondary, lineHeight: 1.45 }}>
                      {notif.message}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: theme.textSecondary }}>
                      <span>{notif.time}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: theme.primary, fontWeight: '600' }}>
                        View Details <ExternalLink size={10} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
