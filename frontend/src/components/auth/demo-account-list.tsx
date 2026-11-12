"use client";

import { useState } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react/ssr";

import { DemoAccountCard } from "@/components/auth/demo-account-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toApiError } from "@/lib/api/client";
import { signIn } from "@/lib/api/session";
import { DEMO_PASSWORD, demoAccounts, type DemoAccount } from "@/lib/data/demo-accounts";
import type { AppRole } from "@/lib/types";

/** Daftar kartu akun demo. Kartu masuk lewat API dengan kata sandi akun demo. */
export function DemoAccountList() {
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSelect(account: DemoAccount) {
    setErrorMessage(null);
    setPendingRole(account.role);
    try {
      await signIn(account.email, DEMO_PASSWORD);
    } catch (error) {
      setPendingRole(null);
      setErrorMessage(toApiError(error).message);
    }
  }

  return (
    <div className="flex max-w-[672px] flex-col gap-4 pt-2">
      {errorMessage ? (
        <Alert variant="destructive">
          <WarningCircleIcon aria-hidden />
          <AlertTitle>Belum bisa masuk</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2">
        {demoAccounts.map((account) => (
          <li key={account.role} className="flex">
            <DemoAccountCard
              account={account}
              pending={pendingRole === account.role}
              disabled={pendingRole !== null}
              onSelect={handleSelect}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
