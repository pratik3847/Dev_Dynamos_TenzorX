import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutDialog = ({ isOpen, onConfirm, onCancel }: Props) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card border border-border/60 shadow-elevated p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <LogOut className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Sign out of Healthcare Navigator?</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Your current search session will be cleared. Your profile and history are safely saved.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" className="rounded-xl" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onConfirm}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};
