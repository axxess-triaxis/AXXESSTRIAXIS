declare module "mixpanel-browser" {
  type MixpanelOptions = {
    debug?: boolean;
    ignore_dnt?: boolean;
    persistence?: "cookie" | "localStorage";
    secure_cookie?: boolean;
    track_pageview?: boolean;
  };

  type MixpanelBrowser = {
    init(token: string, options?: MixpanelOptions): void;
    track(eventName: string, properties?: Record<string, unknown>): void;
    identify(userId: string): void;
    reset(): void;
    people: {
      set(properties: Record<string, unknown>): void;
    };
  };

  const mixpanel: MixpanelBrowser;
  export default mixpanel;
}
