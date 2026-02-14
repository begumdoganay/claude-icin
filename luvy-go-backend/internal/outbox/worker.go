package outbox

import (
"context"
"encoding/json"
"errors"
"time"

"go.uber.org/zap"

"luvy-go-backend/internal/notifications/email"
)

type Dispatcher struct {
Email *email.SMTPClient
}

type Worker struct {
Repo       *Repo
Dispatcher *Dispatcher
Log        *zap.Logger

BatchSize   int
MaxAttempts int
PollEvery   time.Duration
}

func NewWorker(repo *Repo, d *Dispatcher, log *zap.Logger) *Worker {
return &Worker{
Repo:        repo,
Dispatcher:  d,
Log:         log,
BatchSize:   25,
MaxAttempts: 8,
PollEvery:   2 * time.Second,
}
}

func (w *Worker) Run(ctx context.Context) error {
if w.Log == nil {
return errors.New("logger is nil")
}
w.Log.Info("outbox worker started")

t := time.NewTicker(w.PollEvery)
defer t.Stop()

for {
select {
case <-ctx.Done():
w.Log.Info("outbox worker stopped")
return nil
case <-t.C:
events, err := w.Repo.ClaimBatch(ctx, w.BatchSize)
if err != nil {
w.Log.Error("claim batch failed", zap.Error(err))
continue
}
for _, ev := range events {
w.handleOne(ctx, ev)
}
}
}
}

type EmailSendPayload struct {
To       string            `json:"to"`
Template string            `json:"template"`
Data     map[string]string `json:"data"`
}

func (w *Worker) handleOne(ctx context.Context, ev Event) {
attempt := ev.AttemptCount + 1

switch ev.EventType {
case "EMAIL_SEND":
var p EmailSendPayload
if err := json.Unmarshal(ev.Payload, &p); err != nil {
w.fail(ctx, ev.ID, attempt, "invalid payload: "+err.Error())
return
}

if w.Dispatcher == nil || w.Dispatcher.Email == nil {
w.fail(ctx, ev.ID, attempt, "email dispatcher not configured")
return
}

sub, html := email.Render(email.Template(p.Template), p.Data)
if err := w.Dispatcher.Email.SendHTML(p.To, sub, html); err != nil {
w.fail(ctx, ev.ID, attempt, err.Error())
return
}

if err := w.Repo.MarkSent(ctx, ev.ID); err != nil {
w.Log.Error("mark sent failed", zap.String("id", ev.ID), zap.Error(err))
return
}
w.Log.Info("event sent", zap.String("id", ev.ID), zap.String("type", ev.EventType))
default:
// bilinmeyen event tipi => dead
w.dead(ctx, ev.ID, attempt, "unknown event_type: "+ev.EventType)
}
}

func (w *Worker) fail(ctx context.Context, id string, attempt int, msg string) {
next := time.Now().Add(backoff(attempt))
dead := attempt >= w.MaxAttempts

if err := w.Repo.MarkFailed(ctx, id, attempt, msg, next, dead); err != nil {
w.Log.Error("mark failed failed", zap.String("id", id), zap.Error(err))
return
}

if dead {
w.Log.Error("event dead", zap.String("id", id), zap.Int("attempt", attempt), zap.String("err", msg))
} else {
w.Log.Warn("event failed", zap.String("id", id), zap.Int("attempt", attempt), zap.String("err", msg), zap.Time("next_retry", next))
}
}

func (w *Worker) dead(ctx context.Context, id string, attempt int, msg string) {
next := time.Now().Add(24 * time.Hour)
_ = w.Repo.MarkFailed(ctx, id, attempt, msg, next, true)
w.Log.Error("event dead", zap.String("id", id), zap.String("err", msg))
}

func backoff(attempt int) time.Duration {
// exponential backoff (capped)
sec := 2 << (attempt - 1) // 2,4,8,16...
if sec > 300 {
sec = 300
}
return time.Duration(sec) * time.Second
}
