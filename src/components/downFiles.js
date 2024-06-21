import { bitable } from '@lark-base-open/js-sdk'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import axios from 'axios'
import { i18n } from '@/locales/i18n.js'
import to from 'await-to-js'

import {
  removeSpecialChars,
  getFolderName,
  replaceFileName
} from '@/utils/index.js'

const $t = i18n.global.t

const MAX_ZIP_SIZE_NUM = 2

const MAX_ZIP_SIZE = MAX_ZIP_SIZE_NUM * 1024 * 1024 * 1024

class FileDownloader {
  constructor(formData) {
    Object.keys(formData).map((key) => {
      this[key] = formData[key]
    })

    this.progressListeners = [] // 用于存储进度事件的监听器
    this.errorListeners = [] // 用于存储错误事件的监听器
    this.predingListeners = [] // 用于存储获取文件信息的监听器
    this.infoListeners = [] // 用于存储获取文件信息的监听器
    this.finshedListeners = [] // 用于存储获取文件信息的监听器

    this.oTable = null

    this.currentTotalSize = 0
    this.nameSpace = new Set()
    this.zip = new JSZip()
  }

  async getCellsList() {
    const oView = await this.oTable.getViewById(this.viewId)
    const oRecordList = await oView.getVisibleRecordIdList()
    let cellList = []

    for (const fieldId of this.attachmentFileds) {
      for (const recordId of oRecordList) {
        let cell = await this.oTable.getCellValue(fieldId, recordId)

        if (cell) {
          cell = cell.map((e) => ({
            ...e,
            name: removeSpecialChars(e.name),
            recordId,
            fieldId,
            path: '',
            fileUrl: ''
          }))
          cellList.push(...cell)
          this.emit('preding', cell)
        }
      }
    }
    cellList = cellList.map((e, index) => ({ ...e, order: index + 1 }))
    return cellList
  }

  // 注册进度事件监听器
  on(event, callback) {
    if (!this[event + 'Listeners']) {
      this[event + 'Listeners'] = []
    }
    this[event + 'Listeners'].push(callback)

    return this
  }
  emit(type, messgae) {
    this[type + 'Listeners']?.forEach((listener) => {
      listener(messgae)
    })
  }
  async setFileNames() {
    if (this.fileNameType !== 1) return

    const targetFieldId = this.fileNameByField
    const getFileName = async(cell, targetFieldId) => {
      const name = await this.oTable.getCellString(
        targetFieldId,
        cell.recordId
      )
      return name
    }

    const updateCellNames = (cell, newName) => {
      if (newName !== cell.name) {
        const cName = replaceFileName(cell.name, newName, $t('undefined'))
        console.log(cName)
        cell.name = removeSpecialChars(cName)
      }
    }

    // 使用 map 创建一个包含所有异步操作的数组
    const promises = this.cellList.map((cell) =>
      getFileName(cell, targetFieldId)
    )

    // 等待所有异步操作完成
    const names = await Promise.all(promises)

    // 使用 names 更新 cellList 中每个 cell 的 name
    names.forEach((name, index) => {
      updateCellNames(this.cellList[index], name)
    })
  }
  async setFolderPath() {
    // 逐个下载
    if (this.downloadType !== 1) return
    // zip不需要文件夹分类
    if (!this.downloadTypeByFolders) return

    // 封装获取和处理文件夹名称的逻辑
    const getProcessedFolderName = async(fieldKey, recordId) => {
      const name = await this.oTable.getCellString(fieldKey, recordId)
      return removeSpecialChars(getFolderName(name)) || $t('uncategorized')
    }

    const setCellFolderName = async(cell, firstFolderKey, secondFolderKey) => {
      let parentFolder = ''
      if (firstFolderKey) {
        parentFolder += `${await getProcessedFolderName(firstFolderKey, cell.recordId)}/`
      }
      if (secondFolderKey) {
        parentFolder += `${await getProcessedFolderName(secondFolderKey, cell.recordId)}/`
      }
      cell.path = parentFolder
    }

    // 使用 Promise.all 处理所有单元格的文件夹名称设置
    await Promise.all(
      this.cellList.map((cell) =>
        setCellFolderName(cell, this.firstFolderKey, this.secondFolderKey)
      )
    )
  }
  getUniqueFileName(name, path) {
    const fileExtension = name.substring(name.lastIndexOf('.'))
    const baseName = name.substring(0, name.lastIndexOf('.'))
    let nameIndex = 1
    while (this.nameSpace.has(path + name)) {
      name = `${baseName}_${nameIndex}${fileExtension}`
      nameIndex++
    }
    this.nameSpace.add(path + name)
    return name
  }
  async zipDownLoad() {
    for (let index = 0; index < this.cellList.length; index++) {
      const fileInfo = this.cellList[index]
      const { token, fieldId, recordId, path, name, size, order } = fileInfo
      this.currentTotalSize += size
      if (size > MAX_ZIP_SIZE) {
        await this.sigleDownLoad(fileInfo)
        continue
      }
      if (this.currentTotalSize >= MAX_ZIP_SIZE) {
        const max_size_warning = $t('file_size_warning_message').replace('max_size', MAX_ZIP_SIZE_NUM)
        this.emit('max_size_warning', max_size_warning)
        await this.saveAndResetZip()
      }
      this.currentTotalSize += size
      fileInfo.name = this.getUniqueFileName(name, path)
      fileInfo.fileUrl = await this.oTable.getAttachmentUrl(
        token,
        fieldId,
        recordId
      )
      await this.addToZip(fileInfo)
    }
    this.saveAndResetZip()
  }
  async sigleDownLoad(file) {
    const cellList = file ? [file] : this.cellList
    const downLocal = async(fileInfo) => {
      const blob = await this.downloadFile(fileInfo)
      if (blob) {
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.setAttribute('href', objectUrl)
        a.setAttribute('download', fileInfo.name)
        a.click()
        URL.revokeObjectURL(objectUrl)
      }
    }
    for (let index = 0; index < cellList.length; index++) {
      const fileInfo = cellList[index]
      const { token, fieldId, recordId, path, name } = fileInfo

      fileInfo.name = this.getUniqueFileName(name, path)
      fileInfo.fileUrl = await this.oTable.getAttachmentUrl(
        token,
        fieldId,
        recordId
      )
      await downLocal(fileInfo)
    }
  }
  async saveAndResetZip() {
    const content = await this.zip.generateAsync(
      { type: 'blob' },
      (metadata) => {
        const percent = metadata.percent.toFixed(2)
        this.emit('zip_progress', percent)
      }
    )
    saveAs(content, `${this.zipName}.zip`)
    this.zip = new JSZip()
    this.currentTotalSize = 0
  }
  async downloadFile(fileInfo) {
    const { fileUrl, name, order } = fileInfo

    const [err, response] = await to(axios({
      method: 'get',
      responseType: 'blob',
      url: fileUrl,
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          this.emit('progress', {
            index: order,
            percentage
          })
        }
      }
    }))
    this.emit('progress', {
      index: order,
      percentage: 100
    })
    if (err) {
      this.emit('error', {
        name,
        message: err.message
      })
      return null
    }
    return response.data
  }

  async addToZip(fileInfo) {
    const { path, name } = fileInfo
    const blob = await this.downloadFile(fileInfo)
    if (blob) {
      this.zip.file(`${path}${name}`, blob)
    }
  }
  async startDownload() {
    this.oTable = await bitable.base.getTableById(this.tableId)
    // 获取所有附件信息
    this.cellList = await this.getCellsList()
    // 为所有附件重新取名
    await this.setFileNames()
    await this.setFolderPath()

    if (!this.cellList.length) {
      this.emit('info', $t('no_files_to_download_message'))
      this.emit('finshed')
      return ''
    }
    if (this.downloadType === 2) {
      // 逐个下载
      await this.sigleDownLoad()
    } else {
      await this.zipDownLoad()
    }

    this.emit('finshed')
  }
}

export default FileDownloader
