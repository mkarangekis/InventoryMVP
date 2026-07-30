import { redirect } from "next/navigation";
import { OPERATIONS_LOGIN_PATH } from "@/operations/auth/redirect";

export default function OperationsLoginPage() {
  redirect(OPERATIONS_LOGIN_PATH);
}
