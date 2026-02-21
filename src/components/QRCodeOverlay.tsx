"use client";

import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { X, Copy } from "lucide-react";
import { useState } from "react";

export function QRCodeOverlay({
  shortCode,
  onClose,
}: {
  shortCode: string;
  onClose: () => void;
}) {
  // Replace localhost with network IP so mobile devices on the same WiFi can connect
  function getOrigin() {
    if (typeof window === "undefined") return "";
    const loc = window.location;
    if (loc.hostname === "localhost" || loc.hostname === "127.0.0.1") {
      return `http://${process.env.NEXT_PUBLIC_LOCAL_IP ?? loc.host}`;
    }
    return loc.origin;
  }

  const joinUrl = `${getOrigin()}/join/${shortCode}`;
  const presentUrl = `${getOrigin()}/present/${shortCode}`;

  const [copiedField, setCopiedField] = useState<string | null>(null);

  function handleCopy() {
    navigator.clipboard.writeText(joinUrl);
    setCopiedField("join");
    setTimeout(() => setCopiedField(null), 2000);
  }

  function handleCopyPresent() {
    navigator.clipboard.writeText(presentUrl);
    setCopiedField("present");
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-2xl p-8 shadow-xl max-w-sm w-full mx-4 text-center space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Join this session</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={joinUrl} size={200} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-3xl font-bold font-mono tracking-widest text-primary">
            {shortCode}
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-[10px] text-muted-foreground w-12 text-right">Join</span>
              <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {joinUrl}
              </code>
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <span className="text-[10px] text-muted-foreground w-12 text-right">Present</span>
              <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {presentUrl}
              </code>
              <Button variant="ghost" size="icon" onClick={handleCopyPresent}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {copiedField && (
            <p className="text-xs text-accent">Copied!</p>
          )}
        </div>
      </div>
    </div>
  );
}
