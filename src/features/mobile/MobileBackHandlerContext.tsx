"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

type BackHandler = () => boolean;

type MobileBackHandlerContextValue = {
  register: (handler: BackHandler) => () => void;
  dispatch: () => boolean;
};

const MobileBackHandlerContext = createContext<MobileBackHandlerContextValue | null>(null);

// MN-4 (2026-08-23): the real mechanism behind Android hardware back-button handling. Only one
// mobile screen is ever mounted at a time (MobileShell renders exactly one native screen per
// active tab -- see MobileShell.tsx), so a single "currently registered" ref is sufficient; no
// stack is needed. A screen with its own list/detail state (Tasks, Meetings, Projects, Approvals,
// Knowledge, Stakeholders) registers a handler that pops its own detail view and returns `true`
// when it did, or `false` when it has nothing further to pop (already at its own list root) --
// `dispatch()` (called by useMobileBackButton in MobileShell) uses that boolean to decide whether
// to stop here or fall through to tab-level back navigation.
export function MobileBackHandlerProvider({ children }: { children: ReactNode }) {
  const currentHandler = useRef<BackHandler | null>(null);

  function register(handler: BackHandler) {
    currentHandler.current = handler;
    return () => {
      if (currentHandler.current === handler) currentHandler.current = null;
    };
  }

  function dispatch() {
    return currentHandler.current?.() ?? false;
  }

  return <MobileBackHandlerContext.Provider value={{ register, dispatch }}>{children}</MobileBackHandlerContext.Provider>;
}

// Called once by MobileShell's own back-button listener. Not exported for screen use -- screens
// use useRegisterMobileBackHandler below instead.
export function useMobileBackDispatch(): () => boolean {
  const context = useContext(MobileBackHandlerContext);
  if (!context) throw new Error("useMobileBackDispatch must be used inside MobileBackHandlerProvider.");
  return context.dispatch;
}

// Called by any mobile screen that has its own internal list/detail navigation state. Registers
// on mount, re-registers whenever `handler` changes (so it always closes over fresh state), and
// unregisters on unmount -- since only one screen is ever mounted, unmount naturally clears the
// slot for whichever screen renders next, with no explicit coordination required.
export function useRegisterMobileBackHandler(handler: BackHandler): void {
  const context = useContext(MobileBackHandlerContext);
  if (!context) throw new Error("useRegisterMobileBackHandler must be used inside MobileBackHandlerProvider.");
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return context.register(() => handlerRef.current());
  }, [context]);
}
