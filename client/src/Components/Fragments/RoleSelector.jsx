import React from "react";
import { Form, Checkbox, Space } from "antd";

const RoleSelector = ({ roleGroups = {} }) => {
  return (
    <Form.Item label="Roles" required>
      <Space direction="vertical" style={{ width: "100%" }}>
        <div>
          <h4 className="font-bold">Office Roles:</h4>
          <Form.Item name={["roles", "office"]} noStyle>
            <Checkbox.Group options={roleGroups.office || []} />
          </Form.Item>
        </div>

        <div>
          <h4 className="font-bold">Warehouse Roles:</h4>
          <Form.Item name={["roles", "warehouse"]} noStyle>
            <Checkbox.Group options={roleGroups.warehouse || []} />
          </Form.Item>
        </div>

        <div>
          <h4 className="font-bold flex gap-1">
            Staff Type <span className="text-red-500 ">*</span>
          </h4>
          <Form.Item name={["roles", "staffType"]} noStyle rules={[{ required: true, message: "Please select a staff type!" }]}>
            <Checkbox.Group options={roleGroups.staffType || []} />
          </Form.Item>
        </div>
      </Space>
    </Form.Item>
  );
};

export default RoleSelector;
