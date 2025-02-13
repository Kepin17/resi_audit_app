-- Active: 1739431700514@@127.0.0.1@3306

CREATE DATABASE pack_db;
USE pack_db;


-- DROP TABLE IF EXISTS barang, proses, log_proses, gaji_pegawai, gaji, status_logs, device_logs;

CREATE TABLE BAGIAN (
  id_bagian VARCHAR(7) PRIMARY KEY NOT NULL,
  jenis_pekerja ENUM('picker', 'packing', 'pickout', "admin", "superadmin") NOT NULL CHECK (jenis_pekerja IN ('picker', 'packing', 'pickout', "admin", "superadmin")),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT CheckBagian1 CHECK (CHAR_LENGTH(id_bagian) = 6),
  CONSTRAINT CheckBagian2 CHECK (id_bagian REGEXP '^BGN[0-9]{3}$')
);


INSERT INTO BAGIAN (id_bagian, jenis_pekerja) VALUES
  ('BGN001', 'picker'),
  ('BGN002', 'packing'),
  ('BGN003', 'pickout'),
  ('BGN004', 'admin'),
  ('BGN005', 'superadmin');



CREATE TABLE pekerja (
    id_pekerja VARCHAR(9) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    nama_pekerja VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT CheckPekerja CHECK (id_pekerja REGEXP '^PKJ[0-9]{5}$')
);

CREATE TABLE role_pekerja (
    id_role INT AUTO_INCREMENT PRIMARY KEY,
    id_pekerja VARCHAR(9),
    id_bagian VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_bagian) REFERENCES bagian(id_bagian) ON DELETE CASCADE ON UPDATE CASCADE
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
    FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja) ON DELETE CASCADE ON UPDATE CASCADE
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



-- DROP TABLE barang, COMMENT proses, log_proses, gaji_pegawai;

CREATE TABLE barang (
  resi_id VARCHAR(20) PRIMARY KEY NOT NULL UNIQUE,
  status_barang ENUM('pending', 'cancelled', 'ready', 'picked', 'packed', "shipped", "konfirmasi") DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);



-- Create proses table
CREATE TABLE proses (
  id_proses int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  resi_id VARCHAR(20),
  id_pekerja VARCHAR(9),
  status_proses VARCHAR(10) NOT NULL CHECK (status_proses IN ('picker', 'packing', 'pickout', 'konfirmasi', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT FK_Pekerja_proses FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT FK_Proses_resi FOREIGN KEY (resi_id) REFERENCES barang(resi_id) ON UPDATE CASCADE ON DELETE SET NULL
);
-- Now add the foreign key to barang table
ALTER TABLE barang
ADD COLUMN id_proses INT NULL,
ADD CONSTRAINT FK_PROSES_BARANG FOREIGN KEY (id_proses) REFERENCES proses(id_proses) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE proses ADD COLUMN gambar_resi VARCHAR(255) NULL ;


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



CREATE TABLE log_proses (
  id_log INT PRIMARY KEY AUTO_INCREMENT,
  resi_id VARCHAR(20),
  id_pekerja VARCHAR(9), 
  status_proses VARCHAR(10) NOT NULL CHECK (status_proses IN ('picker', 'packing', 'pickout', 'konfirmasi', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  gambar_resi VARCHAR(255) NULL,
  CONSTRAINT FK_PekerjaLog FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT FK_BarangLog FOREIGN KEY (resi_id) REFERENCES barang(resi_id) ON UPDATE CASCADE ON DELETE SET NULL
);


-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_barang_status;
DROP TRIGGER IF EXISTS trigger_inssert_log_proses;
DROP TRIGGER IF EXISTS trigger_after_update_log_proses;

-- Create new trigger for logging only
DELIMITER $$

CREATE TRIGGER trigger_after_process_change
AFTER INSERT ON proses
FOR EACH ROW
BEGIN    
    INSERT INTO log_proses (resi_id, id_pekerja, status_proses, gambar_resi)
    VALUES (NEW.resi_id, NEW.id_pekerja, NEW.status_proses, NEW.gambar_resi);
END$$

DELIMITER ;




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


DELIMITER $$

-- DROP TRIGGER IF EXISTS trigger_hitung_gaji$$

CREATE TRIGGER trigger_hitung_gaji
AFTER INSERT ON log_proses
FOR EACH ROW
BEGIN
    DECLARE v_id_gaji INT;
    DECLARE v_gaji_per_scan DECIMAL(10, 2);
    DECLARE v_existing_record INT;
    
    -- Get current gaji settings
    SELECT id_gaji, total_gaji_per_scan 
    INTO v_id_gaji, v_gaji_per_scan
    FROM gaji 
    LIMIT 1;
    
    -- Only calculate salary if:
    -- 1. Worker has packing role
    -- 2. The process status is 'packing'
    IF EXISTS (
        SELECT 1 FROM role_pekerja rp
        JOIN bagian b ON rp.id_bagian = b.id_bagian
        WHERE rp.id_pekerja = NEW.id_pekerja
        AND b.jenis_pekerja = 'packing'
    ) AND NEW.status_proses = 'packing' THEN
        -- Check if there's an existing record for today
        SELECT COUNT(*) INTO v_existing_record
        FROM gaji_pegawai
        WHERE id_pekerja = NEW.id_pekerja
        AND DATE(created_at) = CURDATE()
        AND is_dibayar = FALSE;

        IF v_existing_record > 0 THEN
            -- Update existing record
            UPDATE gaji_pegawai
            SET jumlah_scan = jumlah_scan + 1,
                gaji_total = (jumlah_scan + 1) * v_gaji_per_scan,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_pekerja = NEW.id_pekerja
            AND DATE(created_at) = CURDATE()
            AND is_dibayar = FALSE;
        ELSE
            -- Create new record for today
            INSERT INTO gaji_pegawai (id_gaji, id_pekerja, jumlah_scan, gaji_total, created_at)
            VALUES (v_id_gaji, NEW.id_pekerja, 1, v_gaji_per_scan, CURRENT_TIMESTAMP);
        END IF;
    END IF;
END$$

DELIMITER ;

-- Add trigger to prevent deleting last role
DELIMITER $$

CREATE TRIGGER before_delete_role_pekerja
BEFORE DELETE ON role_pekerja
FOR EACH ROW
BEGIN
    DECLARE role_count INT;
    
    -- Count remaining roles for this worker
    SELECT COUNT(*) INTO role_count
    FROM role_pekerja
    WHERE id_pekerja = OLD.id_pekerja;
    
    -- If this is the last role, prevent deletion
    IF role_count <= 1 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot delete the last role for a worker';
    END IF;
END$$

DELIMITER ;

-- Add trigger to prevent having no roles on update
DELIMITER $$

CREATE TRIGGER before_update_role_pekerja
BEFORE UPDATE ON role_pekerja
FOR EACH ROW
BEGIN
    DECLARE role_count INT;
    
    -- Count remaining roles for this worker
    SELECT COUNT(*) INTO role_count
    FROM role_pekerja
    WHERE id_pekerja = NEW.id_pekerja;
    
    -- If this would leave no roles, prevent update
    IF role_count = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Worker must have at least one role';
    END IF;
END$$

DELIMITER ;




