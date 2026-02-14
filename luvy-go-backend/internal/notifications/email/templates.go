package email

import "fmt"

type Template string

const (
WelcomeV1      Template = "WELCOME_V1"
PointsEarnedV1 Template = "POINTS_EARNED_V1"
)

func Render(t Template, data map[string]string) (subject string, html string) {
switch t {
case WelcomeV1:
subject = "LUVY'ye hoş geldin!"
name := data["name"]
if name == "" { name = "👋" }
html = fmt.Sprintf("<h2>Merhaba %s</h2><p>LUVY hesabın aktif ✅</p>", name)
return
case PointsEarnedV1:
subject = "Yeni LUVY kazandın!"
amount := data["amount"]
if amount == "" { amount = "0" }
html = fmt.Sprintf("<h2>🎉 Tebrikler</h2><p>+%s LUVY kazandın.</p>", amount)
return
default:
subject = "LUVY bildirimi"
html = "<p>Bildirim</p>"
return
}
}
