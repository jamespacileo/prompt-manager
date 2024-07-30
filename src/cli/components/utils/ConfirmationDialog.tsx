import { Box, Text, useInput } from "ink";

interface ConfirmationDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  message,
  onConfirm,
  onCancel,
}) => {
  useInput((input) => {
    if (input === "y") {
      onConfirm();
    } else if (input === "n") {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="yellow">{message}</Text>
      <Text>Press (Y) to confirm or (N) to cancel</Text>
    </Box>
  );
};
