import React from "react";

interface ISelectProps {
  className?: string;
  value: string;
  onChange: (v: string) => void;
  options: {
    label: string;
    value: string;
  }[];
}

const Select: React.FC<ISelectProps> = (props) => {
  const { options, value, onChange, className } = props;
  function handleChange(e: any) {
    if (onChange) {
      const selectedIndex = e.target.options.selectedIndex;
      onChange(options[selectedIndex].value);
    }
  }
  return (
    <select
      placeholder="select context"
      onChange={handleChange}
      className={className}
    >
      {!value && (
        <option disabled selected>
          select context
        </option>
      )}

      {(options || []).map((it) => {
        return (
          <option key={it.value} value={it.value}>
            {it.label}
          </option>
        );
      })}
    </select>
  );
};

export default Select;
