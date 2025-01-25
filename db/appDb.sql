CREATE DATABASE pack_db;
USE pack_db;

-- DROP DATABASE IF EXISTS pack_db;

CREATE TABLE CATEGORY (
  id_category VARCHAR(9) PRIMARY KEY ,
  nama_category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT CheckCategory1 CHECK (CHAR_LENGTH(id_category) = 8),
  CONSTRAINT CheckCategory2 CHECK (id_category REGEXP '^CTG[0-9]{5}$')
)

DELIMITER $$

CREATE TRIGGER trg_generate_id_category
BEFORE INSERT ON CATEGORY
FOR EACH ROW
BEGIN
    DECLARE new_id VARCHAR(9);
    DECLARE last_id INT;

    -- Ambil angka terakhir dari id_category (mengunci tabel untuk menghindari konflik saat multiple input)
    SELECT CAST(SUBSTRING(id_category, 4, 5) AS UNSIGNED)
    INTO last_id
    FROM CATEGORY
    WHERE id_category REGEXP '^CTG[0-9]{5}$'
    ORDER BY id_category DESC
    LIMIT 1;

    -- Jika tidak ada ID, mulai dari 1
    IF last_id IS NULL THEN
        SET last_id = 0;
    END IF;

    -- Tambahkan angka terakhir untuk baris baru
    SET last_id = last_id + 1;

    -- Buat ID baru
    SET new_id = CONCAT('CTG', LPAD(last_id, 5, '0'));

    -- Set nilai ID baru ke kolom id_category
    SET NEW.id_category = new_id;
END$$

DELIMITER ;


INSERT INTO CATEGORY (nama_category) VALUES 
('Elektronik'),
('Fashion'),
('Makanan'),
('Minuman'),
('Buku'),
('Olahraga'),
('Kesehatan');




CREATE TABLE Barang (
  resi_id VARCHAR(20) PRIMARY KEY NOT NULL UNIQUE,
  nama_barang VARCHAR(225) NOT NULL,
  id_category VARCHAR(9),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT FK_Category FOREIGN KEY (id_category) REFERENCES CATEGORY(id_category) ON UPDATE CASCADE ON DELETE SET NULL
);

ALTER TABLE barang
ADD COLUMN STATUS_BARANG ENUM('pending for packing', 'pending for shipment', 'ready for shipment') DEFAULT 'pending for packing';


INSERT INTO Barang (resi_id, nama_barang, id_category) VALUES
  ('RESI001', 'Laptop', 'CTG00001'),
  ('RESI002', 'Baju', 'CTG00002'),
  ('RESI003', 'Mie Instan', 'CTG00003'),
  ('RESI004', 'Teh Botol', 'CTG00004'),
  ('RESI005', 'Buku', 'CTG00005'),
  ('RESI006', 'Raket', 'CTG00006'),
  ('RESI007', 'Masker', 'CTG00007');

-- drop table bagian 

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




-- DROP TABLE  PEKERJA, device_logs  , proses , log_proses, status_logs;


CREATE TABLE pekerja (
    id_pekerja VARCHAR(9) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    nama_pekerja VARCHAR(100) NOT NULL,
    id_bagian VARCHAR(6),
    password VARCHAR(255) NOT NULL,
    role ENUM('superadmin', 'admin', 'staff') NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_bagian) REFERENCES bagian(id_bagian),
    CONSTRAINT check_staff_role CHECK (
        (role = 'admin' AND id_bagian IS NULL) OR
        (role = 'superadmin' AND id_bagian IS NULL) OR
        (role = 'staff' AND id_bagian IS NOT NULL)
    ),
    CONSTRAINT CheckPekerja CHECK (id_pekerja REGEXP '^PKJ[0-9]{5}$')
);

ALTER TABLE pekerja
ADD COLUMN last_device_info JSON,
ADD COLUMN last_ip VARCHAR(45),
ADD COLUMN last_login TIMESTAMP;


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



-- DROP TABLE IF EXISTS device_logs, status_logs;


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

-- drop table proses, log_proses;

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



DELIMITER $$
CREATE TRIGGER trigger_barang_status
AFTER UPDATE ON PROSES
FOR EACH ROW
BEGIN

    IF NEW.status_proses = 'picker' THEN
        UPDATE Barang
        SET STATUS_BARANG = 'pending for packing'
        WHERE resi_id = NEW.resi_id;
    END IF;
   
    IF  NEW.status_proses = "packing" THEN
        UPDATE Barang
        SET STATUS_BARANG = 'pending for shipment'
        WHERE resi_id = NEW.resi_id;
    END IF;

    IF NEW.status_proses = 'pickout' THEN
        UPDATE Barang 
        SET STATUS_BARANG = 'ready for shipment'
        WHERE resi_id = NEW.resi_id;
    END IF;


END$$
DELIMITER ;
