package models

import "time"

// Minimal User model to satisfy handlers.
// You can expand fields later to match your real DB schema.
type User struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name"`
	Email       string    `json:"email" gorm:"uniqueIndex"`
	Phone       string    `json:"phone"`
	Password    string    `json:"-"` // do not expose
	LuvyBalance float64   `json:"luvy_balance" gorm:"default:0"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
