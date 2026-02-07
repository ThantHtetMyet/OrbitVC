USE [OrbitVC]
GO

-- =============================================
-- INSERT CONNECTION STATUS TYPES
-- =============================================

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionStatusTypes] WHERE Name = 'UP')
BEGIN
    INSERT INTO [dbo].[ConnectionStatusTypes] ([ID], [Name]) VALUES (NEWID(), 'UP')
    PRINT 'Inserted Connection Status Type: UP'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionStatusTypes] WHERE Name = 'DOWN')
BEGIN
    INSERT INTO [dbo].[ConnectionStatusTypes] ([ID], [Name]) VALUES (NEWID(), 'DOWN')
    PRINT 'Inserted Connection Status Type: DOWN'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionStatusTypes] WHERE Name = 'Unknown')
BEGIN
    INSERT INTO [dbo].[ConnectionStatusTypes] ([ID], [Name]) VALUES (NEWID(), 'Unknown')
    PRINT 'Inserted Connection Status Type: Unknown'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionStatusTypes] WHERE Name = 'Maintenance')
BEGIN
    INSERT INTO [dbo].[ConnectionStatusTypes] ([ID], [Name]) VALUES (NEWID(), 'Maintenance')
    PRINT 'Inserted Connection Status Type: Maintenance'
END
GO
