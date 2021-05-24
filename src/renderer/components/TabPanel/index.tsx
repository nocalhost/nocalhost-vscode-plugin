import React from "react";

interface ITabPanelProps {
  name: string;
  value: string;
}

const TabPanel: React.FC<React.PropsWithChildren<ITabPanelProps>> = (props) => {
  const { value, name, children } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== name}
      id={`wrapped-tabpanel-${name}`}
      aria-labelledby={`wrapped-tab-${name}`}
    >
      {value === name && children}
    </div>
  );
};

export default TabPanel;
