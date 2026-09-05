"use client";

import { ErrorFallbackPage } from "@/components/errors/error-fallback-page";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  return <ErrorFallbackPage error={error} reset={reset} />;
}
