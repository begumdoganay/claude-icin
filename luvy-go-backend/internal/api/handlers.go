package api

import (
"context"
"database/sql"
"encoding/json"
"net/http"

"luvy-go-backend/internal/admin/reports"
"luvy-go-backend/internal/analytics"
"luvy-go-backend/internal/notifications/email"
"luvy-go-backend/internal/platform/httpx"
)

type Deps struct {
DB        *sql.DB
EmailSMTP *email.SMTPClient
}

func AdminSummary(d Deps) http.HandlerFunc {
store := reports.NewStore(d.DB)
return func(w http.ResponseWriter, r *http.Request) {
out, err := store.Summary(context.Background())
if err != nil { httpx.Error(w, 500, err.Error()); return }
httpx.JSON(w, 200, out)
}
}

func AnalyticsPointsFlow(d Deps) http.HandlerFunc {
store := analytics.NewStore(d.DB)
return func(w http.ResponseWriter, r *http.Request) {
out, err := store.PointsFlow(context.Background())
if err != nil { httpx.Error(w, 500, err.Error()); return }
httpx.JSON(w, 200, out)
}
}

func EmailTest(d Deps) http.HandlerFunc {
type Req struct {
Email    string `json:"email"`
Template string `json:"template"` // WELCOME_V1 | POINTS_EARNED_V1
}
return func(w http.ResponseWriter, r *http.Request) {
var req Req
dec := json.NewDecoder(r.Body)
dec.DisallowUnknownFields()
if err := dec.Decode(&req); err != nil {
httpx.Error(w, 400, "invalid json")
return
}

sub, body := email.Render(email.Template(req.Template), map[string]string{
"name":   "Begüm",
"amount": "50",
})

if d.EmailSMTP == nil {
httpx.Error(w, 500, "email client not configured")
return
}

if err := d.EmailSMTP.SendHTML(req.Email, sub, body); err != nil {
httpx.Error(w, 500, err.Error())
return
}
httpx.JSON(w, 200, map[string]any{"ok": true})
}
}
