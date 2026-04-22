import type { ComponentType } from "react";

export interface UIVersion {
  name: string;
  description: string;
  component: ComponentType;
}

export const versions: UIVersion[] = [];
