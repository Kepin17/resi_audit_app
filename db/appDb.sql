-- Active: 1738167577342@@127.0.0.1@3306@db_pack

-- CREATE DATABASE pack_db;
USE db_pack;




CREATE TABLE BAGIAN (
  id_bagian VARCHAR(7) PRIMARY KEY NOT NULL,
  jenis_pekerja ENUM('picker', 'packing', 'pickout') NOT NULL CHECK (jenis_pekerja IN ('picker', 'packing', 'pickout')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT CheckBagian1 CHECK (CHAR_LENGTH(id_bagian) = 6),
  CONSTRAINT CheckBagian2 CHECK (id_bagian REGEXP '^BGN[0-9]{3}$')
);


INSERT INTO BAGIAN (id_bagian, jenis_pekerja) VALUES
  ('BGN001', 'picker'),
  ('BGN002', 'packing'),
  ('BGN003', 'pickout')



CREATE TABLE pekerja (
    id_pekerja VARCHAR(9) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    nama_pekerja VARCHAR(100) NOT NULL,
    id_bagian VARCHAR(6) NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('superadmin', 'admin', 'staff') DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_bagian) REFERENCES bagian(id_bagian),
    CONSTRAINT CheckPekerja CHECK (id_pekerja REGEXP '^PKJ[0-9]{5}$')
);

ALTER TABLE pekerja
ADD COLUMN last_device_info JSON,
ADD COLUMN last_ip VARCHAR(45),
ADD COLUMN last_login TIMESTAMP NULL;


DELIMITER $$

CREATE TRIGGER trg_generate_id_pekerja
BEFORE INSERT ON pekerja
FOR EACH ROW
BEGIN
    DECLARE new_id VARCHAR(9);
    DECLARE last_id INT;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(id_pekerja, 4) AS UNSIGNED)), 0)
    INTO last_id 
    FROM pekerja;
    
    SET new_id = CONCAT('PKJ', LPAD(last_id + 1, 5, '0'));
    SET NEW.id_pekerja = new_id;
END$$

DELIMITER ;




-- Status tracking table
CREATE TABLE status_logs (
    id_status_log INT AUTO_INCREMENT PRIMARY KEY,
    id_pekerja VARCHAR(9),
    is_online BOOLEAN DEFAULT FALSE,
    last_activity TIMESTAMP,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja) ON DELETE CASCADE ON UPDATE CASCADE
);


-- Create device_logs table
CREATE TABLE device_logs (
    id_log INT PRIMARY KEY AUTO_INCREMENT,
    id_pekerja VARCHAR(10),
    ip_address VARCHAR(45),
    device_info JSON,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja)
);

DELIMITER $$

CREATE TRIGGER trg_log_device_access
AFTER INSERT ON device_logs
FOR EACH ROW
BEGIN
    UPDATE pekerja 
    SET last_device_info = NEW.device_info,
        last_ip = NEW.ip_address,
        last_login = NEW.login_time
    WHERE id_pekerja = NEW.id_pekerja;
END$$

DELIMITER ;

DELIMITER $$

-- Cleanup procedure for old logs
CREATE PROCEDURE cleanup_old_logs()
BEGIN
    -- Keep last 30 days of logs
    DELETE FROM device_logs 
    WHERE logged_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    DELETE FROM status_logs 
    WHERE logged_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END$$

-- Schedule cleanup event
CREATE EVENT evt_cleanup_logs
ON SCHEDULE EVERY 1 DAY
DO CALL cleanup_old_logs()$$

DELIMITER ;


-- DROP TABLE BARANG

CREATE TABLE barang (
  resi_id VARCHAR(20) PRIMARY KEY NOT NULL UNIQUE,
  status_barang ENUM('pending', 'cancelled', 'ready', 'picked', 'packed', "shipped") DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
DELIMITER $$

-- Trigger for INSERT
CREATE TRIGGER trg_add_id_proses_to_barang_insert
AFTER INSERT ON proses
FOR EACH ROW
BEGIN
    UPDATE barang
    SET id_proses = NEW.id_proses
    WHERE resi_id = NEW.resi_id;
END$$

-- Trigger for UPDATE
CREATE TRIGGER trg_add_id_proses_to_barang_update
AFTER UPDATE ON proses
FOR EACH ROW
BEGIN
    UPDATE barang
    SET id_proses = NEW.id_proses
    WHERE resi_id = NEW.resi_id;
END$$

DELIMITER ;

-- Create proses table
CREATE TABLE PROSES (
  id_proses int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  resi_id VARCHAR(20),
  id_pekerja VARCHAR(8),
  status_proses VARCHAR(10) NOT NULL CHECK (status_proses IN ('picker', 'packing', 'pickout')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT FK_Pekerja FOREIGN KEY (id_pekerja) REFERENCES PEKERJA(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT FK_Proses FOREIGN KEY (resi_id) REFERENCES Barang(resi_id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Now add the foreign key to barang table
ALTER TABLE barang
ADD COLUMN id_proses INT NULL,
ADD CONSTRAINT FK_PROSES_BARANG FOREIGN KEY (id_proses) REFERENCES proses(id_proses) ON UPDATE CASCADE ON DELETE SET NULL;


CREATE TABLE LOG_PROSES (
  id_log INT PRIMARY KEY AUTO_INCREMENT,
  resi_id VARCHAR(20),
  id_pekerja VARCHAR(8),
  status_proses VARCHAR(10) NOT NULL CHECK (status_proses IN ('picker', 'packing', 'pickout')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT FK_PekerjaLog FOREIGN KEY (id_pekerja) REFERENCES PEKERJA(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT FK_BarangLog FOREIGN KEY (resi_id) REFERENCES Barang(resi_id) ON UPDATE CASCADE ON DELETE SET NULL
);


-- DROP TRIGGER IF EXISTS trigger_barang_status;

DELIMITER $$
CREATE TRIGGER trigger_barang_status
AFTER UPDATE ON PROSES
FOR EACH ROW

BEGIN
  
    IF  NEW.status_proses = "packing" THEN
        UPDATE barang
        SET status_barang = 'packed'
        WHERE resi_id = NEW.resi_id;
    END IF;

    IF NEW.status_proses = 'pickout' THEN
        
        UPDATE barang 
        SET status_barang = 'shipped' 
        WHERE resi_id = NEW.resi_id;   
    END IF;
  
END$$

DELIMITER ;

-- DROP TRIGGER IF EXISTS trigger_inssert_log_proses;

DELIMITER $$


CREATE TRIGGER trigger_inssert_log_proses
AFTER INSERT ON PROSES
FOR EACH ROW
BEGIN
    
    INSERT INTO LOG_PROSES (resi_id, id_pekerja, status_proses)
    VALUES (NEW.resi_id, NEW.id_pekerja, NEW.status_proses);

      IF NEW.status_proses = "picker" THEN
        UPDATE barang
        SET status_barang = 'picked'
        WHERE resi_id = NEW.resi_id;
    END IF;

END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trigger_after_update_log_proses
AFTER UPDATE ON PROSES
FOR EACH ROW
BEGIN
    
    INSERT INTO LOG_PROSES (resi_id, id_pekerja, status_proses)
    VALUES (NEW.resi_id, NEW.id_pekerja, NEW.status_proses);

END$$

DELIMITER ;





-- DROP TABLE IF EXISTS gaji_pegawai;
-- DROP TABLE IF EXISTS gaji;

CREATE TABLE gaji (
    id_gaji INT AUTO_INCREMENT PRIMARY KEY,
    total_gaji_per_scan DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO gaji (total_gaji_per_scan) 
VALUES (1500.00)


-- Create new gaji_pegawai table
CREATE TABLE gaji_pegawai (
    id_gaji_pegawai INT AUTO_INCREMENT PRIMARY KEY,
    id_gaji INT,
    id_pekerja VARCHAR(9),
    jumlah_scan INT DEFAULT 0,
    gaji_total DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_gaji) REFERENCES gaji(id_gaji),
    FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja)
);

ALTER TABLE gaji_pegawai ADD COLUMN is_dibayar BOOLEAN DEFAULT FALSE;


-- DROP TRIGGER IF EXISTS trigger_hitung_gaji

DELIMITER $$

CREATE TRIGGER trigger_hitung_gaji
AFTER INSERT ON LOG_PROSES
FOR EACH ROW
BEGIN
    DECLARE v_id_gaji INT;
    DECLARE v_gaji_per_scan DECIMAL(10, 2);
    DECLARE v_last_update DATE;
    DECLARE v_jenis_pekerja ENUM('picker', 'packing', 'pickout');
    
    -- Get the current active salary configuration
    SELECT id_gaji, total_gaji_per_scan 
    INTO v_id_gaji, v_gaji_per_scan
    FROM gaji 
    LIMIT 1;
    
    -- Get the jenis_pekerja for this worker
    SELECT b.jenis_pekerja INTO v_jenis_pekerja
    FROM pekerja p
    JOIN bagian b ON p.id_bagian = b.id_bagian
    WHERE p.id_pekerja = NEW.id_pekerja
    LIMIT 1;
    
    -- Only update salary if jenis_pekerja is 'packing'
    IF v_jenis_pekerja = 'packing' THEN
        -- Get the last update date for this worker
        SELECT DATE(created_at) INTO v_last_update
        FROM gaji_pegawai 
        WHERE id_pekerja = NEW.id_pekerja 
        AND DATE(created_at) = CURRENT_DATE()
        LIMIT 1;
        
        -- If record exists for today, update it
        IF v_last_update = CURRENT_DATE() THEN
            UPDATE gaji_pegawai 
            SET jumlah_scan = jumlah_scan + 1,
                gaji_total = (jumlah_scan + 1) * v_gaji_per_scan,
                updated_at = NOW()
            WHERE id_gaji = v_id_gaji 
            AND id_pekerja = NEW.id_pekerja
            AND DATE(created_at) = CURRENT_DATE();
        ELSE
            -- If no record for today, create new one
            INSERT INTO gaji_pegawai (id_gaji, id_pekerja, jumlah_scan, gaji_total)
            VALUES (v_id_gaji, NEW.id_pekerja, 1, v_gaji_per_scan);
        END IF;
    END IF;
END$$

DELIMITER ;


