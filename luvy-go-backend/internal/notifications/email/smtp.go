package email

import (
"fmt"
"net/smtp"
)

type SMTPConfig struct {
Host string
Port string
User string
Pass string
From string
}

type SMTPClient struct{ cfg SMTPConfig }
func NewSMTP(cfg SMTPConfig) *SMTPClient { return &SMTPClient{cfg: cfg} }

func (c *SMTPClient) SendHTML(to, subject, htmlBody string) error {
addr := fmt.Sprintf("%s:%s", c.cfg.Host, c.cfg.Port)
auth := smtp.PlainAuth("", c.cfg.User, c.cfg.Pass, c.cfg.Host)

msg := []byte(
"From: " + c.cfg.From + "\r\n" +
"To: " + to + "\r\n" +
"Subject: " + subject + "\r\n" +
"MIME-Version: 1.0\r\n" +
"Content-Type: text/html; charset=UTF-8\r\n\r\n" +
htmlBody,
)

return smtp.SendMail(addr, auth, c.cfg.From, []string{to}, msg)
}
