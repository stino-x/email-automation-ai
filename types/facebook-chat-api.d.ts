declare module 'facebook-chat-api' {
  function facebookChatApi(
    credentials: { appState: unknown },
    callback: (err: Error | null, api: unknown) => void
  ): void;

  export = facebookChatApi;
}
