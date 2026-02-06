import type { ReactNode } from "react";
import layoutStyles from "./ViewBar.module.css";

type Props = {
  children: ReactNode;
};

export const ViewBar = ({ children }: Props) => (
  <div className={layoutStyles.viewBar}>{children}</div>
);
