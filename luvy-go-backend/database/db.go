package database

import (
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	_ "modernc.org/sqlite" // Pure Go SQLite driver (no CGO required)
)

// Connect establishes database connection using Pure Go SQLite
func Connect() (*gorm.DB, error) {
	// SQLite database file (will be created automatically)
	dsn := "luvy.db"

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	return db, nil
}
