const mysqlPool = require("../config/db");

const showAllRoleByGroup = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(
      `
      SELECT 
      rolegroup.role_group_name,
      bagian.jenis_pekerja,
      bagian.id_bagian
      FROM rolegroup
      JOIN bagian ON rolegroup.id_bagian = bagian.id_bagian
      `
    );

    if (rows.length === 0) {
      res.status(404).send({
        success: false,
        message: "Role group not found",
        error: "role_group_not_found",
      });
      return;
    }

    const roleMap = {};

    rows.forEach((row) => {
      const { role_group_name, jenis_pekerja, id_bagian } = row;

      if (!roleMap[role_group_name]) {
        roleMap[role_group_name] = {
          role_group_name,
          detail: [],
        };
      }

      roleMap[role_group_name].detail.push({ jenis_pekerja, id_bagian });
    });

    const result = Object.values(roleMap);

    res.status(200).send({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      success: false,
      message: "Error when trying to show all role by group",
      error: "internal_server_error",
    });
  }
};

module.exports = {
  showAllRoleByGroup,
};
