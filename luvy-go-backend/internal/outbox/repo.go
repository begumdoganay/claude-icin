package outbox

import (
"context"
"database/sql"
"encoding/json"
"time"
)

type Repo struct{ DB *sql.DB }
func NewRepo(db *sql.DB) *Repo { return &Repo{DB: db} }

func (r *Repo) Enqueue(ctx context.Context, aggregateType string, aggregateID *string, eventType string, payload any) error {
b, err := json.Marshal(payload)
if err != nil { return err }

_, err = r.DB.ExecContext(ctx, `
INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
VALUES ($1, $2, $3, $4::jsonb)
`, aggregateType, aggregateID, eventType, string(b))

return err
}

type Event struct {
ID string
EventType string
Payload json.RawMessage
AttemptCount int
}

func (r *Repo) ClaimBatch(ctx context.Context, limit int) ([]Event, error) {
rows, err := r.DB.QueryContext(ctx, `
WITH cte AS (
  SELECT id
  FROM outbox_events
  WHERE status='PENDING'
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
  ORDER BY created_at ASC
  LIMIT $1
  FOR UPDATE SKIP LOCKED
)
UPDATE outbox_events o
SET status='PROCESSING', updated_at=NOW()
FROM cte
WHERE o.id = cte.id
RETURNING o.id, o.event_type, o.payload, o.attempt_count
`, limit)
if err != nil { return nil, err }
defer rows.Close()

var out []Event
for rows.Next() {
var e Event
if err := rows.Scan(&e.ID, &e.EventType, &e.Payload, &e.AttemptCount); err != nil { return nil, err }
out = append(out, e)
}
return out, rows.Err()
}

func (r *Repo) MarkSent(ctx context.Context, id string) error {
_, err := r.DB.ExecContext(ctx, `UPDATE outbox_events SET status='SENT', updated_at=NOW() WHERE id=$1`, id)
return err
}

func (r *Repo) MarkFailed(ctx context.Context, id string, attempt int, errMsg string, nextRetry time.Time, dead bool) error {
status := "FAILED"
if dead { status = "DEAD" }
_, err := r.DB.ExecContext(ctx, `
UPDATE outbox_events
SET status=$2, attempt_count=$3, last_error=$4, next_retry_at=$5, updated_at=NOW()
WHERE id=$1
`, id, status, attempt, errMsg, nextRetry)
return err
}
