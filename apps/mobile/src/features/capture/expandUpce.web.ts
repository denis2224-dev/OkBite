export function expandUpce(raw: string): string {
  if (!/^[01]\d{7}$/.test(raw)) return '';
  const system = raw.slice(0, 1), data = raw.slice(1, 7), last = data.slice(-1), check = raw.slice(-1);
  if ('012'.includes(last)) return system + data.slice(0, 2) + last + '0000' + data.slice(2, 5) + check;
  if (last === '3') return system + data.slice(0, 3) + '00000' + data.slice(3, 5) + check;
  if (last === '4') return system + data.slice(0, 4) + '00000' + data.slice(4, 5) + check;
  return system + data.slice(0, 5) + '0000' + last + check;
}
