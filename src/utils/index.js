
export const debouncedSort = (func, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

export function isEmpty(v) {
  switch (typeof v) {
    case 'undefined':
      return true
    case 'string':
      if (v.replace(/(^[ \t\n\r]*)|([ \t\n\r]*$)/g, '').length === 0) { return true }
      break
    case 'boolean':
      if (!v) return true
      break
    case 'number':
      if (v === 0 || isNaN(v)) return true
      break
    case 'object':
      if (v === null || v.length === 0) return true
      for (var i in v) {
        return false
      }
      return true
  }
  return false
}
export const getFileSize = (size) => {
  if (size >= 1073741824) return (size / 1073741824).toFixed(2) + 'G'
  if (size >= 1048576) return (size / 1048576).toFixed(2) + 'M'
  if (size >= 1024) return (size / 1024).toFixed(2) + 'K'
  return size.toFixed(2) + 'B'
}
export const removeSpecialChars = (str) =>
  str.replace(/[\n\t\r]/g, '').replace(/\//g, '-')

export const getFolderName = (value) => {
  if (!value) return ''
  if (Array.isArray(value) && value.length) {
    return value[0]?.text || value[0]?.name
  }
  if (typeof value === 'object') return value.text || value.name
  return value
}

export const replaceFileName = (originalName, newName, emptyName = '') => {
  const extension = originalName.split('.').pop()
  return newName
    ? `${newName}.${extension}`
    : `${emptyName}.${extension}`
}

export const chunkArrayByMaxSize = (items, maxSize) => {
  const chunks = []

  // Sort items from largest to smallest
  items.sort((a, b) => b.size - a.size)

  while (items.length > 0) {
    const currentChunk = []
    let currentSize = 0

    // Try to fit as many items as possible into the current chunk
    for (let i = 0; i < items.length; i++) {
      if (currentSize + items[i].size <= maxSize) {
        currentChunk.push(items[i])
        currentSize += items[i].size
        items.splice(i, 1) // Remove the item from the list
        i-- // Adjust the index after removing an item
      }
    }

    chunks.push(currentChunk)
  }

  return chunks
}


export  const FILE_NAME_TYPE = {
  //字段
  FIELD_NAME: 'FIELD_NAME',
  //表头
  HEADER_NAME: 'HEADER_NAME',
  //文件名
  FILE_NAME: 'FILE_NAME',
  // 自定义文字
  CUSTOM_TEXT: 'CUSTOM_TEXT',
}
export const FILE_NAME_TYPE_COLOR_MAP = {
  [FILE_NAME_TYPE.FIELD_NAME]: 'primary',
  [FILE_NAME_TYPE.HEADER_NAME]: 'warning',
  [FILE_NAME_TYPE.FILE_NAME]: 'success',
  [FILE_NAME_TYPE.CUSTOM_TEXT]: 'info',
}