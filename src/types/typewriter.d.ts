declare module 'typewriter-effect/dist/core' {
  export default class Typewriter {
    constructor(element: HTMLElement, options: any);
    typeString(string: string): this;
    pauseFor(ms: number): this;
    deleteAll(): this;
    start(): this;
    stop(): void;
  }
} 