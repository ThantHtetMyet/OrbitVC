USE [OrbitNetDB]
GO

-- Insert default Image Types if not exists
DECLARE @ProfileImageID UNIQUEIDENTIFIER = NEWID()
DECLARE @OtherImageID UNIQUEIDENTIFIER = NEWID()

IF NOT EXISTS (SELECT 1 FROM [dbo].[ImageTypes] WHERE ImageTypeName = 'Profile')
BEGIN
    INSERT INTO [dbo].[ImageTypes] ([ID], [ImageTypeName], [CreatedDate])
    VALUES (@ProfileImageID, 'Profile', GETDATE())
    PRINT 'Inserted Profile Image Type'
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[ImageTypes] WHERE ImageTypeName = 'Other')
BEGIN
    INSERT INTO [dbo].[ImageTypes] ([ID], [ImageTypeName], [CreatedDate])
    VALUES (@OtherImageID, 'Other', GETDATE())
    PRINT 'Inserted Other Image Type'
END

-- Additional default data can be added here
GO
