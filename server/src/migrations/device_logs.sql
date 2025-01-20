DROP TRIGGER IF EXISTS trg_log_device_access;
DROP TABLE IF EXISTS device_logs;

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
