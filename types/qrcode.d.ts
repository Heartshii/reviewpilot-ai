declare module "qrcode" {
  type ColorOptions = {
    dark?: string;
    light?: string;
  };

  type BaseOptions = {
    width?: number;
    margin?: number;
    color?: ColorOptions;
  };

  export function toDataURL(
    text: string,
    options?: BaseOptions
  ): Promise<string>;

  export function toString(
    text: string,
    options?: BaseOptions & { type?: "svg" | "utf8" | "terminal" }
  ): Promise<string>;

  const QRCode: {
    toDataURL: typeof toDataURL;
    toString: typeof toString;
  };

  export default QRCode;
}
