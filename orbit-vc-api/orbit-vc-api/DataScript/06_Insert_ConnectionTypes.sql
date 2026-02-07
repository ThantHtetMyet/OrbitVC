USE [OrbitVC]
GO

-- =============================================
-- INSERT CONNECTION TYPES
-- =============================================

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionTypes] WHERE Name = 'ICMP')
BEGIN
    INSERT INTO [dbo].[ConnectionTypes] ([ID], [Name]) VALUES (NEWID(), 'ICMP')
    PRINT 'Inserted Connection Type: ICMP'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionTypes] WHERE Name = 'SSH')
BEGIN
    INSERT INTO [dbo].[ConnectionTypes] ([ID], [Name]) VALUES (NEWID(), 'SSH')
    PRINT 'Inserted Connection Type: SSH'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionTypes] WHERE Name = 'RDP')
BEGIN
    INSERT INTO [dbo].[ConnectionTypes] ([ID], [Name]) VALUES (NEWID(), 'RDP')
    PRINT 'Inserted Connection Type: RDP'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionTypes] WHERE Name = 'Telnet')
BEGIN
    INSERT INTO [dbo].[ConnectionTypes] ([ID], [Name]) VALUES (NEWID(), 'Telnet')
    PRINT 'Inserted Connection Type: Telnet'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionTypes] WHERE Name = 'HTTP')
BEGIN
    INSERT INTO [dbo].[ConnectionTypes] ([ID], [Name]) VALUES (NEWID(), 'HTTP')
    PRINT 'Inserted Connection Type: HTTP'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionTypes] WHERE Name = 'HTTPS')
BEGIN
    INSERT INTO [dbo].[ConnectionTypes] ([ID], [Name]) VALUES (NEWID(), 'HTTPS')
    PRINT 'Inserted Connection Type: HTTPS'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionTypes] WHERE Name = 'FTP')
BEGIN
    INSERT INTO [dbo].[ConnectionTypes] ([ID], [Name]) VALUES (NEWID(), 'FTP')
    PRINT 'Inserted Connection Type: FTP'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionTypes] WHERE Name = 'SFTP')
BEGIN
    INSERT INTO [dbo].[ConnectionTypes] ([ID], [Name]) VALUES (NEWID(), 'SFTP')
    PRINT 'Inserted Connection Type: SFTP'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionTypes] WHERE Name = 'SNMP')
BEGIN
    INSERT INTO [dbo].[ConnectionTypes] ([ID], [Name]) VALUES (NEWID(), 'SNMP')
    PRINT 'Inserted Connection Type: SNMP'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ConnectionTypes] WHERE Name = 'Other')
BEGIN
    INSERT INTO [dbo].[ConnectionTypes] ([ID], [Name]) VALUES (NEWID(), 'Other')
    PRINT 'Inserted Connection Type: Other'
END
GO
