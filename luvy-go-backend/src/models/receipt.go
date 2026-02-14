package models

import "time"

type Receipt struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       uint      `json:"user_id"`
	// User         User      `json:"user" gorm:"foreignKey:UserID"`
	Merchant     string    `json:"merchant"`
	Category     string    `json:"category"`
	Amount       float64   `json:"amount"`
	TokensEarned float64   `json:"tokens_earned"`
	ImageURL     string    `json:"image_url"`
	Status       string    `json:"status" gorm:"default:completed"`
	ReceiptDate  time.Time `json:"receipt_date"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Transaction struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id"`
	// User      User      `json:"user" gorm:"foreignKey:UserID"`
	ReceiptID uint      `json:"receipt_id"`
	Receipt   Receipt   `json:"receipt" gorm:"foreignKey:ReceiptID"`
	Type      string    `json:"type"`
	Amount    float64   `json:"amount"`
	CreatedAt time.Time `json:"created_at"`
}

type Merchant struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	Name     string `json:"name" gorm:"unique"`
	Category string `json:"category"`
	Icon     string `json:"icon"`
	Active   bool   `json:"active" gorm:"default:true"`
}
