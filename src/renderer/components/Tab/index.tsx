import React from "react";
import cn from "classnames";

interface ITabProps {
  value: string;
  options: {
    label: string;
    value: string;
  }[];
  defaultValue: string;
  onChange: (v: string) => void;
}

const Tab: React.FC<ITabProps> = (props) => {
  const { value, onChange, options = [], defaultValue } = props;
  const targetValue = value || defaultValue;
  return (
    <div className="nocalhost-tab">
      {(options || []).map((item) => {
        return (
          <button
            key={item.value}
            className={cn(
              "nocalhost-tab-item",
              targetValue === item.value && "nocalhost-tab-item-active"
            )}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tab;
