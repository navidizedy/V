"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { useToast } from "@/components/toast-provider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPwaButton({ mobile = false }: { mobile?: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) setInstalled(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    toast.info(
      isIos
        ? "برای نصب ون جا، دکمه Share مرورگر را بزنید و Add to Home Screen را انتخاب کنید."
        : "از منوی مرورگر گزینه Install app یا افزودن به صفحه اصلی را انتخاب کنید."
    );
  };

  return (
    <button
      onClick={install}
      className={
        mobile
          ? "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors"
          : "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-orange-700 bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors"
      }
    >
      {mobile ? <Smartphone className="w-4 h-4" /> : <Download className="w-4 h-4" />}
      نسخه PWA
    </button>
  );
}
