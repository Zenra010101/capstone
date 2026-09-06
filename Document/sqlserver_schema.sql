CREATE TABLE AuditLogs (
  [Id] VARCHAR(255) PRIMARY KEY NOT NULL,
  [UserId] VARCHAR(255),
  [UserEmail] VARCHAR(255),
  [Action] VARCHAR(255) NOT NULL,
  [EntityType] VARCHAR(255) NOT NULL,
  [EntityId] VARCHAR(255),
  [Details] VARCHAR(255),
  [IpAddress] VARCHAR(255),
  [IsArchived] INT NOT NULL,
  [CreatedAt] VARCHAR(255) NOT NULL,
  [UpdatedAt] VARCHAR(255),
  [Category] INT NOT NULL DEFAULT 1,
  [UserAgent] VARCHAR(255),
  [Status] VARCHAR(255),
  [OldValue] VARCHAR(255),
  [NewValue] VARCHAR(255)
);
