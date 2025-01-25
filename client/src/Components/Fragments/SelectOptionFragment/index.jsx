import React from "react";
import Select from "../../Elements/Select";
import Option from "../../Elements/Option";

const SelectOptionFragment = ({ name, options, onChange }) => {
  return (
    <Select name={name} onChange={onChange}>
      {options.map((option, index) => (
        <Option optionValue={option.value} key={index} disabled={option.disabled}>
          {option.label}
        </Option>
      ))}
    </Select>
  );
};

export default SelectOptionFragment;
