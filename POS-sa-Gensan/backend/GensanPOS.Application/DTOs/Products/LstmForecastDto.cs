using System;

namespace GensanPOS.Application.DTOs.Products;

public class LstmForecastDto
{
    public Guid ProductId { get; set; }
    public string ProductSku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public Guid? ParentCategoryId { get; set; }
    public string? ParentCategoryName { get; set; }
    public string Month { get; set; } = string.Empty; // Format: "YYYY-MM"
    public int PredictedQuantity { get; set; }
    public decimal PredictedRevenue { get; set; }
    public double ConfidenceInterval { get; set; }
    public string Trend { get; set; } = "stable"; // "up", "down", "stable"
    
    // Inventory Planning fields
    public int CurrentStock { get; set; }
    public int ReorderLevel { get; set; }
    public int RecommendedRestock { get; set; }
    public string PlanningStatus { get; set; } = "Optimal"; // "Restock Needed", "Optimal", "Overstocked"
}
