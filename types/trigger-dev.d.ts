// Type declarations for Trigger.dev dependencies
declare module 'esbuild' {
  const esbuild: any;
  export default esbuild;
}

declare module 'defu' {
  function defu(obj: any, ...defaults: any[]): any;
  export default defu;
}

declare module 'ts-essentials' {
  const tsEssentials: any;
  export default tsEssentials;
}

declare module '@trigger.dev/core' {
  const core: any;
  export default core;
}
