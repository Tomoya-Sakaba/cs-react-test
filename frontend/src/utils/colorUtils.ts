/**
 * カラーコードから適切な文字色（白または黒）を判定する関数
 * @param backgroundColor - 背景色のカラーコード（6桁の16進数、例: "#FF0000" または "FF0000"）
 * @returns 文字色のカラーコード（"#ffffff" または "#000000"）
 */
export const getTextColor = (backgroundColor: string): string => {
  if (!backgroundColor) return '#000000';

  // #を除去して16進数を取得
  const hex = backgroundColor.replace('#', '');

  // 6桁の16進数でない場合は黒を返す
  if (hex.length !== 6) {
    return '#000000';
  }

  // RGB値を取得
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 相対輝度を計算（W3Cの推奨式）
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // 閾値0.5より暗い場合は白文字、明るい場合は黒文字
  return luminance < 0.5 ? '#ffffff' : '#000000';
};
