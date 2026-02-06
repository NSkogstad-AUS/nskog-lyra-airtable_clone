import type { TableHTMLAttributes } from "react";
import layoutStyles from "./TanstackTable.module.css";

type Props = TableHTMLAttributes<HTMLTableElement>;

export const TanstackTable = ({ className, ...props }: Props) => {
  const tableClassName = className
    ? `${layoutStyles.tanstackTable} ${className}`
    : layoutStyles.tanstackTable;
  return <table className={tableClassName} {...props} />;
};
