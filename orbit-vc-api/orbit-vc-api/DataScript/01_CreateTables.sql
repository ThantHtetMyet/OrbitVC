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

-- =============================================
-- DEVICE LOOKUP TABLES
-- =============================================

/****** Object:  Table [dbo].[OSTypes] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OSTypes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[OSTypes](
        [ID] [uniqueidentifier] NOT NULL,
        [Name] [nvarchar](100) NOT NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        CONSTRAINT [PK_OSTypes] PRIMARY KEY CLUSTERED ([ID] ASC)
    )
END
GO

/****** Object:  Table [dbo].[DeviceTypes] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DeviceTypes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DeviceTypes](
        [ID] [uniqueidentifier] NOT NULL,
        [Name] [nvarchar](100) NOT NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        CONSTRAINT [PK_DeviceTypes] PRIMARY KEY CLUSTERED ([ID] ASC)
    )
END
GO

/****** Object:  Table [dbo].[ConnectionTypes] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ConnectionTypes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ConnectionTypes](
        [ID] [uniqueidentifier] NOT NULL,
        [Name] [nvarchar](100) NOT NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        CONSTRAINT [PK_ConnectionTypes] PRIMARY KEY CLUSTERED ([ID] ASC)
    )
END
GO

/****** Object:  Table [dbo].[IPAddressTypes] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[IPAddressTypes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[IPAddressTypes](
        [ID] [uniqueidentifier] NOT NULL,
        [Name] [nvarchar](100) NOT NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        CONSTRAINT [PK_IPAddressTypes] PRIMARY KEY CLUSTERED ([ID] ASC)
    )
END
GO

/****** Object:  Table [dbo].[ConnectionStatusTypes] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ConnectionStatusTypes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ConnectionStatusTypes](
        [ID] [uniqueidentifier] NOT NULL,
        [Name] [nvarchar](100) NOT NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        CONSTRAINT [PK_ConnectionStatusTypes] PRIMARY KEY CLUSTERED ([ID] ASC)
    )
END
GO

-- =============================================
-- DEVICE MAIN TABLES
-- =============================================

/****** Object:  Table [dbo].[Devices] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Devices]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Devices](
        [ID] [uniqueidentifier] NOT NULL,
        [ConnectionTypeID] [uniqueidentifier] NULL,
        [DeviceTypeID] [uniqueidentifier] NULL,
        [Name] [nvarchar](100) NOT NULL,
        [HostName] [nvarchar](200) NULL,
        [OSTypeID] [uniqueidentifier] NULL,
        [Remark] [nvarchar](200) NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        [CreatedDate] [datetime] NOT NULL DEFAULT GETDATE(),
        [UpdatedDate] [datetime] NULL,
        [CreatedBy] [uniqueidentifier] NULL,
        [UpdatedBy] [uniqueidentifier] NULL,
        CONSTRAINT [PK_Devices] PRIMARY KEY CLUSTERED ([ID] ASC)
    )

    ALTER TABLE [dbo].[Devices] WITH CHECK ADD CONSTRAINT [FK_Devices_ConnectionTypes] 
        FOREIGN KEY([ConnectionTypeID]) REFERENCES [dbo].[ConnectionTypes] ([ID])
    
    ALTER TABLE [dbo].[Devices] WITH CHECK ADD CONSTRAINT [FK_Devices_DeviceTypes] 
        FOREIGN KEY([DeviceTypeID]) REFERENCES [dbo].[DeviceTypes] ([ID])
    
    ALTER TABLE [dbo].[Devices] WITH CHECK ADD CONSTRAINT [FK_Devices_OSTypes] 
        FOREIGN KEY([OSTypeID]) REFERENCES [dbo].[OSTypes] ([ID])
END
GO

/****** Object:  Table [dbo].[DeviceIPAddresses] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DeviceIPAddresses]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DeviceIPAddresses](
        [ID] [uniqueidentifier] NOT NULL,
        [DeviceID] [uniqueidentifier] NOT NULL,
        [IPAddressTypeID] [uniqueidentifier] NULL,
        [IPAddress] [nvarchar](100) NOT NULL,
        [Description] [nvarchar](100) NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        CONSTRAINT [PK_DeviceIPAddresses] PRIMARY KEY CLUSTERED ([ID] ASC)
    )

    ALTER TABLE [dbo].[DeviceIPAddresses] WITH CHECK ADD CONSTRAINT [FK_DeviceIPAddresses_Devices] 
        FOREIGN KEY([DeviceID]) REFERENCES [dbo].[Devices] ([ID])
    
    ALTER TABLE [dbo].[DeviceIPAddresses] WITH CHECK ADD CONSTRAINT [FK_DeviceIPAddresses_IPAddressTypes] 
        FOREIGN KEY([IPAddressTypeID]) REFERENCES [dbo].[IPAddressTypes] ([ID])
END
GO

/****** Object:  Table [dbo].[DeviceInterfaces] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DeviceInterfaces]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DeviceInterfaces](
        [ID] [uniqueidentifier] NOT NULL,
        [DeviceID] [uniqueidentifier] NOT NULL,
        [Name] [nvarchar](100) NOT NULL,
        [MACAddress] [nvarchar](100) NULL,
        [IPAddress] [nvarchar](20) NULL,
        [SubnetMask] [nvarchar](20) NULL,
        [SpeedMbps] [nvarchar](20) NULL,
        [IsEnabled] [bit] NOT NULL DEFAULT 1,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        CONSTRAINT [PK_DeviceInterfaces] PRIMARY KEY CLUSTERED ([ID] ASC)
    )

    ALTER TABLE [dbo].[DeviceInterfaces] WITH CHECK ADD CONSTRAINT [FK_DeviceInterfaces_Devices] 
        FOREIGN KEY([DeviceID]) REFERENCES [dbo].[Devices] ([ID])
END
GO

/****** Object:  Table [dbo].[DeviceIPAddressConnectionStatus] ******/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DeviceIPAddressConnectionStatus]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DeviceIPAddressConnectionStatus](
        [ID] [uniqueidentifier] NOT NULL,
        [DeviceIPAddressID] [uniqueidentifier] NOT NULL,
        [ConnectionStatusTypeID] [uniqueidentifier] NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        [LastCheckedDate] [datetime] NULL,
        CONSTRAINT [PK_DeviceIPAddressConnectionStatus] PRIMARY KEY CLUSTERED ([ID] ASC)
    )

    ALTER TABLE [dbo].[DeviceIPAddressConnectionStatus] WITH CHECK ADD CONSTRAINT [FK_DeviceIPAddressConnectionStatus_DeviceIPAddresses] 
        FOREIGN KEY([DeviceIPAddressID]) REFERENCES [dbo].[DeviceIPAddresses] ([ID])
    
    ALTER TABLE [dbo].[DeviceIPAddressConnectionStatus] WITH CHECK ADD CONSTRAINT [FK_DeviceIPAddressConnectionStatus_ConnectionStatusTypes] 
        FOREIGN KEY([ConnectionStatusTypeID]) REFERENCES [dbo].[ConnectionStatusTypes] ([ID])
END
GO
