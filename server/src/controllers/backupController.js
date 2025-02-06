const exportBarang = async (req, res) => {
  try {
    // Get data from database
    const [rows] = await mysqlPool.query(`
      SELECT 
        b.resi_id,
        COALESCE(b.status_barang, 'Pending') as status_barang,
        DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(b.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        COALESCE(pek.nama_pekerja, '-') as nama_pekerja,
        CASE 
          WHEN b.status_barang = 'Cancelled' THEN 'Dibatalkan'
          WHEN b.status_barang = 'Pending' THEN 'Menunggu pickup'
          WHEN b.status_barang = 'Picked' THEN 'Sudah dipickup'
          WHEN b.status_barang = 'Packed' THEN 'Sudah dipacking'
          WHEN b.status_barang = 'Shipped' THEN 'Dalam pengiriman'
          ELSE 'Status tidak diketahui'
        END as status_description
      FROM barang b
      LEFT JOIN proses p ON b.resi_id = p.resi_id
      LEFT JOIN pekerja pek ON p.id_pekerja = pek.id_pekerja
      ORDER BY b.created_at DESC
    `);

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No data to export",
      });
    }

    // Create workbook and worksheet
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Barang");

    // Define columns
    worksheet.columns = [
      { header: "Nomor Resi", key: "resi_id", width: 20 },
      { header: "Status", key: "status_description", width: 25 },
      { header: "Tanggal Dibuat", key: "created_at", width: 25 },
      { header: "Terakhir Update", key: "updated_at", width: 25 },
      { header: "Pekerja", key: "nama_pekerja", width: 25 },
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add rows
    rows.forEach((row) => {
      worksheet.addRow({
        resi_id: row.resi_id,
        status_description: row.status_description,
        created_at: row.created_at,
        updated_at: row.updated_at,
        nama_pekerja: row.nama_pekerja,
      });
    });

    // Auto fit columns
    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: "middle", horizontal: "left" };
    });

    // Set response headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=data_barang_${moment().format("YYYY-MM-DD_HH-mm")}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).send({
      success: false,
      message: "Error exporting data",
      error: error.message,
    });
  }
};
