import type { ReactNode } from "react";
import layoutStyles from "./TablesTabHeader.module.css";

type Props = {
  children: ReactNode;
};

export const TablesTabHeader = ({ children }: Props) => (
  <div className={layoutStyles.tablesTabHeader}>{children}</div>
);
