#!/usr/bin/env python3
"""
ITBIS — Module 6: Insider Risk Scoring Engine Verification
=============================================================
Validates the five-factor weighted scoring formula from the specification:

    Risk = 0.35*(Behavioral Anomalies)
         + 0.25*(Privilege Misuse Indicators)
         + 0.20*(Data Access Violations)
         + 0.10*(Access Pattern Deviations)
         + 0.10*(Historical Security Events)

Risk bands:
     0–29  → LOW
    30–59  → MEDIUM
    60–79  → HIGH
    80–100 → CRITICAL
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from app.models.domain import AccessLevelEnum, AssetTypeEnum, RiskCategoryEnum
from app.services.scoring import (
    WEIGHT_ANOMALIES,
    WEIGHT_DATA_ACCESS,
    WEIGHT_HISTORY,
    WEIGHT_PATTERN,
    WEIGHT_PRIVILEGE,
    calculate_threat_score,
    derive_weighted_factors,
    score_to_risk_category,
)

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

SPEC_WEIGHTS: dict[str, float] = {
    "Behavioral Anomalies": 0.35,
    "Privilege Misuse Indicators": 0.25,
    "Data Access Violations": 0.20,
    "Access Pattern Deviations": 0.10,
    "Historical Security Events": 0.10,
}

results: list[dict[str, Any]] = []


def ok(msg: str) -> str:
    return f"{GREEN}✓  PASS{RESET}  {msg}"


def fail(msg: str) -> str:
    return f"{RED}✗  FAIL{RESET}  {msg}"


def record(name: str, passed: bool, detail: str = "") -> None:
    results.append({"name": name, "passed": passed, "detail": detail})
    icon = ok if passed else fail
    print(f"  {icon(name)}" + (f"  {DIM}{detail}{RESET}" if detail else ""))


@dataclass(frozen=True)
class DummyScenario:
    label: str
    expected_category: RiskCategoryEnum
    logs: list[dict[str, Any]]
    access_level: AccessLevelEnum
    ml_anomaly_0_1: float | None
    profile: dict[str, Any] | None = None


def _make_employee(access_level: AccessLevelEnum) -> SimpleNamespace:
    return SimpleNamespace(
        access_level=access_level,
        assets=[SimpleNamespace(asset_type=AssetTypeEnum.DEVICE)],
    )


def _score_scenario(scenario: DummyScenario) -> tuple[int, RiskCategoryEnum, dict[str, float]]:
    employee = _make_employee(scenario.access_level)
    factors = derive_weighted_factors(
        logs=scenario.logs,
        employee=employee,
        ml_anomaly_0_1=scenario.ml_anomaly_0_1,
        profile=scenario.profile,
    )
    threat_score = calculate_threat_score(
        anomaly_weight=factors["anomaly_weight"],
        frequency=int(factors["frequency"]),
        asset_criticality=factors["asset_criticality"],
        historical_severity=factors["historical_severity"],
        anomaly_score=factors["anomalies"],
        privilege_score=factors["privilege"],
        data_access_score=factors["data_access"],
        pattern_deviation_score=factors["pattern_deviation"],
    )
    category = score_to_risk_category(threat_score)
    return threat_score, category, factors


def _build_scenarios() -> list[DummyScenario]:
    baseline_profile = {"typical_login_hour_start": 8, "typical_login_hour_end": 18}

    low_logs = [
        {
            "event_type": "LOGIN",
            "severity": "INFO",
            "payload": {"success": True},
            "timestamp": datetime(2026, 9, 16, 9, 30, tzinfo=timezone.utc),
        },
        {
            "event_type": "FILE_ACCESS",
            "severity": "LOW",
            "payload": {"size_mb": 2.0},
            "timestamp": datetime(2026, 9, 16, 10, 0, tzinfo=timezone.utc),
        },
    ]

    medium_logs = [
        {
            "event_type": "FILE_DOWNLOAD",
            "severity": "MEDIUM",
            "payload": {"size_mb": 850.0},
            "timestamp": datetime(2026, 9, 16, 14, 0, tzinfo=timezone.utc),
        },
        {
            "event_type": "EMAIL_ACTIVITY",
            "severity": "MEDIUM",
            "payload": {"forwarded": True},
            "timestamp": datetime(2026, 9, 16, 15, 0, tzinfo=timezone.utc),
        },
        {
            "event_type": "EMAIL_ACTIVITY",
            "severity": "HIGH",
            "payload": {"bcc_exfil": True},
            "timestamp": datetime(2026, 9, 16, 15, 30, tzinfo=timezone.utc),
        },
        {
            "event_type": "REMOTE_ACCESS",
            "severity": "MEDIUM",
            "payload": {"success": True, "off_hours": True},
            "timestamp": datetime(2026, 9, 16, 22, 30, tzinfo=timezone.utc),
        },
        {
            "event_type": "LOGIN",
            "severity": "MEDIUM",
            "payload": {"success": False, "attempts": 2},
            "timestamp": datetime(2026, 9, 16, 22, 45, tzinfo=timezone.utc),
        },
        {
            "event_type": "LOGIN",
            "severity": "LOW",
            "payload": {"success": True},
            "timestamp": datetime(2026, 9, 16, 9, 0, tzinfo=timezone.utc),
        },
    ]

    high_logs = [
        {
            "event_type": "PRIVILEGE_CHANGE",
            "severity": "HIGH",
            "payload": {"action": "role_elevation"},
            "timestamp": datetime(2026, 9, 16, 2, 15, tzinfo=timezone.utc),
        },
        {
            "event_type": "DATA_TRANSFER",
            "severity": "HIGH",
            "payload": {"bytes_transferred": 2_500_000_000},
            "timestamp": datetime(2026, 9, 16, 2, 30, tzinfo=timezone.utc),
        },
        {
            "event_type": "REMOTE_ACCESS",
            "severity": "HIGH",
            "payload": {"success": False, "attempts": 4},
            "timestamp": datetime(2026, 9, 16, 3, 0, tzinfo=timezone.utc),
        },
        {
            "event_type": "LOGIN",
            "severity": "MEDIUM",
            "payload": {"success": False, "attempts": 3},
            "timestamp": datetime(2026, 9, 16, 3, 5, tzinfo=timezone.utc),
        },
    ]

    critical_logs = [
        {
            "event_type": "PRIVILEGE_CHANGE",
            "severity": "CRITICAL",
            "payload": {"action": "admin_grant"},
            "timestamp": datetime(2026, 9, 17, 1, 0, tzinfo=timezone.utc),
        },
        {
            "event_type": "PRIVILEGE_CHANGE",
            "severity": "CRITICAL",
            "payload": {"action": "sudo_abuse"},
            "timestamp": datetime(2026, 9, 17, 1, 15, tzinfo=timezone.utc),
        },
        {
            "event_type": "DATA_TRANSFER",
            "severity": "CRITICAL",
            "payload": {"size_mb": 9500.0},
            "timestamp": datetime(2026, 9, 17, 1, 30, tzinfo=timezone.utc),
        },
        {
            "event_type": "DATA_EXFILTRATION",
            "severity": "CRITICAL",
            "payload": {"size_mb": 4200.0},
            "timestamp": datetime(2026, 9, 17, 2, 0, tzinfo=timezone.utc),
        },
        {
            "event_type": "REMOTE_ACCESS",
            "severity": "CRITICAL",
            "payload": {"success": False, "attempts": 8, "off_hours": True},
            "timestamp": datetime(2026, 9, 17, 2, 30, tzinfo=timezone.utc),
        },
        {
            "event_type": "LOGIN",
            "severity": "CRITICAL",
            "payload": {"success": False, "attempts": 6},
            "timestamp": datetime(2026, 9, 17, 2, 45, tzinfo=timezone.utc),
        },
    ]

    return [
        DummyScenario("LOW — routine activity", RiskCategoryEnum.LOW, low_logs, AccessLevelEnum.READ, 0.05, baseline_profile),
        DummyScenario("MEDIUM — moderate anomalies", RiskCategoryEnum.MEDIUM, medium_logs, AccessLevelEnum.WRITE, 0.68, baseline_profile),
        DummyScenario("HIGH — privilege + exfiltration", RiskCategoryEnum.HIGH, high_logs, AccessLevelEnum.ADMIN, 0.72, baseline_profile),
        DummyScenario("CRITICAL — multi-vector insider threat", RiskCategoryEnum.CRITICAL, critical_logs, AccessLevelEnum.ADMIN, 0.95, baseline_profile),
    ]


def verify_spec_weights() -> None:
    print(f"\n{BOLD}{CYAN}━━━  1. SPECIFICATION WEIGHT CONSTANTS  ━━━{RESET}")
    engine_weights = {
        "Behavioral Anomalies": WEIGHT_ANOMALIES,
        "Privilege Misuse Indicators": WEIGHT_PRIVILEGE,
        "Data Access Violations": WEIGHT_DATA_ACCESS,
        "Access Pattern Deviations": WEIGHT_PATTERN,
        "Historical Security Events": WEIGHT_HISTORY,
    }
    for label, spec_value in SPEC_WEIGHTS.items():
        engine_value = engine_weights[label]
        record(
            f"{label} = {spec_value:.0%}",
            engine_value == spec_value,
            f"engine={engine_value:.2f}",
        )
    total = sum(engine_weights.values())
    record("Weights sum to 1.0", abs(total - 1.0) < 1e-9, f"sum={total:.4f}")


def verify_formula_math() -> None:
    print(f"\n{BOLD}{CYAN}━━━  2. FORMULA ARITHMETIC (PURE ENGINE)  ━━━{RESET}")

    # Hand-calculated: 0.35*0.8 + 0.25*0.4 + 0.20*0.5 + 0.10*0.2 + 0.10*0.6 = 0.56
    mixed = calculate_threat_score(
        anomaly_weight=0.0,
        frequency=0,
        asset_criticality=0.0,
        historical_severity=0.6,
        anomaly_score=0.8,
        privilege_score=0.4,
        data_access_score=0.5,
        pattern_deviation_score=0.2,
    )
    record("Mixed-factor score = 56", mixed == 56, f"score={mixed}")

    all_max = calculate_threat_score(
        anomaly_weight=1.0,
        frequency=100,
        asset_criticality=1.0,
        historical_severity=1.0,
        anomaly_score=1.0,
        privilege_score=1.0,
        data_access_score=1.0,
        pattern_deviation_score=1.0,
    )
    record("All factors at 1.0 → score 100", all_max == 100, f"score={all_max}")

    anomalies_only = calculate_threat_score(
        anomaly_weight=1.0,
        frequency=0,
        asset_criticality=0.0,
        historical_severity=0.0,
        anomaly_score=1.0,
        privilege_score=0.0,
        data_access_score=0.0,
        pattern_deviation_score=0.0,
    )
    record("Anomalies-only (35%) → score 35", anomalies_only == 35, f"score={anomalies_only}")


def verify_risk_bands() -> None:
    print(f"\n{BOLD}{CYAN}━━━  3. RISK BAND THRESHOLDS  ━━━{RESET}")
    band_cases = [
        (0, RiskCategoryEnum.LOW),
        (29, RiskCategoryEnum.LOW),
        (30, RiskCategoryEnum.MEDIUM),
        (59, RiskCategoryEnum.MEDIUM),
        (60, RiskCategoryEnum.HIGH),
        (79, RiskCategoryEnum.HIGH),
        (80, RiskCategoryEnum.CRITICAL),
        (100, RiskCategoryEnum.CRITICAL),
    ]
    for score, expected in band_cases:
        actual = score_to_risk_category(score)
        record(
            f"score {score:3d} → {expected.value}",
            actual == expected,
            f"got {actual.value}",
        )


def verify_dummy_anomaly_scenarios() -> None:
    print(f"\n{BOLD}{CYAN}━━━  4. DUMMY ANOMALY DATA — END-TO-END SCORING  ━━━{RESET}")
    print(f"  {DIM}Formula: 0.35*A + 0.25*P + 0.20*D + 0.10*Pat + 0.10*H → ×100{RESET}\n")

    for scenario in _build_scenarios():
        score, category, factors = _score_scenario(scenario)
        raw = (
            WEIGHT_ANOMALIES * factors["anomalies"]
            + WEIGHT_PRIVILEGE * factors["privilege"]
            + WEIGHT_DATA_ACCESS * factors["data_access"]
            + WEIGHT_PATTERN * factors["pattern_deviation"]
            + WEIGHT_HISTORY * factors["history"]
        )
        manual_score = round(raw * 100)
        formula_ok = manual_score == score
        category_ok = category == scenario.expected_category

        color = (
            RED if category == RiskCategoryEnum.CRITICAL
            else YELLOW if category == RiskCategoryEnum.HIGH
            else CYAN if category == RiskCategoryEnum.MEDIUM
            else GREEN
        )
        print(f"  {BOLD}{scenario.label}{RESET}")
        print(
            f"    {DIM}A={factors['anomalies']:.3f}  P={factors['privilege']:.3f}  "
            f"D={factors['data_access']:.3f}  Pat={factors['pattern_deviation']:.3f}  "
            f"H={factors['history']:.3f}{RESET}"
        )
        print(f"    Threat Score: {color}{score}{RESET}  →  {color}{category.value}{RESET}  (expected {scenario.expected_category.value})")

        record(f"{scenario.label}: formula consistency", formula_ok, f"engine={score} manual={manual_score}")
        record(f"{scenario.label}: risk category", category_ok, f"got {category.value}")


def main() -> int:
    print(f"\n{BOLD}{CYAN}ITBIS Module 6 — Insider Risk Scoring Engine Verification{RESET}")
    verify_spec_weights()
    verify_formula_math()
    verify_risk_bands()
    verify_dummy_anomaly_scenarios()

    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    failed = total - passed
    print(f"\n{BOLD}━━━  SUMMARY  ━━━{RESET}")
    print(f"  {GREEN if failed == 0 else RED}{passed}/{total} checks passed{RESET}")
    if failed:
        print(f"  {RED}{failed} check(s) failed{RESET}")
        return 1
    print(f"  {GREEN}All Module 6 scoring checks passed.{RESET}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
