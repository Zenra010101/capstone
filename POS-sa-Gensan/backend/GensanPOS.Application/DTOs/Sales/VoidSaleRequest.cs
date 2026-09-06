namespace GensanPOS.Application.DTOs.Sales;

public class VoidSaleRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class CreateCorrectionSaleRequest
{
    public CreateSaleRequest Sale { get; set; } = null!;
}
