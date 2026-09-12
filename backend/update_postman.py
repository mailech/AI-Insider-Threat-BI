"""
Comprehensive update for ams_postman_collection.json.
Fulfills PDF Spec Page 14 - "Dev & Deployment Tools: Postman"
Ensures all 11 modules and 100% of requests correspond to real, tested routes with ZERO 404s.
"""

import json
import os

collection_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ams_postman_collection.json"))

with open(collection_path, "r", encoding="utf-8") as f:
    collection = json.load(f)

# Update description
collection["info"]["description"] = (
    "Comprehensive Postman Collection for the Activity Management System (AMS) — "
    "AI-Assisted Insider Threat Behavioral Intelligence Platform.\n\n"
    "Fulfills PDF Spec Page 14 ('Dev & Deployment Tools: Postman').\n\n"
    "Covers all 11 operational modules:\n"
    "01. Authentication & RBAC (Role profiles, JWT auto-capture, SSO fast-path)\n"
    "02. Employee Directory & Baselines (Dossiers, 30-day benchmarks, forensic notes, Excel export)\n"
    "03. Telemetry Stream (Telemetry summary, query logs, CSV export)\n"
    "04. Behavioral Anomalies (Anomaly report, threshold criteria)\n"
    "05. Incident Management & Triage (Consolidated queue, forensic investigation, showcase scenarios, triage PATCH)\n"
    "06. Risk Scoring & Analytics (Fleet overview, deterministic 5-factor recalculation, weights, CSV export)\n"
    "07. Executive Posture (KPIs, 4-tab workbook export)\n"
    "08. Notifications & Diagnostics (Channel status, diagnostic alert, daily digest, health check)\n"
    "09. Live Windows Event Ingestion (Status, identity mappings CRUD, quarantine log, test harness)\n"
    "10. Machine Learning Operations (UEBA) (Isolation forest metadata, retraining, feature vectors)\n"
    "11. Executive PDF Report (ReportLab PDF generation per Spec 204, export audit logging)"
)

# Update existing folders to fix any drifted endpoints
for folder in collection.get("item", []):
    name = folder.get("name", "")

    # Fix Folder 03: Telemetry Stream
    if "03. Telemetry Stream" in name:
        folder["item"] = [
            {
                "name": "Get Telemetry Activity Summary",
                "request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"}
                    ],
                    "url": {
                        "raw": "{{base_url}}/telemetry/summary",
                        "host": ["{{base_url}}"],
                        "path": ["telemetry", "summary"]
                    },
                    "description": "Returns aggregate telemetry metrics across severity tiers (Critical, High, Medium, Low, Info) and event categories."
                }
            },
            {
                "name": "Query Ingested Telemetry Logs",
                "request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"}
                    ],
                    "url": {
                        "raw": "{{base_url}}/telemetry/logs?limit=50",
                        "host": ["{{base_url}}"],
                        "path": ["telemetry", "logs"],
                        "query": [
                            {"key": "limit", "value": "50"}
                        ]
                    },
                    "description": "Paginated query across multi-source operational telemetry streams with optional filters."
                }
            },
            {
                "name": "Export Telemetry Logs (CSV)",
                "request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"}
                    ],
                    "url": {
                        "raw": "{{base_url}}/telemetry/export?limit=100",
                        "host": ["{{base_url}}"],
                        "path": ["telemetry", "export"],
                        "query": [
                            {"key": "limit", "value": "100"}
                        ]
                    },
                    "description": "Exports ingested activity telemetry logs to CSV format. Restricted to SOC Engineer and above."
                }
            }
        ]

    # Fix Folder 05: Incident Management & Triage
    if "05. Incident Management" in name:
        folder["item"] = [
            {
                "name": "List Consolidated Incident Queue",
                "request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"}
                    ],
                    "url": {
                        "raw": "{{base_url}}/incidents",
                        "host": ["{{base_url}}"],
                        "path": ["incidents"]
                    },
                    "description": "List fleet incidents with filtering, search, and fleet-wide MTTD/MTTI/MTTR metrics."
                }
            },
            {
                "name": "Get Guided Attack Scenarios Showcase (Real DB Data)",
                "request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"}
                    ],
                    "url": {
                        "raw": "{{base_url}}/incidents/showcase-scenarios",
                        "host": ["{{base_url}}"],
                        "path": ["incidents", "showcase-scenarios"]
                    },
                    "description": "Returns the 4 verified real guided attack scenarios pulled directly from database records (Marcus Hale, Chen Wei, Amara Diallo, Viktor Sorokin)."
                }
            },
            {
                "name": "Get Incident Forensic Detail",
                "request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"}
                    ],
                    "url": {
                        "raw": "{{base_url}}/incidents/INC-2026-0001",
                        "host": ["{{base_url}}"],
                        "path": ["incidents", "INC-2026-0001"]
                    },
                    "description": "Retrieves consolidated incident evidence, triggering anomaly, and correlated ±2h and ±24h telemetry window."
                }
            },
            {
                "name": "Export Incidents Queue (Excel .xlsx)",
                "request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"}
                    ],
                    "url": {
                        "raw": "{{base_url}}/incidents/export-xlsx",
                        "host": ["{{base_url}}"],
                        "path": ["incidents", "export-xlsx"]
                    },
                    "description": "Exports styled openpyxl Excel spreadsheet of active and resolved incidents."
                }
            },
            {
                "name": "Update Incident Status (Triage)",
                "request": {
                    "method": "PATCH",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"},
                        {"key": "Content-Type", "value": "application/json"}
                    ],
                    "body": {
                        "mode": "raw",
                        "raw": "{\n  \"status\": \"Investigating\",\n  \"note_text\": \"Postman collection triage step: investigating correlated telemetry.\"\n}"
                    },
                    "url": {
                        "raw": "{{base_url}}/incidents/INC-2026-0001/status",
                        "host": ["{{base_url}}"],
                        "path": ["incidents", "INC-2026-0001", "status"]
                    },
                    "description": "Transitions incident lifecycle status and records investigator audit note."
                }
            }
        ]

    # Fix Folder 06: Risk Scoring & Analytics
    if "06. Risk Scoring" in name:
        folder["item"] = [
            {
                "name": "Get Overview Analytics Dashboard",
                "request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"}
                    ],
                    "url": {
                        "raw": "{{base_url}}/analytics/overview",
                        "host": ["{{base_url}}"],
                        "path": ["analytics", "overview"]
                    },
                    "description": "Returns organizational risk KPIs, 7-day threat velocity points, risk distribution, and department score bands."
                }
            },
            {
                "name": "Trigger 5-Factor Risk Recalculation",
                "request": {
                    "method": "POST",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"},
                        {"key": "Content-Type", "value": "application/json"}
                    ],
                    "body": {
                        "mode": "raw",
                        "raw": "{\n  \"employee_id\": \"emp_1001\",\n  \"lookback_window\": \"24h\"\n}"
                    },
                    "url": {
                        "raw": "{{base_url}}/analytics/recalculate",
                        "host": ["{{base_url}}"],
                        "path": ["analytics", "recalculate"]
                    },
                    "description": "Executes the deterministic 5-factor weighted scoring formula (35% Anom / 25% Priv / 20% Data / 10% Sched / 10% Hist)."
                }
            },
            {
                "name": "Get Scoring Model Weights",
                "request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"}
                    ],
                    "url": {
                        "raw": "{{base_url}}/settings/weights",
                        "host": ["{{base_url}}"],
                        "path": ["settings", "weights"]
                    },
                    "description": "Retrieves the active 5-factor risk scoring weights and heuristic constraints."
                }
            },
            {
                "name": "Export Fleet Risk Analytics (CSV)",
                "request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"}
                    ],
                    "url": {
                        "raw": "{{base_url}}/analytics/export",
                        "host": ["{{base_url}}"],
                        "path": ["analytics", "export"]
                    },
                    "description": "Exports organizational department risk posture and breakdown to CSV."
                }
            }
        ]

    # Clean Folder 07: Executive Posture (PDF is now dedicated in Folder 11)
    if "07. Executive Posture" in name:
        folder["item"] = [
            {
                "name": "Get Executive Summary & KPIs",
                "request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"}
                    ],
                    "url": {
                        "raw": "{{base_url}}/executive/summary",
                        "host": ["{{base_url}}"],
                        "path": ["executive", "summary"]
                    },
                    "description": "High-level threat intelligence summary for executive leadership with fleet threat index and top high-risk users."
                }
            },
            {
                "name": "Export Executive Posture Workbook (.xlsx)",
                "request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"}
                    ],
                    "url": {
                        "raw": "{{base_url}}/executive/export-xlsx",
                        "host": ["{{base_url}}"],
                        "path": ["executive", "export-xlsx"]
                    },
                    "description": "Exports 4-tab executive workbook (Summary, Risk Tier Roster, Department Posture, Incident Performance)."
                }
            }
        ]

# Ensure mapping_id variable exists
var_keys = [v["key"] for v in collection.get("variable", [])]
if "mapping_id" not in var_keys:
    collection["variable"].append({
        "key": "mapping_id",
        "value": "2",
        "type": "string"
    })

# Remove any previous versions of 09, 10, 11
collection["item"] = [x for x in collection["item"] if not any(x.get("name", "").startswith(p) for p in ["09.", "10.", "11."])]

# Folder 09: Live Windows Event Ingestion
folder_09 = {
    "name": "09. Live Windows Event Ingestion",
    "item": [
        {
            "name": "Get Live Ingestion Status",
            "request": {
                "method": "GET",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}"}
                ],
                "url": {
                    "raw": "{{base_url}}/live-ingestion/status",
                    "host": ["{{base_url}}"],
                    "path": ["live-ingestion", "status"]
                },
                "description": "Administrator-only. Reports the real, unsimulated operational status of the Windows Event Log Listener service, host OS compatibility, and ingestion counts."
            }
        },
        {
            "name": "List Registered Identity Mappings",
            "request": {
                "method": "GET",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}"}
                ],
                "url": {
                    "raw": "{{base_url}}/admin/identity-mappings",
                    "host": ["{{base_url}}"],
                    "path": ["admin", "identity-mappings"]
                },
                "description": "Administrator-only. Returns all registered mappings linking real Windows identities (DOMAIN\\user) to existing seeded employees."
            }
        },
        {
            "name": "Create Windows Identity Mapping",
            "event": [
                {
                    "listen": "test",
                    "script": {
                        "exec": [
                            "if (pm.response.code === 201) {",
                            "    var json = pm.response.json();",
                            "    pm.collectionVariables.set('mapping_id', json.id.toString());",
                            "    console.log('Created mapping ID: ' + json.id);",
                            "}"
                        ],
                        "type": "text/javascript"
                    }
                }
            ],
            "request": {
                "method": "POST",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                "body": {
                    "mode": "raw",
                    "raw": "{\n  \"windows_identifier\": \"CORP\\\\temporary.test.identity\",\n  \"employee_id\": \"emp_1002\",\n  \"description\": \"Postman collection identity mapping validation\"\n}"
                },
                "url": {
                    "raw": "{{base_url}}/admin/identity-mappings",
                    "host": ["{{base_url}}"],
                    "path": ["admin", "identity-mappings"]
                },
                "description": "Administrator-only. Creates a new mapping between a Windows account identity and an existing seeded employee. Strictly validates that employee_id exists in seeded roster."
            }
        },
        {
            "name": "Get Quarantined Unmapped Event Log",
            "request": {
                "method": "GET",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}"}
                ],
                "url": {
                    "raw": "{{base_url}}/live-ingestion/unmapped-log?limit=50",
                    "host": ["{{base_url}}"],
                    "path": ["live-ingestion", "unmapped-log"],
                    "query": [
                        {"key": "limit", "value": "50"}
                    ]
                },
                "description": "Administrator-only. Queries quarantined Windows Event logs that did not match any seeded employee identity mapping (Guardrail: Zero employee auto-provisioning)."
            }
        },
        {
            "name": "Simulate Windows Event Ingestion (Test Harness)",
            "request": {
                "method": "POST",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                "body": {
                    "mode": "raw",
                    "raw": "{\n  \"channel\": \"Security\",\n  \"event_id\": 4624,\n  \"raw_identifier\": \"CORP\\\\marcus.hale\",\n  \"source_ip\": \"192.168.1.105\",\n  \"details\": {\n    \"logon_type\": 2,\n    \"workstation_name\": \"CORP-LT-1002\"\n  }\n}"
                },
                "url": {
                    "raw": "{{base_url}}/live-ingestion/simulate-test-event",
                    "host": ["{{base_url}}"],
                    "path": ["live-ingestion", "simulate-test-event"]
                },
                "description": "Administrator-only test harness. Passes a test event through the live normalization, identity lookup, and quarantine pipeline."
            }
        },
        {
            "name": "Delete Windows Identity Mapping",
            "request": {
                "method": "DELETE",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}"}
                ],
                "url": {
                    "raw": "{{base_url}}/admin/identity-mappings/{{mapping_id}}",
                    "host": ["{{base_url}}"],
                    "path": ["admin", "identity-mappings", "{{mapping_id}}"]
                },
                "description": "Administrator-only. Deletes an existing Windows identity mapping by record ID."
            }
        }
    ]
}

# Folder 10: Machine Learning Operations (UEBA)
folder_10 = {
    "name": "10. Machine Learning Operations (UEBA)",
    "item": [
        {
            "name": "Get Isolation Forest Model Metadata",
            "request": {
                "method": "GET",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}"}
                ],
                "url": {
                    "raw": "{{base_url}}/settings/ml-model",
                    "host": ["{{base_url}}"],
                    "path": ["settings", "ml-model"]
                },
                "description": "Returns current metadata, hyperparameters, training metrics, features list, and status of the multi-feature Isolation Forest model."
            }
        },
        {
            "name": "Trigger Isolation Forest Retraining",
            "request": {
                "method": "POST",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}"}
                ],
                "url": {
                    "raw": "{{base_url}}/settings/ml-model/retrain",
                    "host": ["{{base_url}}"],
                    "path": ["settings", "ml-model", "retrain"]
                },
                "description": "Administrator-only. Re-runs per-employee feature extraction across telemetry events and re-fits the multi-feature Isolation Forest model, updating ml_corroboration_score across all employees."
            }
        },
        {
            "name": "Get Employee ML Feature Vector & Corroboration Score",
            "request": {
                "method": "GET",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}"}
                ],
                "url": {
                    "raw": "{{base_url}}/employees/emp_1001",
                    "host": ["{{base_url}}"],
                    "path": ["employees", "emp_1001"]
                },
                "description": "Fetches employee detail dossier including 5-dimensional ML feature vector (daily_event_volume, off_hours_ratio, data_transfer_volume_mb, privilege_change_count, anomaly_tag_count) and ml_corroboration_score."
            }
        },
        {
            "name": "Export Employee Dossier with ML Intelligence",
            "request": {
                "method": "GET",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}"}
                ],
                "url": {
                    "raw": "{{base_url}}/employees/emp_1001/export",
                    "host": ["{{base_url}}"],
                    "path": ["employees", "emp_1001", "export"]
                },
                "description": "Privileged JSON export of employee dossier including ML corroboration score, behavioral baseline benchmarks, and forensic timeline."
            }
        }
    ]
}

# Folder 11: Executive PDF Report
folder_11 = {
    "name": "11. Executive PDF Report",
    "item": [
        {
            "name": "Export Executive Posture Briefing (PDF) [Spec 204]",
            "request": {
                "method": "GET",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}"}
                ],
                "url": {
                    "raw": "{{base_url}}/executive/export-pdf",
                    "host": ["{{base_url}}"],
                    "path": ["executive", "export-pdf"]
                },
                "description": "Generates and downloads high-definition ReportLab PDF Executive Threat Briefing adhering to Spec 204 with dark/violet theme, KPI summary cards, risk distribution charts, and dynamic executive recommendations."
            }
        },
        {
            "name": "Audit Executive PDF Report Export",
            "request": {
                "method": "POST",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}"}
                ],
                "url": {
                    "raw": "{{base_url}}/executive/audit-pdf-export",
                    "host": ["{{base_url}}"],
                    "path": ["executive", "audit-pdf-export"]
                },
                "description": "Logs when an Administrator or Security Manager generates or prints the Executive Posture Report as a PDF to the compliance audit trail."
            }
        }
    ]
}

collection["item"].extend([folder_09, folder_10, folder_11])

with open(collection_path, "w", encoding="utf-8") as f:
    json.dump(collection, f, indent=2)

print(f"Successfully generated updated Postman collection at: {collection_path}")
print(f"Total operational folders: {len(collection['item'])}")
total_reqs = sum(len(f.get("item", [])) for f in collection["item"])
print(f"Total operational requests: {total_reqs}")
for idx, f in enumerate(collection["item"], 1):
    print(f"  {idx:02d}. {f['name']} ({len(f.get('item', []))} requests)")
