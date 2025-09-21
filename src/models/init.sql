CREATE TABLE
    IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID ()),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM ('user', 'gate', 'manager', 'admin') DEFAULT 'user',
        fcm VARCHAR(255),
        is_email_verified BOOLEAN DEFAULT FALSE,
        is_phone_verified BOOLEAN DEFAULT FALSE,
        username VARCHAR(255) NOT NULL UNIQUE,
        photo VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE,
        identity_card VARCHAR(50),
        user_name VARCHAR(255),
        gender ENUM ('male', 'female'),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

CREATE TABLE
    IF NOT EXISTS tokens (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID ()),
        token VARCHAR(255) NOT NULL,
        user_id CHAR(36) NOT NULL,
        type ENUM ('refresh', 'resetPassword', 'verifyEmail') NOT NULL,
        expires DATETIME NOT NULL,
        blacklisted BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS checks (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID ()),
        qr_id VARCHAR(255) UNIQUE NOT NULL,
        user_qr_id CHAR(36) NOT NULL,
        user_scan_id CHAR(36) NOT NULL,
        checkType ENUM ('in', 'out') NOT NULL,
        scan_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_qr_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (user_scan_id) REFERENCES users (id) ON DELETE CASCADE
    );