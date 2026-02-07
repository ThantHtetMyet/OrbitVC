USE [OrbitVC]
GO

-- =============================================
-- INSERT OS TYPES
-- =============================================

IF NOT EXISTS (SELECT 1 FROM [dbo].[OSTypes] WHERE Name = 'Windows')
BEGIN
    INSERT INTO [dbo].[OSTypes] ([ID], [Name]) VALUES (NEWID(), 'Windows')
    PRINT 'Inserted OS Type: Windows'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[OSTypes] WHERE Name = 'Linux')
BEGIN
    INSERT INTO [dbo].[OSTypes] ([ID], [Name]) VALUES (NEWID(), 'Linux')
    PRINT 'Inserted OS Type: Linux'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[OSTypes] WHERE Name = 'macOS')
BEGIN
    INSERT INTO [dbo].[OSTypes] ([ID], [Name]) VALUES (NEWID(), 'macOS')
    PRINT 'Inserted OS Type: macOS'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[OSTypes] WHERE Name = 'Unix')
BEGIN
    INSERT INTO [dbo].[OSTypes] ([ID], [Name]) VALUES (NEWID(), 'Unix')
    PRINT 'Inserted OS Type: Unix'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[OSTypes] WHERE Name = 'Other')
BEGIN
    INSERT INTO [dbo].[OSTypes] ([ID], [Name]) VALUES (NEWID(), 'Other')
    PRINT 'Inserted OS Type: Other'
END
GO
