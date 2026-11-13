import { describe, expect, it } from 'vitest';
import { decodeSaveCode, encodeSaveCode } from '../core/saveCode';
import { newGameData } from '../core/store';
import type { SaveData } from '../core/save';

const sample = () => ({ ...newGameData(), day: 12, money: 345678, level: 9 }) as unknown as SaveData;

describe('mã chuyển máy', () => {
  it('xuất rồi nhập lại ra đúng bản lưu', async () => {
    const code = await encodeSaveCode(sample());
    expect(code.startsWith('TH3D1.')).toBe(true);
    const r = await decodeSaveCode(code);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.data.day).toBe(12); expect(r.data.money).toBe(345678); expect(r.data.level).toBe(9); }
  });
  it('chịu được xuống dòng/khoảng trắng khi dán', async () => {
    const code = await encodeSaveCode(sample());
    const r = await decodeSaveCode(`  ${code.slice(0, 40)}\n${code.slice(40)}  `);
    expect(r.ok).toBe(true);
  });
  it('mã bị cắt thì báo lỗi, không nạp', async () => {
    const code = await encodeSaveCode(sample());
    const r = await decodeSaveCode(code.slice(0, code.length - 10));
    expect(r.ok).toBe(false);
  });
  it('chuỗi lạ thì báo lỗi', async () => {
    expect((await decodeSaveCode('hello')).ok).toBe(false);
    expect((await decodeSaveCode('')).ok).toBe(false);
  });
});
