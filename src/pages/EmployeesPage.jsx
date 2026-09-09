import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Lock,
  Clock
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import RiskBadge from '../components/common/RiskBadge';
import EmptyState from '../components/common/EmptyState';

const ITEMS_PER_PAGE = 5;

export default function EmployeesPage({ employees = [] }) {
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('All');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Sorting State
  const [sortField, setSortField] = useState('score');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Hover state
  const [hoveredRow, setHoveredRow] = useState(null);

  // Departments for dropdown
  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department));
    return ['All', ...Array.from(set)];
  }, [employees]);

  // Statuses for dropdown
  const statuses = ['All', 'Active', 'Under Review', 'Locked'];

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Filter & Sort Logic
  const filteredAndSortedEmployees = useMemo(() => {
    let result = employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.role && emp.role.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRisk =
        selectedRiskFilter === 'All' || emp.riskLevel === selectedRiskFilter;

      const matchesDept =
        selectedDeptFilter === 'All' || emp.department === selectedDeptFilter;

      const matchesStatus =
        selectedStatusFilter === 'All' || emp.status === selectedStatusFilter;

      return matchesSearch && matchesRisk && matchesDept && matchesStatus;
    });

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      } else {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return result;
  }, [
    employees,
    searchTerm,
    selectedRiskFilter,
    selectedDeptFilter,
    selectedStatusFilter,
    sortField,
    sortDirection
  ]);

  // Pagination Calculations
  const totalItems = filteredAndSortedEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEmployees = filteredAndSortedEmployees.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedRiskFilter('All');
    setSelectedDeptFilter('All');
    setSelectedStatusFilter('All');
    setCurrentPage(1);
  };

  // Helper: Status Badge
  const renderStatusBadge = (status) => {
    let color = '#10b981';
    let bg = 'rgba(16, 185, 129, 0.12)';
    let Icon = ShieldCheck;

    if (status === 'Locked') {
      color = '#ef4444';
      bg = 'rgba(239, 68, 68, 0.12)';
      Icon = Lock;
    } else if (status === 'Under Review') {
      color = '#f97316';
      bg = 'rgba(249, 115, 22, 0.12)';
      Icon = Clock;
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '600',
          color: color,
          backgroundColor: bg,
          border: `1px solid ${color}33`,
          whiteSpace: 'nowrap'
        }}
      >
        <Icon size={12} />
        {status || 'Active'}
      </span>
    );
  };

  // Helper: Sort Icon
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ opacity: 0.4 }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} color={theme.primary} />
    ) : (
      <ArrowDown size={12} color={theme.primary} />
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '22px 28px',
          boxShadow: theme.shadow,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} color={theme.primary} />
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: theme.textPrimary }}>
              Monitored Personnel Directory
            </h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textSecondary }}>
            Continuous behavioral risk scoring, insider threat telemetry, and identity profiling.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: theme.surfaceVariant,
              border: `1px solid ${theme.borderSubtle}`,
              fontSize: '12.5px',
              fontWeight: '600',
              color: theme.textSecondary
            }}
          >
            Total Monitored: <strong style={{ color: theme.textPrimary }}>{employees.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '18px 24px',
          boxShadow: theme.shadow,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: theme.textSecondary,
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              placeholder="Search by name, ID, role, or department..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 14px 9px 36px',
                backgroundColor: theme.surfaceVariant,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                color: theme.textPrimary,
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => (e.target.style.borderColor = theme.primary)}
              onBlur={(e) => (e.target.style.borderColor = theme.border)}
            />
          </div>

          {/* Department Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color={theme.textSecondary} />
            <select
              value={selectedDeptFilter}
              onChange={(e) => {
                setSelectedDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.surfaceVariant,
                color: theme.textPrimary,
                fontSize: '12.5px',
                fontWeight: '500',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'All Departments' : dept}
                </option>
              ))}
            </select>

            {/* Status Filter Dropdown */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.surfaceVariant,
                color: theme.textPrimary,
                fontSize: '12.5px',
                fontWeight: '500',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {statuses.map((st) => (
                <option key={st} value={st}>
                  {st === 'All' ? 'All Statuses' : st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Risk Level Pills Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: theme.textSecondary, marginRight: '4px' }}>
            Risk Filter:
          </span>
          {['All', 'High', 'Medium', 'Low'].map((risk) => {
            const isSelected = selectedRiskFilter === risk;
            return (
              <button
                key={risk}
                onClick={() => {
                  setSelectedRiskFilter(risk);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${isSelected ? theme.primary : theme.border}`,
                  backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                  color: isSelected ? '#ffffff' : theme.textSecondary,
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {risk}
              </button>
            );
          })}

          {(searchTerm || selectedRiskFilter !== 'All' || selectedDeptFilter !== 'All' || selectedStatusFilter !== 'All') && (
            <button
              onClick={resetFilters}
              style={{
                marginLeft: 'auto',
                fontSize: '12px',
                color: theme.primary,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                textDecoration: 'underline'
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '20px 24px',
          boxShadow: theme.shadow
        }}
      >
        {filteredAndSortedEmployees.length === 0 ? (
          <EmptyState
            title="No Monitored Personnel Found"
            description="No employee records match your active search and filter criteria."
            onReset={resetFilters}
          />
        ) : (
          <>
            <div className="table-responsive">
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '13px'
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: `1px solid ${theme.border}`,
                      color: theme.textSecondary,
                      textTransform: 'uppercase',
                      fontSize: '11px',
                      letterSpacing: '0.06em'
                    }}
                  >
                    <th
                      onClick={() => handleSort('name')}
                      style={{ paddingBottom: '14px', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Identity / ID</span>
                        {renderSortIcon('name')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('department')}
                      style={{ paddingBottom: '14px', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Department & Role</span>
                        {renderSortIcon('department')}
                      </div>
                    </th>

                    <th style={{ paddingBottom: '14px', fontWeight: '600' }}>Account Status</th>

                    <th style={{ paddingBottom: '14px', fontWeight: '600' }}>Risk Assessment</th>

                    <th
                      onClick={() => handleSort('score')}
                      style={{ paddingBottom: '14px', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Score</span>
                        {renderSortIcon('score')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('lastActivity')}
                      style={{ paddingBottom: '14px', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Latest Telemetry</span>
                        {renderSortIcon('lastActivity')}
                      </div>
                    </th>

                    <th style={{ paddingBottom: '14px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedEmployees.map((emp) => {
                    const isHovered = hoveredRow === emp.id;
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        onMouseEnter={() => setHoveredRow(emp.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          borderBottom: `1px solid ${theme.border}`,
                          cursor: 'pointer',
                          backgroundColor: isHovered ? theme.surfaceHover : 'transparent',
                          transition: 'background-color 0.12s ease'
                        }}
                      >
                        {/* Name & Avatar */}
                        <td style={{ padding: '14px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                backgroundColor: emp.avatarBg,
                                color: emp.avatarColor,
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11.5px',
                                flexShrink: 0
                              }}
                            >
                              {emp.initial}
                            </div>

                            <div>
                              <div style={{ fontWeight: '600', color: theme.textPrimary }}>
                                {emp.name}
                              </div>
                              <div style={{ fontSize: '11px', color: theme.textSecondary }}>
                                ID #{emp.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department & Role */}
                        <td style={{ color: theme.textSecondary }}>
                          <div style={{ fontWeight: '600', color: theme.textPrimary, fontSize: '12.5px' }}>
                            {emp.role || emp.department}
                          </div>
                          <div style={{ fontSize: '11px', color: theme.textSecondary }}>
                            {emp.department}
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          {renderStatusBadge(emp.status)}
                        </td>

                        {/* Risk Assessment */}
                        <td>
                          <RiskBadge riskLevel={emp.riskLevel} />
                        </td>

                        {/* Score with Mini Progress Bar */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontWeight: '700',
                                color: theme.textPrimary,
                                fontFeatureSettings: '"tnum"',
                                width: '28px'
                              }}
                            >
                              {emp.score}
                            </span>
                            <div
                              style={{
                                width: '50px',
                                height: '4px',
                                borderRadius: '2px',
                                backgroundColor: theme.border,
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(emp.score, 100)}%`,
                                  height: '100%',
                                  backgroundColor:
                                    emp.score > 70
                                      ? '#ef4444'
                                      : emp.score > 40
                                      ? '#f97316'
                                      : '#10b981'
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Last Activity */}
                        <td style={{ color: theme.textSecondary, maxWidth: '240px' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {emp.lastActivity}
                          </div>
                          <div style={{ fontSize: '11px', color: theme.textMuted }}>
                            Seen {emp.seen}
                          </div>
                        </td>

                        {/* Action Link */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/employees/${emp.id}`);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: `1px solid ${theme.border}`,
                              backgroundColor: theme.surfaceVariant,
                              color: theme.textPrimary,
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = theme.primary;
                              e.currentTarget.style.backgroundColor = theme.surfaceHover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = theme.border;
                              e.currentTarget.style.backgroundColor = theme.surfaceVariant;
                            }}
                          >
                            <span>Dossier</span>
                            <ExternalLink size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: `1px solid ${theme.border}`,
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ fontSize: '12.5px', color: theme.textSecondary }}>
                Showing <strong style={{ color: theme.textPrimary }}>{totalItems === 0 ? 0 : startIndex + 1}</strong> to{' '}
                <strong style={{ color: theme.textPrimary }}>
                  {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}
                </strong>{' '}
                of <strong style={{ color: theme.textPrimary }}>{totalItems}</strong> monitored identities
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.surfaceVariant,
                    color: currentPage === 1 ? theme.textMuted : theme.textPrimary,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '6px',
                      border: `1px solid ${currentPage === page ? theme.primary : theme.border}`,
                      backgroundColor: currentPage === page ? theme.primary : theme.surfaceVariant,
                      color: currentPage === page ? '#ffffff' : theme.textPrimary,
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.surfaceVariant,
                    color: currentPage === totalPages ? theme.textMuted : theme.textPrimary,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
