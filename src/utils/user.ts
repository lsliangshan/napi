export function encodeId(id: string | number) {
  return 3333333333 - ~Number(`${id}`) << 2 & 0x7FFFFFFF
}

export function decodeId(decodedId: string | number) {
  return ~(((3333333333 - Number(`${decodedId}`)) | 0xFFFFFFFF80000000) >> 2)
}