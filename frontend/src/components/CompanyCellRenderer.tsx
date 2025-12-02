import type React from 'react';
import type { Company } from '../pages/AgTest';

type Props = {
  value: number | undefined;
  companies: Company[];
};

const CompanyCellRenderer: React.FC<Props> = ({ value, companies }) => {
  if (value === undefined) {
    return <span>-</span>;
  }

  const company = companies.find((c) => c.companyId === value);
  if (!company) {
    return <span>{value}</span>;
  }

  return (
    <span
      className="inline-block rounded px-2 py-1 text-xs font-semibold text-white"
      style={{ backgroundColor: company.bgColor }}
    >
      {company.companyName}
    </span>
  );
};

export default CompanyCellRenderer;


