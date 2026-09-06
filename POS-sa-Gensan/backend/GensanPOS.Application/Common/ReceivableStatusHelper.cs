using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Common;

public static class ReceivableStatusHelper
{
    public static ReceivableStatus Compute(decimal totalAmount, decimal paidAmount, decimal remainingBalance, DateTime dueDate)
    {
        if (remainingBalance <= 0 || paidAmount >= totalAmount)
            return ReceivableStatus.Paid;

        if (DateTime.UtcNow.Date > dueDate.Date)
            return ReceivableStatus.Overdue;

        if (paidAmount > 0)
            return ReceivableStatus.Partial;

        return ReceivableStatus.Unpaid;
    }
}
