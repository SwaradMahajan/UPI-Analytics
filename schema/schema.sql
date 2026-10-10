-- ============================================================
-- UPI Payment Failure & Recovery Analytics — Database Schema
-- Target: MySQL 8.0+ (window functions required)
-- ============================================================

CREATE DATABASE IF NOT EXISTS upi_analytics
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE upi_analytics;

-- -------------------------
-- Users
-- -------------------------
CREATE TABLE IF NOT EXISTS Users (
    user_id              VARCHAR(50)  PRIMARY KEY,
    account_vintage_days INT          NOT NULL,
    primary_psp_app      VARCHAR(30)  NOT NULL,
    home_bank            VARCHAR(30)  NOT NULL,
    city_tier            TINYINT      NOT NULL
);

-- -------------------------
-- Merchants
-- -------------------------
CREATE TABLE IF NOT EXISTS Merchants (
    merchant_id       VARCHAR(50)  PRIMARY KEY,
    merchant_category VARCHAR(50)  NOT NULL,
    merchant_size     VARCHAR(10)  NOT NULL
);

-- -------------------------
-- Transactions
-- -------------------------
CREATE TABLE IF NOT EXISTS Transactions (
    transaction_id   VARCHAR(50)    PRIMARY KEY,
    user_id          VARCHAR(50)    NOT NULL,
    merchant_id      VARCHAR(50)    NOT NULL,
    transaction_time TIMESTAMP      NOT NULL,
    amount           DECIMAL(10,2)  NOT NULL,
    txn_type         VARCHAR(10)    NOT NULL,
    psp_app          VARCHAR(30)    NOT NULL,
    remitter_bank    VARCHAR(30)    NOT NULL,
    funding_source   VARCHAR(20)    NOT NULL,
    status           VARCHAR(10)    NOT NULL,
    failure_code     VARCHAR(40)    DEFAULT NULL,
    FOREIGN KEY (user_id)     REFERENCES Users(user_id),
    FOREIGN KEY (merchant_id) REFERENCES Merchants(merchant_id)
);

CREATE INDEX idx_txn_user_time ON Transactions (user_id, transaction_time);
CREATE INDEX idx_txn_status    ON Transactions (status, failure_code);

-- Verification
SHOW TABLES;
