-- Active: 1739431700514@@127.0.0.1@3306

CREATE DATABASE siar_db;
use siar_db;


CREATE TABLE BAGIAN (
  id_bagian VARCHAR(7) PRIMARY KEY NOT NULL,
  jenis_pekerja ENUM('picker', 'packing', 'pickout', "admin", "superadmin", "finance", "fulltime", "freelance", "retur_barang") NOT NULL CHECK (jenis_pekerja IN ('picker', 'packing', 'pickout', "admin", "superadmin", "finance", "fulltime", "freelance", "retur_barang")),
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
  ('BGN005', 'superadmin'),
  ('BGN006', 'finance');


INSERT INTO BAGIAN (id_bagian, jenis_pekerja) VALUES
  ('BGN007', 'fulltime'),
  ('BGN008', 'freelance');



INSERT INTO BAGIAN (id_bagian, jenis_pekerja) VALUES
  ('BGN009', 'retur_barang');

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




CREATE TABLE barang (
  resi_id VARCHAR(20) PRIMARY KEY NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


use siar_db;


CREATE TABLE ekpedisi (
    id_ekspedisi VARCHAR(3) PRIMARY KEY NOT NULL,
    nama_ekspedisi VARCHAR(50) NOT NULL,
    CHECK (id_ekspedisi IN ("JNE", "JTR", "JNT", "JCG", "GJK")),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)

INSERT INTO ekpedisi (id_ekspedisi, nama_ekspedisi) VALUES
 
    ('GJK', 'Gojek');


ALTER TABLE barang ADD COLUMN id_ekspedisi VARCHAR(3) NULL;

-- Create proses table
CREATE TABLE proses (
  id_proses int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  resi_id VARCHAR(20),
  id_pekerja VARCHAR(9),
  status_proses VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status_proses IN ('pending','picker', 'packing', 'pickout', 'konfirmasi', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT FK_Pekerja_proses FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT FK_Proses_resi FOREIGN KEY (resi_id) REFERENCES barang(resi_id) ON UPDATE CASCADE ON DELETE SET NULL
);

use siar_db;

ALTER TABLE proses 
MODIFY COLUMN status_proses VARCHAR(10) NOT NULL DEFAULT 'pending';

ALTER TABLE proses 
MODIFY COLUMN status_proses VARCHAR(10) NOT NULL DEFAULT 'pending' 
CHECK (status_proses IN ('pending','picker', 'packing', 'pickout', 'konfirmasi', 'cancelled', 'validated'));



ALTER TABLE proses ADD COLUMN gambar_resi VARCHAR(255) NULL ;

DELIMITER $$
CREATE TRIGGER trg_to_insert_status_proses 
AFTER INSERT ON barang
FOR EACH ROW
BEGIN
    INSERT INTO proses (resi_id, status_proses)
    VALUES (NEW.resi_id, 'pending');
END$$
DELIMITER ;




CREATE TABLE log_proses (
  id_log INT PRIMARY KEY AUTO_INCREMENT,
  resi_id VARCHAR(20),
  id_pekerja VARCHAR(9), 
  status_proses VARCHAR(10) NOT NULL CHECK (status_proses IN ('pending', 'picker', 'packing', 'pickout', 'konfirmasi', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  gambar_resi VARCHAR(255) NULL,
  CONSTRAINT FK_PekerjaLog FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT FK_BarangLog FOREIGN KEY (resi_id) REFERENCES barang(resi_id) ON UPDATE CASCADE ON DELETE SET NULL
);



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
ALTER TABLE gaji_pegawai ADD INDEX idx_salary_calc (id_pekerja, created_at, is_dibayar);

use siar_db;
DELIMITER $$


CREATE TRIGGER trg_delete_barang_after_delete_proses
AFTER DELETE ON proses
FOR EACH ROW
BEGIN
    DELETE FROM barang
    WHERE resi_id = OLD.resi_id;
END$$


DELIMITER $$

CREATE TRIGGER trigger_hitung_gaji
AFTER INSERT ON log_proses
FOR EACH ROW
BEGIN
    DECLARE v_id_gaji INT;
    DECLARE v_gaji_per_scan DECIMAL(10, 2);
    DECLARE v_existing_record INT;
    DECLARE v_current_scan INT;
    
    -- Get current gaji settings
    SELECT id_gaji, total_gaji_per_scan 
    INTO v_id_gaji, v_gaji_per_scan
    FROM gaji 
    LIMIT 1;
    
    -- Only calculate salary if:
    -- 1. Worker has packing role
    -- 2. Worker is NOT fulltime
    -- 3. The process status is 'packing'
    IF EXISTS (
        SELECT 1 FROM role_pekerja rp
        JOIN bagian b ON rp.id_bagian = b.id_bagian
        WHERE rp.id_pekerja = NEW.id_pekerja
        AND b.jenis_pekerja = 'packing'
        AND NOT EXISTS (
            SELECT 1 FROM role_pekerja rp2
            JOIN bagian b2 ON rp2.id_bagian = b2.id_bagian
            WHERE rp2.id_pekerja = NEW.id_pekerja
            AND b2.jenis_pekerja = 'fulltime'
        )
    ) AND NEW.status_proses = 'packing' THEN
        -- Check if there's an existing record for today
        SELECT COUNT(*) INTO v_existing_record
        FROM gaji_pegawai
        WHERE id_pekerja = NEW.id_pekerja
        AND DATE(created_at) = CURDATE()
        AND is_dibayar = FALSE;

        IF v_existing_record > 0 THEN
            -- Get current scan count first
            SELECT jumlah_scan INTO v_current_scan
            FROM gaji_pegawai
            WHERE id_pekerja = NEW.id_pekerja
            AND DATE(created_at) = CURDATE()
            AND is_dibayar = FALSE;
            
            -- Update existing record
            UPDATE gaji_pegawai
            SET jumlah_scan = v_current_scan + 1,
                gaji_total = (v_current_scan + 1) * v_gaji_per_scan,
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


use siar_db;

DELIMITER $$

CREATE TRIGGER trg_update_salary_on_proses_cancelled
AFTER INSERT ON log_proses 
FOR EACH ROW
BEGIN
    DECLARE v_id_gaji INT;
    DECLARE v_gaji_per_scan DECIMAL(10, 2);
    DECLARE v_existing_record INT;
    DECLARE v_new_scan_count INT;
    DECLARE v_packing_worker_id VARCHAR(9);
    
    -- Get current gaji settings
    SELECT id_gaji, total_gaji_per_scan 
    INTO v_id_gaji, v_gaji_per_scan
    FROM gaji 
    LIMIT 1;
    
    -- Get the worker who did the packing
    SELECT id_pekerja INTO v_packing_worker_id
    FROM log_proses
    WHERE resi_id = NEW.resi_id 
    AND status_proses = 'packing'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Only update salary if:
    -- 1. There was a packing worker found
    -- 2. The process status is "cancelled"
    IF v_packing_worker_id IS NOT NULL AND NEW.status_proses = 'cancelled' THEN
        -- Check if there's an existing salary record for the packing worker
        SELECT COUNT(*) INTO v_existing_record
        FROM gaji_pegawai
        WHERE id_pekerja = v_packing_worker_id
        AND DATE(created_at) = CURDATE()
        AND is_dibayar = FALSE;

        IF v_existing_record > 0 THEN
            -- Calculate new scan count
            SET v_new_scan_count = (
                SELECT GREATEST(jumlah_scan - 1, 0)
                FROM gaji_pegawai
                WHERE id_pekerja = v_packing_worker_id
                AND DATE(created_at) = CURDATE()
                AND is_dibayar = FALSE
                LIMIT 1
            );
            
            -- Update existing record with correct calculations
            UPDATE gaji_pegawai
            SET jumlah_scan = v_new_scan_count,
                gaji_total = v_new_scan_count * v_gaji_per_scan,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_pekerja = v_packing_worker_id
            AND DATE(created_at) = CURDATE()
            AND is_dibayar = FALSE;
        END IF;
    END IF;
END$$

DELIMITER ;

-- Add trigger to prevent deleting last role
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
END
DELIMITER ;



ALTER TABLE proses ADD INDEX idx_created_at (created_at);
ALTER TABLE proses ADD INDEX idx_status_process (status_proses);
ALTER TABLE proses ADD INDEX idx_worker_status (id_pekerja, status_proses);
ALTER TABLE proses ADD INDEX idx_log_proses (id_pekerja, status_proses);

DELIMITER $$

-- use siar_db;
-- use db_pack;

-- Single trigger for new barang that creates initial process
CREATE TRIGGER trg_barang_after_insert
AFTER INSERT ON barang
FOR EACH ROW
BEGIN
    -- Insert initial process with pending status
    INSERT INTO proses (resi_id, status_proses)
    VALUES (NEW.resi_id, 'pending');
END$$

use  siar_db;

DELIMITER ;
-- Single trigger to handle all process logging
CREATE TRIGGER trg_proses_log_changes
AFTER UPDATE ON proses
FOR EACH ROW
BEGIN
    -- Only log when status changes and is not the initial pending status
    IF NEW.status_proses != OLD.status_proses AND 
       (NEW.status_proses != 'pending' OR OLD.status_proses != 'pending') THEN
        INSERT INTO log_proses (
            resi_id, 
            id_pekerja, 
            status_proses, 
            gambar_resi
        )
        VALUES (
            NEW.resi_id,
            NEW.id_pekerja,
            NEW.status_proses,
            NEW.gambar_resi
        );
    END IF;
END$$

DELIMITER ;


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
END

DELIMITER ;

use siar_db;




CREATE TABLE barang_retur (
    resi_id VARCHAR(20) PRIMARY KEY NOT NULL UNIQUE,
    id_ekspedisi VARCHAR(3) NULL,
    note VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_EkspedisiRetur FOREIGN KEY (id_ekspedisi) 
        REFERENCES ekpedisi(id_ekspedisi) ON UPDATE CASCADE ON DELETE SET NULL
);



CREATE TABLE proses_barang_retur (
    id_proses INT AUTO_INCREMENT PRIMARY KEY,
    resi_id VARCHAR(20),
    id_pekerja VARCHAR(9),
    status_retur ENUM("diproses",'hilang', "diterima") NOT NULL DEFAULT 'diproses' CHECK (status_retur IN ('diproses', 'hilang', 'diterima')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    gambar_retur VARCHAR(255) NULL,
    CONSTRAINT FK_BarangRetur FOREIGN KEY (resi_id) 
        REFERENCES barang_retur(resi_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT FK_PekerjaRetur FOREIGN KEY (id_pekerja) 
        REFERENCES pekerja(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL    
);

ALTER TABLE proses_barang_retur ADD note VARCHAR(255) NULL;




CREATE TABLE log_retur (
    id_log INT AUTO_INCREMENT PRIMARY KEY,
    resi_id VARCHAR(20),
    id_pekerja VARCHAR(9),
    status_retur VARCHAR(10) NOT NULL CHECK (status_retur IN ('diproses','hilang', 'diterima')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    gambar_retur VARCHAR(255) NULL,
    CONSTRAINT FK_BarangLogRetur FOREIGN KEY (resi_id) 
        REFERENCES barang_retur(resi_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT FK_PekerjaLogRetur FOREIGN KEY (id_pekerja) 
        REFERENCES pekerja(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL
)


DELIMITER $$
CREATE TRIGGER trg_to_insert_status_retur
AFTER INSERT ON barang_retur
FOR EACH ROW
BEGIN
    INSERT INTO proses_barang_retur (resi_id, status_retur)
    VALUES (NEW.resi_id, 'diproses');
END$$
DELIMITER ;

-- Fix the trigger to use log_retur instead of log_proses
DELIMITER $$
CREATE TRIGGER trg_proses_retur_log_changes
AFTER UPDATE ON proses_barang_retur
FOR EACH ROW
BEGIN
    IF NEW.status_retur != OLD.status_retur AND 
       (NEW.status_retur != 'diproses' OR OLD.status_retur != 'diproses') THEN
        INSERT INTO log_retur (
            resi_id, 
            id_pekerja, 
            status_retur, 
            gambar_retur
        )
        VALUES (
            NEW.resi_id,
            NEW.id_pekerja,
            NEW.status_retur,
            NEW.gambar_retur
        );
    END IF;
END$$
DELIMITER ;

use siar_db;
DELIMITER $$
CREATE TRIGGER trg_update_resi_status_after_proses_retur
AFTER UPDATE ON proses_barang_retur
FOR EACH ROW
BEGIN
    -- Update barang_retur status when proses_barang_retur status changes
    UPDATE barang_retur
    SET status_retur = "diterima"
    WHERE resi_id = NEW.resi_id AND OLD.status_retur = "diproses";
END$$

DELIMITER ;


DELIMITER $$
CREATE TRIGGER delete_barang_retur_after_delete_proses_retur
AFTER DELETE ON proses_barang_retur
FOR EACH ROW
BEGIN
    DELETE FROM barang_retur
    WHERE resi_id = OLD.resi_id;
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER add_to_log_retur_after_insert_proses_retur
AFTER INSERT ON proses_barang_retur
FOR EACH ROW
BEGIN
    INSERT INTO log_retur (resi_id, id_pekerja, status_retur, gambar_retur)
    VALUES (NEW.resi_id, NEW.id_pekerja, NEW.status_retur, NEW.gambar_retur);
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER update_log_retur_after_update_proses_retur
AFTER UPDATE ON proses_barang_retur
FOR EACH ROW
BEGIN
    INSERT INTO log_retur (resi_id, id_pekerja, status_retur, gambar_retur)
    VALUES (NEW.resi_id, NEW.id_pekerja, NEW.status_retur, NEW.gambar_retur);
END$$
DELIMITER ;

use siar_db;
SHOW CREATE TABLE log_retur;


CREATE TABLE log_import (
    id_log INT AUTO_INCREMENT PRIMARY KEY,
    resi_id VARCHAR(20),
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

CREATE TABLE log_import_retur (
    id_log INT AUTO_INCREMENT PRIMARY KEY,
    resi_id VARCHAR(20),
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

ALTER TABLE log_import_retur ADD COLUMN status ENUM('success', 'failed', 'duplikat') NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'duplikat'));

CREATE TABLE kode_resi (
    id_kode_resi INT AUTO_INCREMENT PRIMARY KEY,
    id_ekspedisi VARCHAR(3),
    id_resi VARCHAR(3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_KodeResiEkspedisi FOREIGN KEY (id_ekspedisi) REFERENCES ekpedisi(id_ekspedisi) ON UPDATE CASCADE ON DELETE SET NULL
)

INSERT INTO kode_resi (id_ekspedisi, id_resi) VALUES
    ('JNE', 'TG'),
    ('JNE', 'CM'),
    ('JNT', 'JP'),
    ('JNT', 'JX'),
    ('JTR', 'JT'),
    ('GJK', 'GK')



CREATE TABLE roleGroup (
    id_role_group INT AUTO_INCREMENT PRIMARY KEY,
    role_group_name VARCHAR(50) NOT NULL,
    id_bagian VARCHAR(7) ,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_RoleGroupBagian FOREIGN KEY (id_bagian) REFERENCES bagian(id_bagian) ON UPDATE CASCADE ON DELETE SET NULL
)


-- Office role groups
INSERT INTO roleGroup (role_group_name, id_bagian) VALUES 
('office', 'BGN005'),
('office', 'BGN004'),
('office', 'BGN006'),
('office', 'BGN010'),
('office', 'BGN011');

-- Warehouse role groups
INSERT INTO roleGroup (role_group_name, id_bagian) VALUES 
('warehouse', 'BGN001'),
('warehouse', 'BGN002'),
('warehouse', 'BGN003'),
('warehouse', 'BGN009');

-- Staff Type role groups
INSERT INTO roleGroup (role_group_name, id_bagian) VALUES 
('staff_type', 'BGN007'),
('staff_type', 'BGN008');

CREATE TABLE configTable (
    id_config INT AUTO_INCREMENT PRIMARY KEY,
    config_name VARCHAR(50) NOT NULL,
    config_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)

use siar_db;


DELIMITER //

CREATE TRIGGER `trg_destroy_gaji_after_cancel`
AFTER DELETE ON `log_proses_packing`
FOR EACH ROW
BEGIN
    DECLARE v_id_gaji INT;
    DECLARE v_gaji_per_scan DECIMAL(10, 2);
    DECLARE v_existing_record INT;
    DECLARE v_new_scan_count INT;
    DECLARE v_packing_worker_id VARCHAR(9);

    -- Ambil ID pekerja yang melakukan packing dari log_proses_packing
    SET v_packing_worker_id = OLD.id_pekerja;

    -- Hanya lanjut jika pekerja ditemukan
    IF v_packing_worker_id IS NOT NULL THEN
        -- Ambil pengaturan gaji terbaru
        SELECT id_gaji, total_gaji_per_scan 
        INTO v_id_gaji, v_gaji_per_scan 
        FROM gaji 
        LIMIT 1;

        -- Periksa apakah sudah ada catatan gaji hari ini yang belum dibayar
        SELECT COUNT(*) 
        INTO v_existing_record 
        FROM gaji_pegawai 
        WHERE id_pekerja = v_packing_worker_id 
          AND DATE(created_at) = CURDATE() 
          AND is_dibayar = FALSE;

        IF v_existing_record > 0 THEN
            -- Ambil jumlah scan yang ada, minimal 0
            SELECT GREATEST(jumlah_scan - 1, 0) 
            INTO v_new_scan_count 
            FROM gaji_pegawai 
            WHERE id_pekerja = v_packing_worker_id 
              AND DATE(created_at) = CURDATE() 
              AND is_dibayar = FALSE
            LIMIT 1;

            -- Update jumlah scan dan total gaji di gaji_pegawai
            UPDATE gaji_pegawai 
            SET jumlah_scan = v_new_scan_count,
                gaji_total = v_new_scan_count * v_gaji_per_scan,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_pekerja = v_packing_worker_id 
              AND DATE(created_at) = CURDATE() 
              AND is_dibayar = FALSE;
        END IF;
    END IF;
END;

DELIMITER ;



CREATE TABLE log_proses_picker (
  resi_id_picker  VARCHAR(35) PRIMARY KEY NOT NULL,
  id_pekerja VARCHAR(9), 
  status_proses VARCHAR(10) NOT NULL CHECK (status_proses IN ('picker')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  gambar_resi VARCHAR(255) NULL,
  CONSTRAINT FK_PekerjaLogPicker FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL
);


-- Untuk log_proses_packing
CREATE TABLE log_proses_packing (
  resi_id_packing VARCHAR(35) PRIMARY KEY NOT NULL,
  id_pekerja VARCHAR(9), 
  status_proses VARCHAR(10) NOT NULL CHECK (status_proses IN ('packing')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  gambar_resi VARCHAR(255) NULL,
  CONSTRAINT FK_PekerjaLogPacking FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Untuk log_proses_pickout
CREATE TABLE log_proses_pickout (
  resi_id_pickout VARCHAR(35) PRIMARY KEY NOT NULL,
  id_pekerja VARCHAR(9), 
  status_proses VARCHAR(10) NOT NULL CHECK (status_proses IN ('pickout')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  gambar_resi VARCHAR(255) NULL,
  CONSTRAINT FK_PekerjaLogPickout FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Untuk log_proses_cancelled
CREATE TABLE log_proses_cancelled (
  resi_id_cancelled VARCHAR(35) PRIMARY KEY NOT NULL,
  id_pekerja VARCHAR(9), 
  status_proses VARCHAR(10) NOT NULL CHECK (status_proses IN ('cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  gambar_resi VARCHAR(255) NULL,
  CONSTRAINT FK_PekerjaLogCancelled FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Untuk log_proses_validated
CREATE TABLE log_proses_validated (
  resi_id_validated VARCHAR(35) PRIMARY KEY NOT NULL,
  id_pekerja VARCHAR(9), 
  status_proses VARCHAR(10) NOT NULL CHECK (status_proses IN ('konfirmasi')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  gambar_resi VARCHAR(255) NULL,
  CONSTRAINT FK_PekerjaLogValidated FOREIGN KEY (id_pekerja) REFERENCES pekerja(id_pekerja) ON UPDATE CASCADE ON DELETE SET NULL
);




CREATE TABLE log_proses (
    id_log VARCHAR (35) PRIMARY KEY NOT NULL,
    resi_id_picker VARCHAR(35),
    resi_id_packing VARCHAR(35),
    resi_id_pickout VARCHAR(35),
    resi_id_cancelled VARCHAR(35),
    resi_id_validated VARCHAR(35),
    CONSTRAINT FK_ResiPicker FOREIGN KEY (resi_id_picker) REFERENCES barang(resi_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT FK_ResiPacking FOREIGN KEY (resi_id_packing) REFERENCES barang(resi_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT FK_ResiPickout FOREIGN KEY (resi_id_pickout) REFERENCES barang(resi_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT FK_ResiCancelled FOREIGN KEY (resi_id_cancelled) REFERENCES barang(resi_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT FK_ResiValidated FOREIGN KEY (resi_id_validated) REFERENCES barang(resi_id) ON UPDATE CASCADE ON DELETE SET NULL
);


