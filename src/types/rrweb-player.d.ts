declare module 'rrweb-player' {
  interface RRwebPlayerOptions {
    target: HTMLElement;
    props: {
      events: any[];
      width?: number;
      height?: number;
      autoPlay?: boolean;
      showController?: boolean;
      tags?: Record<string, string>;
      skipInactive?: boolean;
      speed?: number;
      mouseTail?: boolean;
      maxScale?: number;
      [key: string]: any;
    };
  }

  interface RRwebPlayerInstance {
    play(): void;
    pause(): void;
    toggle(): void;
    goto(timeOffset: number, play?: boolean): void;
    playRange(start: number, end: number, loop?: boolean, afterHook?: () => void): void;
    setSpeed(speed: number): void;
    toggleSkipInactive(): void;
    triggerResize(): void;
    getMetaData(): { startTime: number; endTime: number; totalTime: number };
    addEvent(event: any): void;
    getReplayer(): any;
    getMirror(): any;
    addEventListener(event: string, handler: (params: any) => void): void;
  }

  interface RRwebPlayerConstructor {
    new (options: RRwebPlayerOptions): RRwebPlayerInstance;
    (options: RRwebPlayerOptions): RRwebPlayerInstance;
  }

  declare const rrwebPlayer: RRwebPlayerConstructor;
  export default rrwebPlayer;
}
