package main

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"luvy-go-backend/database"
	"luvy-go-backend/src/handlers"
	"luvy-go-backend/src/models"
)

func main() {
	// ---- DB CONNECT ----
	db, err := database.Connect()
	if err != nil {
		panic(err)
	}

	// ---- AUTO MIGRATE ----
	if err := db.AutoMigrate(
		&models.User{},
		&models.Receipt{},
		&models.Transaction{},
		&models.Merchant{},
	); err != nil {
		panic(err)
	}

	// Seed merchants
	seedMerchants(db)

	// ---- INIT GIN ----
	r := gin.Default()

	// ---- CORS ----
	cfg := cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	r.Use(cors.New(cfg))

	// ---- SIMPLE USER MIDDLEWARE ----
	r.Use(func(c *gin.Context) {
		userID := uint(1) // Default user

		if v := c.GetHeader("X-User-ID"); v != "" {
			if n, e := strconv.ParseUint(v, 10, 64); e == nil && n > 0 {
				userID = uint(n)
			}
		}

		c.Set("userID", userID)
		c.Next()
	})

	// ---- HEALTH CHECK ----
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// ---- INIT HANDLERS ----
	receiptH := handlers.NewReceiptHandler(db)
	userHandler := handlers.NewUserHandler(db)
	analyticsHandler := handlers.NewAnalyticsHandler(db)
	adminHandler := handlers.NewAdminHandler(db)

	// ---- PUBLIC ROUTES ----
	r.GET("/api/merchants", func(c *gin.Context) {
		var merchants []models.Merchant
		if err := db.Where("active = ?", true).Find(&merchants).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch merchants"})
			return
		}
		c.JSON(200, gin.H{"merchants": merchants})
	})

	// ---- API ROUTES ----
	api := r.Group("/api")
	{
		// User routes
		api.GET("/user/profile", userHandler.GetProfile)
		api.PUT("/user/profile", userHandler.UpdateProfile)
		api.GET("/user/balance", userHandler.GetBalance)

		// Receipt routes
		receipts := api.Group("/receipts")
		{
			receipts.POST("", receiptH.SubmitReceipt)
			receipts.POST("/submit", receiptH.SubmitReceipt) // Alternative endpoint
			receipts.GET("", receiptH.ListReceipts)
			receipts.GET("/stats", receiptH.GetStats)
			receipts.GET("/:id", receiptH.GetReceipt)
			receipts.DELETE("/:id", receiptH.DeleteReceipt)
		}

		// Analytics routes
		analytics := api.Group("/analytics")
		{
			analytics.GET("/overview", analyticsHandler.GetOverview)
			analytics.GET("/spending", analyticsHandler.GetSpending)
			analytics.GET("/categories", analyticsHandler.GetCategories)
			analytics.GET("/merchants", analyticsHandler.GetTopMerchants)
		}

		// Admin routes
		admin := api.Group("/admin")
		{
			admin.GET("/dashboard", adminHandler.GetDashboard)
			admin.GET("/users", adminHandler.GetUsers)
			admin.GET("/revenue", adminHandler.GetRevenue)
			admin.GET("/merchants", adminHandler.GetTopMerchants)
		}
	}

	// ---- START SERVER ----
	log.Println("🚀 Server starting on port 8080")
	r.Run(":8080")
}

// Seed merchants
func seedMerchants(db *gorm.DB) {
	merchants := []models.Merchant{
		{Name: "REWE", Category: "grocery", Icon: "🛒"},
		{Name: "EDEKA", Category: "grocery", Icon: "🛒"},
		{Name: "Lidl", Category: "grocery", Icon: "🛒"},
		{Name: "Aldi Süd", Category: "grocery", Icon: "🛒"},
		{Name: "Aldi Nord", Category: "grocery", Icon: "🛒"},
		{Name: "Kaufland", Category: "grocery", Icon: "🛒"},
		{Name: "Penny", Category: "grocery", Icon: "🛒"},
		{Name: "Netto", Category: "grocery", Icon: "🛒"},
		{Name: "MediaMarkt", Category: "electronics", Icon: "📱"},
		{Name: "Saturn", Category: "electronics", Icon: "📱"},
		{Name: "Conrad Electronic", Category: "electronics", Icon: "📱"},
		{Name: "dm", Category: "healthcare", Icon: "💊"},
		{Name: "Rossmann", Category: "healthcare", Icon: "💊"},
		{Name: "Müller", Category: "healthcare", Icon: "💊"},
		{Name: "Aral", Category: "gas", Icon: "⛽"},
		{Name: "Shell", Category: "gas", Icon: "⛽"},
		{Name: "Esso", Category: "gas", Icon: "⛽"},
		{Name: "Total", Category: "gas", Icon: "⛽"},
		{Name: "Jet", Category: "gas", Icon: "⛽"},
		{Name: "H&M", Category: "clothing", Icon: "👔"},
		{Name: "Zara", Category: "clothing", Icon: "👔"},
		{Name: "C&A", Category: "clothing", Icon: "👔"},
		{Name: "McDonald's", Category: "restaurant", Icon: "🍽️"},
		{Name: "Burger King", Category: "restaurant", Icon: "🍽️"},
		{Name: "Starbucks", Category: "restaurant", Icon: "🍽️"},
	}

	for _, m := range merchants {
		db.Where(models.Merchant{Name: m.Name}).FirstOrCreate(&m)
	}

	log.Println("✅ Merchants seeded successfully")
}
