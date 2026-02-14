package push

import (
"context"
"database/sql"
)

type TokenRepo struct{ DB *sql.DB }
func NewTokenRepo(db *sql.DB) *TokenRepo { return &TokenRepo{DB: db} }

func (r *TokenRepo) Upsert(ctx context.Context, userID, platform, token string) error {
_, err := r.DB.ExecContext(ctx, `
INSERT INTO push_tokens (user_id, platform, token)
VALUES ($1, $2, $3)
ON CONFLICT (platform, token)
DO UPDATE SET user_id=EXCLUDED.user_id, last_seen_at=NOW()
`, userID, platform, token)
return err
}
