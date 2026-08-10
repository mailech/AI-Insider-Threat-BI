# Risk Scoring Engine

## Purpose

The risk engine translates behavioral anomalies and baseline drift into a severity score that SOC analysts can triage and investigate.

## Scoring logic

The initial engine uses weighted inputs:

- anomaly score
- baseline distance
- peer deviation
- historical weighting

This produces a continuous risk score and maps it into a severity bucket.

## Severity mapping

- Low: 0-39
- Medium: 40-64
- High: 65-84
- Critical: 85-100

## Historical weighting

Historical weighting allows the model to incorporate persistent risk behavior over time rather than reacting only to a single observation.

## Timeline usage

A risk timeline is valuable for tracking whether the employee’s risk score is rising, stable, or recovering.

## Security posture

- Risk score output should be explainable and auditable
- Changing thresholds must be versioned and reviewed
- Inference decisions should not be made outside controlled policies
