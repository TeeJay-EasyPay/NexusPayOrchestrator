declare module "@sumsub/react-native-mobilesdk-module" {
  type StatusEvent = { prevStatus?: string; newStatus?: string };
  type Result = { success: boolean; status: string; errorType?: string; errorMsg?: string };
  type Builder = {
    withHandlers(handlers: { onStatusChanged?: (event: StatusEvent) => void }): Builder;
    withLocale(locale: string): Builder;
    withDebug(enabled: boolean): Builder;
    build(): { launch(): Promise<Result>; dismiss(): void };
  };
  const SNSMobileSDK: {
    init(accessToken: string, expirationHandler: () => Promise<string>): Builder;
  };
  export default SNSMobileSDK;
}
