package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"luvy-go-backend/src/models"
)

type AnalyticsHandler struct {
	DB *gorm.DB
}

func NewAnalyticsHandler(db *gorm.DB) *AnalyticsHandler {
	return &AnalyticsHandler{DB: db}
}

func (h *AnalyticsHandler) GetOverview(c *gin.Context) {
	userID := c.GetUint("userID")

	var overview struct {
		TotalReceipts int     `json:"total_receipts"`
		TotalEarned   float64 `json:"total_earned"`
		ThisMonth     float64 `json:"this_month"`
		Balance       float64 `json:"balance"`
	}

	var receiptCount int64
	h.DB.Model(&models.Receipt{}).
        Where("user_id = ?", userID).
        Count(&receiptCount)

overview.TotalReceipts = int(receiptCount)

	h.DB.Model(&models.Receipt{}).Where("user_id = ?", userID).
		Select("COALESCE(SUM(tokens_earned), 0)").Scan(&overview.TotalEarned)

	startOfMonth := time.Now().AddDate(0, 0, -time.Now().Day()+1)
	h.DB.Model(&models.Receipt{}).
		Where("user_id = ? AND created_at >= ?", userID, startOfMonth).
		Select("COALESCE(SUM(tokens_earned), 0)").Scan(&overview.ThisMonth)

	var user models.User
	h.DB.Select("luvy_balance").First(&user, userID)
	overview.Balance = user.LuvyBalance

	c.JSON(http.StatusOK, overview)
}

func (h *AnalyticsHandler) GetSpending(c *gin.Context) {
	userID := c.GetUint("userID")

	var results []struct {
		Month string  `json:"month"`
		Total float64 `json:"total"`
	}

	h.DB.Raw(`
		SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as total
		FROM receipts
		WHERE user_id = ?
		GROUP BY month
		ORDER BY month DESC
		LIMIT 6
	`, userID).Scan(&results)

	c.JSON(http.StatusOK, gin.H{"spending": results})
}

func (h *AnalyticsHandler) GetCategories(c *gin.Context) {
	userID := c.GetUint("userID")

	var results []struct {
		Category string  `json:"category"`
		Total    float64 `json:"total"`
		Count    int     `json:"count"`
	}

	h.DB.Model(&models.Receipt{}).
		Select("category, SUM(amount) as total, COUNT(*) as count").
		Where("user_id = ?", userID).
		Group("category").
		Order("total DESC").
		Scan(&results)

	c.JSON(http.StatusOK, gin.H{"categories": results})
}

func (h *AnalyticsHandler) GetTopMerchants(c *gin.Context) {
	userID := c.GetUint("userID")

	var results []struct {
		Merchant string  `json:"merchant"`
		Total    float64 `json:"total"`
		Count    int     `json:"count"`
	}

	h.DB.Model(&models.Receipt{}).
		Select("merchant, SUM(amount) as total, COUNT(*) as count").
		Where("user_id = ?", userID).
		Group("merchant").
		Order("total DESC").
		Limit(5).
		Scan(&results)

	c.JSON(http.StatusOK, gin.H{"merchants": results})
}