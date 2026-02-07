USE [OrbitVC]
GO

-- =============================================
-- INSERT IMAGE TYPES
-- =============================================

IF NOT EXISTS (SELECT 1 FROM [dbo].[ImageTypes] WHERE ImageTypeName = 'Profile')
BEGIN
    INSERT INTO [dbo].[ImageTypes] ([ID], [ImageTypeName], [CreatedDate])
    VALUES (NEWID(), 'Profile', GETDATE())
    PRINT 'Inserted Image Type: Profile'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ImageTypes] WHERE ImageTypeName = 'Cover')
BEGIN
    INSERT INTO [dbo].[ImageTypes] ([ID], [ImageTypeName], [CreatedDate])
    VALUES (NEWID(), 'Cover', GETDATE())
    PRINT 'Inserted Image Type: Cover'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ImageTypes] WHERE ImageTypeName = 'Document')
BEGIN
    INSERT INTO [dbo].[ImageTypes] ([ID], [ImageTypeName], [CreatedDate])
    VALUES (NEWID(), 'Document', GETDATE())
    PRINT 'Inserted Image Type: Document'
END
GO
