package reports

import (
"context"
"database/sql"
"time"
)

type Summary struct {
TotalUsers     int64  `json:"total_users"`
TotalMerchants int64  `json:"total_merchants"`
DailyTx        int64  `json:"daily_transactions"`
AsOf           string `json:"as_of"`
}

type Store struct{ DB *sql.DB }
func NewStore(db *sql.DB) *Store { return &Store{DB: db} }

func (s *Store) Summary(ctx context.Context) (Summary, error) {
var out Summary
if err := s.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&out.TotalUsers); err != nil { return out, err }
if err := s.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM merchants`).Scan(&out.TotalMerchants); err != nil { return out, err }
if err := s.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM transactions WHERE created_at >= NOW() - INTERVAL '1 day'`).Scan(&out.DailyTx); err != nil { return out, err }
out.AsOf = time.Now().UTC().Format(time.RFC3339)
return out, nil
}
