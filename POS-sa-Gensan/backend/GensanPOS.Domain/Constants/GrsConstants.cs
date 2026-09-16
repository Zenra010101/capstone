using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Constants;

public static class GrsConstants
{
  public static bool CountsTowardSalesDeduction(GoodsReturnSlip g) =>
      g.Status == GrsStatus.Completed && !g.IsArchived;
}
