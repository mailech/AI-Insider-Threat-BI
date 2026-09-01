'use client';

import React, { useState, useMemo } from 'react';
import type { EmployeeRead } from '@/types/api';

function normalizeScore(score: number): number {
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

interface NormalCohortTableProps {
  employees: EmployeeRead[];
  loading: boolean;
  onInspect: (employee: EmployeeRead) => void;
}

export default function NormalCohortTable({
  employees,
  loading,
  onInspect,
}: NormalCohortTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [isExpanded, setIsExpanded] = useState(true);

  // Normal / Safe cohort: Score < 60 and not CRITICAL/HIGH
  const normalEmployees = useMemo(() => {
    return employees.filter((e) => {
      const score = normalizeScore(e.risk_score);
      return score < 60 && e.risk_category !== 'CRITICAL' && e.risk_category !== 'HIGH';
    });
  }, [employees]);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    normalEmployees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [normalEmployees]);

  // Filtered employees
  const filtered = useMemo(() => {
    return normalEmployees.filter((e) => {
      const matchesSearch =
        searchTerm === '' ||
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.emp_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.designation.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept = selectedDept === 'ALL' || e.department === selectedDept;

      return matchesSearch && matchesDept;
    });
  }, [normalEmployees, searchTerm, selectedDept]);

  return (
    <div
      style={{
        backgroundColor: '#161C2E',
        border: '1px solid #2A3352',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        marginTop: '20px',
      }}
    >
      {/* ── Section Header ── */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #2A3352',
          backgroundColor: '#1E2640',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f7fafc' }}>
                Normal Baseline Cohort
              </h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {loading ? '…' : `${normalEmployees.length} Identities Within Normal Bounds`}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
              Compact summary table of compliant staff with baseline risk scores (0–59)
            </p>
          </div>
        </div>

        {/* Search & Collapse Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              id="search-normal-cohort"
              type="text"
              placeholder="Search normal identities…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                backgroundColor: '#161C2E',
                border: '1px solid #2A3352',
                borderRadius: '8px',
                padding: '6px 12px 6px 30px',
                fontSize: '12px',
                color: '#f7fafc',
                outline: 'none',
                width: '180px',
              }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '7px', fontSize: '12px', color: '#94A3B8' }}>🔍</span>
          </div>

          {departments.length > 0 && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                backgroundColor: '#161C2E',
                border: '1px solid #2A3352',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '12px',
                color: '#f7fafc',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              backgroundColor: '#161C2E',
              border: '1px solid #2A3352',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
            <span>{isExpanded ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {/* ── Table Content ── */}
      {isExpanded && (
        <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#111726', borderBottom: '1px solid #2A3352' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee ID</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Department</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Designation</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Threat Score</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(42, 51, 82, 0.4)' }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: '10px 16px' }}>
                        <div className="skeleton" style={{ height: '14px', width: '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                    {searchTerm ? 'No normal identities matched your search filters.' : 'No normal identities in cohort.'}
                  </td>
                </tr>
              ) : (
                filtered.map((emp, idx) => {
                  const normScore = normalizeScore(emp.risk_score);
                  return (
                    <tr
                      key={emp.emp_id}
                      style={{
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(30, 38, 64, 0.2)',
                        borderBottom: '1px solid rgba(42, 51, 82, 0.4)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(30, 38, 64, 0.2)'; }}
                    >
                      {/* ID */}
                      <td style={{ padding: '9px 16px' }}>
                        <code style={{ fontSize: '11px', color: '#3B82F6', fontFamily: 'var(--font-mono)' }}>
                          {emp.emp_id}
                        </code>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '9px 16px', fontWeight: 600, color: '#f7fafc', whiteSpace: 'nowrap' }}>
                        {emp.first_name} {emp.last_name}
                      </td>

                      {/* Department */}
                      <td style={{ padding: '9px 16px', color: '#b6c3d6' }}>
                        {emp.department}
                      </td>

                      {/* Designation */}
                      <td style={{ padding: '9px 16px', color: '#94A3B8' }}>
                        {emp.designation}
                      </td>

                      {/* Score & Mini Bar */}
                      <td style={{ padding: '9px 16px', minWidth: '130px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '4px', backgroundColor: '#0B0F19', borderRadius: '2px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.max(normScore, 4)}%`,
                                backgroundColor: normScore >= 30 ? '#3B82F6' : '#10B981',
                                borderRadius: '2px',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: normScore >= 30 ? '#3B82F6' : '#10B981', minWidth: '24px' }}>
                            {normScore}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '9px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 7px',
                            borderRadius: '999px',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: '#10B981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                          Within Normal
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '9px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => onInspect(emp)}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            border: '1px solid #2A3352',
                            backgroundColor: '#1E2640',
                            color: '#94A3B8',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                            e.currentTarget.style.borderColor = '#3B82F6';
                            e.currentTarget.style.color = '#3B82F6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#1E2640';
                            e.currentTarget.style.borderColor = '#2A3352';
                            e.currentTarget.style.color = '#94A3B8';
                          }}
                        >
                          Inspect Baseline
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
