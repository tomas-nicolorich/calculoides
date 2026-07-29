import { Alert } from "../../../shared/ui";

interface FormStatusProps {
  success: boolean;
  successMessage: string;
  error: string | null;
}

export function FormStatus({
  success,
  successMessage,
  error,
}: FormStatusProps) {
  return (
    <>
      {success && <Alert tone="success">{successMessage}</Alert>}
      {error && <Alert>{error}</Alert>}
    </>
  );
}
