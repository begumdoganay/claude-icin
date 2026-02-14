package analytics

import (
"context"
"database/sql"
)

type PointsFlow struct {
Earned int64 `json:"earned"`
Spent  int64 `json:"spent"`
Locked int64 `json:"locked"`
}

type Store struct{ DB *sql.DB }
func NewStore(db *sql.DB) *Store { return &Store{DB: db} }

func (s *Store) PointsFlow(ctx context.Context) (PointsFlow, error) {
var out PointsFlow
if err := s.DB.QueryRowContext(ctx, `SELECT COALESCE(SUM(amount),0) FROM transactions WHERE type='EARN'`).Scan(&out.Earned); err != nil { return out, err }
if err := s.DB.QueryRowContext(ctx, `SELECT COALESCE(SUM(amount),0) FROM transactions WHERE type='SPEND'`).Scan(&out.Spent); err != nil { return out, err }
out.Locked = (out.Earned * 80) / 100
return out, nil
}
