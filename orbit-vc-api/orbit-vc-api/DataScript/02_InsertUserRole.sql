USE [OrbitVC]
GO

DECLARE @AdminRoleID UNIQUEIDENTIFIER = NEWID()
DECLARE @UserRoleID UNIQUEIDENTIFIER = NEWID()

-- Insert Admin Role if not exists
IF NOT EXISTS (SELECT 1 FROM [dbo].[UserRoles] WHERE RoleName = 'Admin')
BEGIN
    INSERT INTO [dbo].[UserRoles] ([ID], [RoleName], [Description], [CreatedDate])
    VALUES (@AdminRoleID, 'Admin', 'Administrator with full access', GETDATE())
    PRINT 'Inserted Admin Role'
END

-- Insert User Role if not exists
IF NOT EXISTS (SELECT 1 FROM [dbo].[UserRoles] WHERE RoleName = 'User')
BEGIN
    INSERT INTO [dbo].[UserRoles] ([ID], [RoleName], [Description], [CreatedDate])
    VALUES (@UserRoleID, 'User', 'Standard user with limited access', GETDATE())
    PRINT 'Inserted User Role'
END
GO
