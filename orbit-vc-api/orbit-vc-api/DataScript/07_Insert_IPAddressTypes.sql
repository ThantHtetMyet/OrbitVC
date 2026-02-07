USE [OrbitVC]
GO

-- =============================================
-- INSERT IP ADDRESS TYPES
-- =============================================

IF NOT EXISTS (SELECT 1 FROM [dbo].[IPAddressTypes] WHERE Name = 'Network-01')
BEGIN
    INSERT INTO [dbo].[IPAddressTypes] ([ID], [Name]) VALUES (NEWID(), 'Network-01')
    PRINT 'Inserted IP Address Type: Network-01'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[IPAddressTypes] WHERE Name = 'Network-02')
BEGIN
    INSERT INTO [dbo].[IPAddressTypes] ([ID], [Name]) VALUES (NEWID(), 'Network-02')
    PRINT 'Inserted IP Address Type: Network-02'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[IPAddressTypes] WHERE Name = 'Network-03')
BEGIN
    INSERT INTO [dbo].[IPAddressTypes] ([ID], [Name]) VALUES (NEWID(), 'Network-03')
    PRINT 'Inserted IP Address Type: Network-03'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[IPAddressTypes] WHERE Name = 'Network-04')
BEGIN
    INSERT INTO [dbo].[IPAddressTypes] ([ID], [Name]) VALUES (NEWID(), 'Network-04')
    PRINT 'Inserted IP Address Type: Network-04'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[IPAddressTypes] WHERE Name = 'Network-05')
BEGIN
    INSERT INTO [dbo].[IPAddressTypes] ([ID], [Name]) VALUES (NEWID(), 'Network-05')
    PRINT 'Inserted IP Address Type: Network-05'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[IPAddressTypes] WHERE Name = 'Network-06')
BEGIN
    INSERT INTO [dbo].[IPAddressTypes] ([ID], [Name]) VALUES (NEWID(), 'Network-06')
    PRINT 'Inserted IP Address Type: Network-06'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[IPAddressTypes] WHERE Name = 'Network-07')
BEGIN
    INSERT INTO [dbo].[IPAddressTypes] ([ID], [Name]) VALUES (NEWID(), 'Network-07')
    PRINT 'Inserted IP Address Type: Network-07'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[IPAddressTypes] WHERE Name = 'Network-08')
BEGIN
    INSERT INTO [dbo].[IPAddressTypes] ([ID], [Name]) VALUES (NEWID(), 'Network-08')
    PRINT 'Inserted IP Address Type: Network-08'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[IPAddressTypes] WHERE Name = 'Network-09')
BEGIN
    INSERT INTO [dbo].[IPAddressTypes] ([ID], [Name]) VALUES (NEWID(), 'Network-09')
    PRINT 'Inserted IP Address Type: Network-09'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[IPAddressTypes] WHERE Name = 'Network-10')
BEGIN
    INSERT INTO [dbo].[IPAddressTypes] ([ID], [Name]) VALUES (NEWID(), 'Network-10')
    PRINT 'Inserted IP Address Type: Network-10'
END
GO
