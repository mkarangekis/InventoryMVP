import type { Metadata } from "next";
import OperationsCenterClient from "./OperationsCenterClient";

export const metadata: Metadata = {
  title: "Operations Center | Pourdex",
  robots: { index: false, follow: false },
};

export default function OperationsPage() {
  return <OperationsCenterClient />;
}
