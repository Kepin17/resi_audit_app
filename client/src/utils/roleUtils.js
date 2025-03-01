
export const getRoleColor = (roleId) => {
  const colorMap = {
    BGN001: "green", // picker
    BGN002: "orange", // packing
    BGN003: "cyan", // pickout
    BGN004: "blue", // admin
    BGN005: "red", // superadmin
    BGN006: "purple", // finance
    BGN007: "gold", // fulltime
    BGN008: "lime", // freelance
    BGN009: "#CC7568",
    BGN010: "pink",
  };

  return colorMap[roleId] || "default";
};

/**
 * Find role label from role groups
 */
export const getRoleLabel = (id, roleGroups) => {
  if (!roleGroups) return id;

  // Make sure each array exists before spreading
  const office = Array.isArray(roleGroups?.office) ? roleGroups.office : [];
  const warehouse = Array.isArray(roleGroups?.warehouse) ? roleGroups.warehouse : [];
  const staffType = Array.isArray(roleGroups?.staffType) ? roleGroups.staffType : [];

  const allRoles = [...office, ...warehouse, ...staffType];
  const role = allRoles.find((r) => r.value === id);
  return role ? role.label : id;
};

/**
 * Extract selected roles from staff data
 */
export const extractStaffRoles = (staff, roleGroups) => {
  if (!staff || !staff.bagian_ids || !roleGroups) {
    return { officeRoles: [], warehouseRoles: [], staffTypeRoles: [] };
  }

  const office = Array.isArray(roleGroups?.office) ? roleGroups.office : [];
  const warehouse = Array.isArray(roleGroups?.warehouse) ? roleGroups.warehouse : [];
  const staffType = Array.isArray(roleGroups?.staffType) ? roleGroups.staffType : [];

  return {
    officeRoles: staff.bagian_ids?.filter((id) => office.some((r) => r.value === id)) || [],
    warehouseRoles: staff.bagian_ids?.filter((id) => warehouse.some((r) => r.value === id)) || [],
    staffTypeRoles: staff.bagian_ids?.filter((id) => staffType.some((r) => r.value === id)) || [],
  };
};
