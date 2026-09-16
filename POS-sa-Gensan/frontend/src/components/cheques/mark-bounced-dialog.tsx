"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChequeStatus } from "@/lib/types";

type Props = {
  chequeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isOwner: boolean;
};

export function MarkBouncedDialog({
  chequeId,
  open,
  onOpenChange,
  onSuccess,
  isOwner,
}: Props) {
  const [reason, setReason] = useState("");
  const [penalty, setPenalty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!chequeId) return;
    if (!reason.trim()) {
      toast.error("Bounce reason is required");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/cheques/${chequeId}/status`, {
        status: ChequeStatus.Bounced,
        reason: reason.trim(),
        penaltyAmount: isOwner ? parseFloat(penalty) || 0 : 0,
        notes: notes.trim() || undefined,
      });
      toast.success("Cheque marked bounced — balance remains open");
      setReason("");
      setPenalty("");
      setNotes("");
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Mark cheque as bounced</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          The invoice stays unpaid. This is not counted as collected cash. A bounced
          cheque history record will be saved for risk monitoring.
        </p>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Reason *</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Insufficient funds, account closed"
            />
          </div>
          {isOwner && (
            <div className="space-y-1">
              <Label>Penalty fee (optional)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={penalty}
                onChange={(e) => setPenalty(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Added to customer receivable balance and ledger.
              </p>
            </div>
          )}
          <div className="space-y-1">
            <Label>Internal notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void submit()} disabled={saving}>
            Confirm bounced
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
