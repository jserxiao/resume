declare module 'chroma-js' {
  interface Color {
    hex(): string;
    rgb(): [number, number, number];
    rgba(): [number, number, number, number];
    hsl(): [number, number, number];
    luminance(): number;
    contrast(color2: Color | string): number;
    mix(color2: Color | string, ratio?: number): Color;
    alpha(a: number): Color;
    css(): string;
    brighten(amount?: number): Color;
    darken(amount?: number): Color;
    saturate(amount?: number): Color;
    desaturate(amount?: number): Color;
  }

  interface ChromaStatic {
    (color: string | [number, number, number] | [number, number, number, number]): Color;
    hsl(h: number, s: number, l: number): Color;
    rgb(r: number, g: number, b: number): Color;
    mix(color1: string | Color, color2: string | Color, ratio?: number): Color;
    contrast(color1: string | Color, color2: string | Color): number;
    luminance(color: string | Color): number;
    valid(color: string): boolean;
  }

  const chroma: ChromaStatic;
  export = chroma;
}
