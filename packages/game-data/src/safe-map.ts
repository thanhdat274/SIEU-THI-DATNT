/**
 * Bảng tra cứu theo id không có prototype: `MAP['constructor']`/`MAP['__proto__']` trả về undefined
 * thay vì thuộc tính của Object, nên id lạ từ client/co-op/save luôn bị coi là "không tồn tại".
 */
export function nullProto<T extends object>(map: T): T {
  return Object.setPrototypeOf(map, null) as T;
}
