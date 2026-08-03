import LoginClient from "./LoginClient";
import { resolveSafeAuthTarget } from "@/operations/auth/redirect";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    mode?: string | string[];
    next?: string | string[];
  }>;
};

const firstValue = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const operationsLogin =
    resolveSafeAuthTarget(firstValue(params.next)) === "/operations";
  const initialMode =
    !operationsLogin && firstValue(params.mode) === "signup"
      ? "signup"
      : "signin";

  return (
    <LoginClient initialMode={initialMode} operationsLogin={operationsLogin} />
  );
}
