package api

import (
"context"
"database/sql"
"encoding/json"
"net/http"

"luvy-go-backend/internal/outbox"
"luvy-go-backend/internal/platform/httpx"
)

type OutboxDeps struct {
DB   *sql.DB
Repo *outbox.Repo
}

func EnqueueEmail(d OutboxDeps) http.HandlerFunc {
type Req struct {
To       string            `json:"to"`
Template string            `json:"template"`
Data     map[string]string `json:"data"`
}
return func(w http.ResponseWriter, r *http.Request) {
var req Req
dec := json.NewDecoder(r.Body)
dec.DisallowUnknownFields()
if err := dec.Decode(&req); err != nil {
httpx.Error(w, 400, "invalid json")
return
}
if req.To == "" || req.Template == "" {
httpx.Error(w, 400, "to and template are required")
return
}

payload := outbox.EmailSendPayload{
To:       req.To,
Template: req.Template,
Data:     req.Data,
}

// aggregate info optional şimdilik
if err := d.Repo.Enqueue(context.Background(), "notification", nil, "EMAIL_SEND", payload); err != nil {
httpx.Error(w, 500, err.Error())
return
}
httpx.JSON(w, 201, map[string]any{"queued": true})
}
}
