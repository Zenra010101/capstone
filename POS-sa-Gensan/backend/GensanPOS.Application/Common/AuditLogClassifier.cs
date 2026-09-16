using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Common;

public static class AuditLogClassifier
{
    private static readonly HashSet<string> SecurityActions = new(StringComparer.OrdinalIgnoreCase)
    {
        "LOGIN",
        "LOGIN_SUCCESS",
        "LOGIN_FAILED",
        "LOGOUT",
        "PASSWORD_CHANGE",
        "ROLE_CHANGE",
        "ACCOUNT_LOCK",
        "ACCOUNT_UNLOCK"
    };

    public static AuditLogCategory Classify(string action, string entityType)
    {
        if (SecurityActions.Contains(action)) return AuditLogCategory.Security;
        if (entityType.Equals("Auth", StringComparison.OrdinalIgnoreCase) ||
            entityType.Equals("Security", StringComparison.OrdinalIgnoreCase))
            return AuditLogCategory.Security;
        return AuditLogCategory.Operational;
    }

    public static string CategoryLabel(AuditLogCategory category) =>
        category == AuditLogCategory.Security ? "Login / Security" : "Operational";
}
