using FluentValidation;
using GensanPOS.Application.DTOs.Products;

namespace GensanPOS.Application.Validators;

public class CreateProductRequestValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductRequestValidator()
    {
        RuleFor(x => x.Sku).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.UnitOfMeasure).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Size).MaximumLength(100);
        RuleFor(x => x.Thickness).MaximumLength(50);
        RuleFor(x => x.Length).MaximumLength(50);
        RuleFor(x => x.Grade).MaximumLength(50);
        RuleFor(x => x.UnitPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CostPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.StockQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CategoryId).NotEmpty();
    }
}
