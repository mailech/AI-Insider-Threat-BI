// Run with mongosh after selecting the Sentinel Insight database.
// MongoDB holds immutable, high-volume telemetry rather than authorization state.

db.createCollection("activity_events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["event_id", "employee_id", "event_type", "occurred_at", "ingested_at", "source", "metadata"],
      properties: {
        event_id: { bsonType: "string", description: "Idempotency key from the collector" },
        employee_id: { bsonType: "string", description: "PostgreSQL employee UUID" },
        asset_id: { bsonType: ["string", "null"], description: "PostgreSQL asset UUID when known" },
        event_type: { enum: ["login", "file_download", "file_upload", "data_transfer", "email", "privilege_change", "remote_access", "usb_event", "network_activity"] },
        occurred_at: { bsonType: "date" },
        ingested_at: { bsonType: "date" },
        source: { bsonType: "string" },
        correlation_id: { bsonType: ["string", "null"] },
        metadata: { bsonType: "object", description: "Validated, secret-redacted event data" },
        expires_at: { bsonType: "date", description: "Retention cutoff" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
db.activity_events.createIndex({ event_id: 1 }, { unique: true });
db.activity_events.createIndex({ employee_id: 1, occurred_at: -1 });
db.activity_events.createIndex({ asset_id: 1, occurred_at: -1 });
db.activity_events.createIndex({ correlation_id: 1, occurred_at: -1 });
db.activity_events.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

db.createCollection("feature_snapshots", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["employee_id", "window_start", "window_end", "model_version", "features", "created_at"],
      properties: {
        employee_id: { bsonType: "string" },
        window_start: { bsonType: "date" },
        window_end: { bsonType: "date" },
        model_version: { bsonType: "string" },
        features: { bsonType: "object" },
        attention_weights: { bsonType: "object" },
        created_at: { bsonType: "date" },
        expires_at: { bsonType: "date" }
      }
    }
  }, validationLevel: "strict", validationAction: "error"
});
db.feature_snapshots.createIndex({ employee_id: 1, window_end: -1 });
db.feature_snapshots.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
