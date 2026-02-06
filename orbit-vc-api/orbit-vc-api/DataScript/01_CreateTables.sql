USE [OrbitVC]
GO

/****** Object:  Table [dbo].[UserRoles] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserRoles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserRoles](
        [ID] [uniqueidentifier] NOT NULL,
        [RoleName] [nvarchar](50) NOT NULL,
        [Description] [nvarchar](255) NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        [CreatedDate] [datetime] NOT NULL DEFAULT GETDATE(),
        [UpdatedDate] [datetime] NULL,
        [CreatedBy] [uniqueidentifier] NULL,
        [UpdatedBy] [uniqueidentifier] NULL,
        CONSTRAINT [PK_UserRoles] PRIMARY KEY CLUSTERED 
        (
            [ID] ASC
        )
    )
END
GO

/****** Object:  Table [dbo].[Users] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Users](
        [ID] [uniqueidentifier] NOT NULL,
        [UserRoleID] [uniqueidentifier] NOT NULL,
        [UserID] [nvarchar](100) NOT NULL,
        [FirstName] [nvarchar](100) NOT NULL,
        [LastName] [nvarchar](100) NOT NULL,
        [Email] [nvarchar](255) NOT NULL,
        [MobileNo] [nvarchar](20) NULL,
        [LoginPassword] [nvarchar](255) NOT NULL,
        [Remark] [nvarchar](max) NULL,
        [LastLogin] [datetime] NULL,
        [IsActive] [bit] NOT NULL DEFAULT 1,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        [CreatedDate] [datetime] NOT NULL DEFAULT GETDATE(),
        [UpdatedDate] [datetime] NULL,
        [CreatedBy] [uniqueidentifier] NULL,
        [UpdatedBy] [uniqueidentifier] NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED 
        (
            [ID] ASC
        )
    )

    ALTER TABLE [dbo].[Users]  WITH CHECK ADD  CONSTRAINT [FK_Users_UserRoles] FOREIGN KEY([UserRoleID])
    REFERENCES [dbo].[UserRoles] ([ID])
    
    ALTER TABLE [dbo].[Users] CHECK CONSTRAINT [FK_Users_UserRoles]
END
GO

/****** Object:  Table [dbo].[ImageTypes] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ImageTypes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ImageTypes](
        [ID] [uniqueidentifier] NOT NULL,
        [ImageTypeName] [nvarchar](100) NOT NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        [CreatedDate] [datetime] NOT NULL DEFAULT GETDATE(),
        [UpdatedDate] [datetime] NULL,
        [CreatedBy] [uniqueidentifier] NULL,
        [UpdatedBy] [uniqueidentifier] NULL,
        CONSTRAINT [PK_ImageTypes] PRIMARY KEY CLUSTERED 
        (
            [ID] ASC
        )
    )
END
GO

/****** Object:  Table [dbo].[UserImages] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserImages]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserImages](
        [ID] [uniqueidentifier] NOT NULL,
        [UserID] [uniqueidentifier] NOT NULL,
        [ImageTypeID] [uniqueidentifier] NOT NULL,
        [ImageName] [nvarchar](255) NOT NULL,
        [StoredDirectory] [nvarchar](max) NOT NULL,
        [UploadedStatus] [nvarchar](50) NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        [UploadedDate] [datetime] NOT NULL DEFAULT GETDATE(),
        [UploadedBy] [uniqueidentifier] NULL,
        CONSTRAINT [PK_UserImages] PRIMARY KEY CLUSTERED 
        (
            [ID] ASC
        )
    )

    ALTER TABLE [dbo].[UserImages]  WITH CHECK ADD  CONSTRAINT [FK_UserImages_Users] FOREIGN KEY([UserID])
    REFERENCES [dbo].[Users] ([ID])
    
    ALTER TABLE [dbo].[UserImages] CHECK CONSTRAINT [FK_UserImages_Users]

    ALTER TABLE [dbo].[UserImages]  WITH CHECK ADD  CONSTRAINT [FK_UserImages_ImageTypes] FOREIGN KEY([ImageTypeID])
    REFERENCES [dbo].[ImageTypes] ([ID])
    
    ALTER TABLE [dbo].[UserImages] CHECK CONSTRAINT [FK_UserImages_ImageTypes]
END
GO

/****** Object:  Table [dbo].[UserPermissions] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserPermissions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserPermissions](
        [ID] [uniqueidentifier] NOT NULL,
        [UserRoleID] [uniqueidentifier] NOT NULL,
        [ModuleName] [nvarchar](100) NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        [CanCreate] [bit] NOT NULL DEFAULT 0,
        [CanRead] [bit] NOT NULL DEFAULT 0,
        [CanUpdate] [bit] NOT NULL DEFAULT 0,
        [CanDelete] [bit] NOT NULL DEFAULT 0,
        [CreatedDate] [datetime] NOT NULL DEFAULT GETDATE(),
        [UpdatedDate] [datetime] NULL,
        [CreatedBy] [uniqueidentifier] NULL,
        [UpdatedBy] [uniqueidentifier] NULL,
        CONSTRAINT [PK_UserPermissions] PRIMARY KEY CLUSTERED 
        (
            [ID] ASC
        )
    )

    ALTER TABLE [dbo].[UserPermissions]  WITH CHECK ADD  CONSTRAINT [FK_UserPermissions_UserRoles] FOREIGN KEY([UserRoleID])
    REFERENCES [dbo].[UserRoles] ([ID])
    
    ALTER TABLE [dbo].[UserPermissions] CHECK CONSTRAINT [FK_UserPermissions_UserRoles]
END
GO

