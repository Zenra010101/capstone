using FluentValidation;
using GensanPOS.Application.DTOs.StockReceiving;

namespace GensanPOS.Application.Validators;

public class CreateStockReceivingRequestValidator : AbstractValidator<CreateStockReceivingRequest>
{
    public CreateStockReceivingRequestValidator()
    {
        RuleFor(x => x.SupplierId).NotEmpty();
        RuleFor(x => x.ContainerNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.StockNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ReferenceNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DeliveryReceiptNumber).MaximumLength(100).When(x => !string.IsNullOrWhiteSpace(x.DeliveryReceiptNumber));
        RuleFor(x => x.DeliveryDate).NotEmpty();
        RuleFor(x => x.Items).NotEmpty();
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty();
            item.RuleFor(i => i.Quantity).GreaterThan(0);
            item.RuleFor(i => i.CostPrice).GreaterThanOrEqualTo(0);
            item.RuleFor(i => i.SellingPrice).GreaterThanOrEqualTo(0);
        });
    }
}
