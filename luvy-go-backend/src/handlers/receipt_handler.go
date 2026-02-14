package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"luvy-go-backend/src/models"
)

type ReceiptHandler struct {
	DB *gorm.DB
}

func NewReceiptHandler(db *gorm.DB) *ReceiptHandler {
	return &ReceiptHandler{DB: db}
}

func (h *ReceiptHandler) SubmitReceipt(c *gin.Context) {
	userID := c.GetUint("userID")

	var input struct {
		Merchant    string    `json:"merchant" binding:"required"`
		Category    string    `json:"category" binding:"required"`
		Amount      float64   `json:"amount" binding:"required,gt=0"`
		ReceiptDate time.Time `json:"receipt_date" binding:"required"`
		ImageURL    string    `json:"image_url"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokensEarned := input.Amount * 0.1

	receipt := models.Receipt{
		UserID:       userID,
		Merchant:     input.Merchant,
		Category:     input.Category,
		Amount:       input.Amount,
		TokensEarned: tokensEarned,
		ImageURL:     input.ImageURL,
		Status:       "completed",
		ReceiptDate:  input.ReceiptDate,
	}

	if err := h.DB.Create(&receipt).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create receipt"})
		return
	}

	h.DB.Model(&models.User{}).Where("id = ?", userID).
		Update("luvy_balance", gorm.Expr("luvy_balance + ?", tokensEarned))

	transaction := models.Transaction{
		UserID:    userID,
		ReceiptID: receipt.ID,
		Type:      "earn",
		Amount:    tokensEarned,
	}
	h.DB.Create(&transaction)

	c.JSON(http.StatusOK, gin.H{
		"message":       "Receipt submitted successfully",
		"receipt":       receipt,
		"tokens_earned": tokensEarned,
	})
}

func (h *ReceiptHandler) ListReceipts(c *gin.Context) {
	userID := c.GetUint("userID")

	var receipts []models.Receipt
	if err := h.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&receipts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch receipts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"receipts": receipts})
}

func (h *ReceiptHandler) GetStats(c *gin.Context) {
	userID := c.GetUint("userID")

	var stats struct {
		TotalReceipts int     `json:"total_receipts"`
		TotalEarned   float64 `json:"total_earned"`
		AvgReceipt    float64 `json:"avg_receipt"`
		SuccessRate   float64 `json:"success_rate"`
	}

	h.DB.Model(&models.Receipt{}).Where("user_id = ?", userID).
		Select("COUNT(*) as total_receipts, COALESCE(SUM(tokens_earned), 0) as total_earned, COALESCE(AVG(amount), 0) as avg_receipt").
		Scan(&stats)

	var completed int64
	h.DB.Model(&models.Receipt{}).Where("user_id = ? AND status = ?", userID, "completed").Count(&completed)
	if stats.TotalReceipts > 0 {
		stats.SuccessRate = (float64(completed) / float64(stats.TotalReceipts)) * 100
	}

	c.JSON(http.StatusOK, stats)
}

func (h *ReceiptHandler) GetReceipt(c *gin.Context) {
	userID := c.GetUint("userID")
	receiptID := c.Param("id")

	var receipt models.Receipt
	if err := h.DB.Where("id = ? AND user_id = ?", receiptID, userID).First(&receipt).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Receipt not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"receipt": receipt})
}

func (h *ReceiptHandler) DeleteReceipt(c *gin.Context) {
	userID := c.GetUint("userID")
	receiptID := c.Param("id")

	var receipt models.Receipt
	if err := h.DB.Where("id = ? AND user_id = ?", receiptID, userID).First(&receipt).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Receipt not found"})
		return
	}

	h.DB.Model(&models.User{}).Where("id = ?", userID).
		Update("luvy_balance", gorm.Expr("luvy_balance - ?", receipt.TokensEarned))

	h.DB.Delete(&receipt)

	c.JSON(http.StatusOK, gin.H{"message": "Receipt deleted successfully"})
}