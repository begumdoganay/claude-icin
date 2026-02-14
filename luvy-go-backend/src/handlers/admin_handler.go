package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"luvy-go-backend/src/models"
)

type AdminHandler struct {
	DB *gorm.DB
}

func NewAdminHandler(db *gorm.DB) *AdminHandler {
	return &AdminHandler{DB: db}
}

func (h *AdminHandler) GetDashboard(c *gin.Context) {
	var stats struct {
		TotalUsers    int64   `json:"total_users"`
		TotalReceipts int64   `json:"total_receipts"`
		TotalRevenue  float64 `json:"total_revenue"`
		TotalLuvy     float64 `json:"total_luvy"`
		SuccessRate   float64 `json:"success_rate"`
	}

	h.DB.Model(&models.User{}).Count(&stats.TotalUsers)
	h.DB.Model(&models.Receipt{}).Count(&stats.TotalReceipts)
	h.DB.Model(&models.Receipt{}).Select("COALESCE(SUM(amount), 0)").Scan(&stats.TotalRevenue)
	h.DB.Model(&models.Receipt{}).Select("COALESCE(SUM(tokens_earned), 0)").Scan(&stats.TotalLuvy)

	var completed int64
	h.DB.Model(&models.Receipt{}).Where("status = ?", "completed").Count(&completed)
	if stats.TotalReceipts > 0 {
		stats.SuccessRate = (float64(completed) / float64(stats.TotalReceipts)) * 100
	}

	c.JSON(http.StatusOK, stats)
}

func (h *AdminHandler) GetUsers(c *gin.Context) {
	var users []models.User

	if err := h.DB.Select("id, name, email, luvy_balance, created_at").
		Order("created_at DESC").
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	type UserWithStats struct {
		models.User
		ReceiptCount int `json:"receipt_count"`
	}

	var usersWithStats []UserWithStats
	for _, user := range users {
		var count int64
		h.DB.Model(&models.Receipt{}).Where("user_id = ?", user.ID).Count(&count)
		usersWithStats = append(usersWithStats, UserWithStats{
			User:         user,
			ReceiptCount: int(count),
		})
	}

	c.JSON(http.StatusOK, gin.H{"users": usersWithStats})
}

func (h *AdminHandler) GetRevenue(c *gin.Context) {
	var results []struct {
		Date   string  `json:"date"`
		Amount float64 `json:"amount"`
	}

	h.DB.Raw(`
		SELECT DATE(created_at) as date, SUM(amount) as amount
		FROM receipts
		GROUP BY date
		ORDER BY date DESC
		LIMIT 30
	`).Scan(&results)

	c.JSON(http.StatusOK, gin.H{"revenue": results})
}

func (h *AdminHandler) GetTopMerchants(c *gin.Context) {
	var results []struct {
		Merchant string  `json:"merchant"`
		Total    float64 `json:"total"`
		Count    int     `json:"count"`
	}

	h.DB.Model(&models.Receipt{}).
		Select("merchant, SUM(amount) as total, COUNT(*) as count").
		Group("merchant").
		Order("total DESC").
		Limit(10).
		Scan(&results)

	c.JSON(http.StatusOK, gin.H{"merchants": results})
}