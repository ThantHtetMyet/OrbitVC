USE [OrbitVC]
GO

-- =============================================
-- INSERT DEVICE TYPES
-- =============================================

IF NOT EXISTS (SELECT 1 FROM [dbo].[DeviceTypes] WHERE Name = 'Server')
BEGIN
    INSERT INTO [dbo].[DeviceTypes] ([ID], [Name]) VALUES (NEWID(), 'Server')
    PRINT 'Inserted Device Type: Server'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[DeviceTypes] WHERE Name = 'Windows')
BEGIN
    INSERT INTO [dbo].[DeviceTypes] ([ID], [Name]) VALUES (NEWID(), 'Windows')
    PRINT 'Inserted Device Type: Windows'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[DeviceTypes] WHERE Name = 'Router')
BEGIN
    INSERT INTO [dbo].[DeviceTypes] ([ID], [Name]) VALUES (NEWID(), 'Router')
    PRINT 'Inserted Device Type: Router'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[DeviceTypes] WHERE Name = 'Switch')
BEGIN
    INSERT INTO [dbo].[DeviceTypes] ([ID], [Name]) VALUES (NEWID(), 'Switch')
    PRINT 'Inserted Device Type: Switch'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[DeviceTypes] WHERE Name = 'Firewall')
BEGIN
    INSERT INTO [dbo].[DeviceTypes] ([ID], [Name]) VALUES (NEWID(), 'Firewall')
    PRINT 'Inserted Device Type: Firewall'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[DeviceTypes] WHERE Name = 'Virtual Machine')
BEGIN
    INSERT INTO [dbo].[DeviceTypes] ([ID], [Name]) VALUES (NEWID(), 'Virtual Machine')
    PRINT 'Inserted Device Type: Virtual Machine'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[DeviceTypes] WHERE Name = 'Other')
BEGIN
    INSERT INTO [dbo].[DeviceTypes] ([ID], [Name]) VALUES (NEWID(), 'Other')
    PRINT 'Inserted Device Type: Other'
END
GO
