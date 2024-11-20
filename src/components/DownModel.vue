<template>
  <div class="dialog-process">
    <h4>{{ $t("download_progress") }}</h4>
    <div class="dialog-circle">
      <ProgressCircle :percent="percent" />
    </div>
    <h4>{{ $t("download_details") }}</h4>
    <div class="prompt">
      <p  v-if="totalSize>MAX_SIZE" style="color: var(--el-color-warning);line-height: 1.5;">当前下载附件过大，推荐进行视图筛选，如您下载奔溃或者无反应，请使用chrome浏览器下载</p>
      <!-- <p>已找到{{ fileCellLength }}个单元格</p> -->
      <p>共计有 {{ totalLength }} 个文件待下载。</p>
      <p>当前文件总大小{{ getFileSize(totalSize) }}</p>
      <p>已下载文件数量{{ getCompletedIdsLength }}个</p>
      <p>{{ maxInfo }}</p>
      <p>{{ zipProgressText }}</p>
      <p style="color:red" v-if="!!zipError">{{ '文件打包失败，请使用chrome浏览器进行打包' }}</p>

      <el-table
        :data="fileInfo"
        style="width: 100%"
        show-overflow-tooltip
        size="small"
      >
        <el-table-column type="index" width="50" />
        <el-table-column prop="name" label="文件名" width="" />
        <el-table-column prop="percentage" label="下载进度">
          <template #default="scope">
            {{ scope.row.percentage
            }}{{ scope.row.type === "error" ? "" : "%" }}
          </template>
        </el-table-column>
        <el-table-column prop="size" label="文件大小">
          <template #default="scope">
            {{ getFileSize(scope.row.size) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-button
              type="primary"
              v-if="scope.row.type === 'loading'"
              size="small"
              link
              >下载中</el-button
            >
            <el-button
              type="success"
              link
              v-if="scope.row.type === 'success'"
              size="small"
              >下载成功</el-button
            >
            <el-button
              type="danger"
              link
              v-if="scope.row.type === 'error'"
              size="small"
              >下载失败</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, reactive, toRefs, computed, defineEmits } from 'vue'
import ProgressCircle from './ProgressCircle.vue'
import FileDownloader from './downFiles.js'
import { i18n } from '@/locales/i18n.js'
import { getFileSize, debouncedSort } from '@/utils/index.js'
const $t = i18n.global.t
const emit = defineEmits(['finsh'])
const MAX_SIZE = 1073741824 * 1 // 1G

const completedIds = ref(new Set())
const zipError = ref(false)
const totalSize = ref(0)
const totalLength = ref(0)
const fileInfo = ref([])
const maxInfo = ref('')
const fileCellLength = ref(0)
const zipProgressText = ref('')

const props = defineProps({
  attachmentList: {
    type:Array,
    default: () => []
  },
  zipName: {
    type: String,
    default: ''
  },
  formData: {
    type: Object,
    default: () => {}
  }
})
const getCompletedIdsLength = computed(() => {
  return completedIds.value.size
})

const percent = computed(() => {
  const val = ((getCompletedIdsLength.value / totalLength.value) * 100).toFixed(2) - 0
  return val || 0
})
const sortFileInfo = () => {
  // 定义优先级映射
  const priority = {
    'loading': 1,
    'error': 2,
    'default': 3 // 其他类型的优先级
  }
  // 重构数组，当数组长度大于20时，删除 type 为 'default' 的元素
  if (fileInfo.value.length > 20) {
    fileInfo.value = fileInfo.value.filter(item => {
      return item.type !== 'success'
    })
  }

  fileInfo.value.sort((a, b) => {
    return (priority[a.type] || priority['default']) - (priority[b.type] || priority['default'])
  })
}

const debouncedSortFileInfo = debouncedSort(sortFileInfo, 200)
const { formData, zipName } = toRefs(props)
onMounted(async() => {
  const fileDownloader = new FileDownloader({
    ...formData.value,
    zipName: zipName.value,
    attachmentList:props.attachmentList
  })
  fileDownloader.on('preding', (cells) => {
    fileCellLength.value += 1

    if (cells) {
      totalLength.value += cells.length
      cells.forEach((cell) => {
        totalSize.value += cell.size
      })
    }
  })
  fileDownloader.on('error', (errorInfo) => {
    const { index, message } = errorInfo
    const itemIndex = fileInfo.value.findIndex((item) => item.index === index)

    if (itemIndex !== -1) {
      fileInfo.value[itemIndex].type = 'error'
      fileInfo.value[itemIndex].percentage = message
      debouncedSortFileInfo()
    }
  })
  fileDownloader.on('max_size_warning', (info) => {
    zipError.value = true
  })

  fileDownloader.on('progress', (progressInfo) => {
    const { index, percentage, name, size } = progressInfo
    if (completedIds.value.has(index)) {
      return
    }
    const itemIndex = fileInfo.value.findIndex((item) => item.index === index)

    if (itemIndex === -1) {
      fileInfo.value.unshift({
        index,
        percentage,
        name,
        size,
        type: 'loading'
      })
    } else {
      fileInfo.value[itemIndex].percentage = percentage

      if (percentage >= 100) {
        fileInfo.value[itemIndex].type = 'success'

        completedIds.value.add(index) // 标记为已处理
        debouncedSortFileInfo()
      } else {
        fileInfo.value[itemIndex].type = 'loading'
      }
    }
  })
  fileDownloader.on('finshed', (cells) => {
    emit('finsh')
  })
  fileDownloader.on('zip_progress', (percent) => {
    maxInfo.value = ''
    const text = $t('file_packing_progress_message').replace(
      'percentage',
      percent
    )
    zipProgressText.value = text
  })
  await fileDownloader.startDownload()
})
</script>

<style scoped lang="scss">
.dialog-process {
  h4 {
    color: var(--N900);
    margin-bottom: 16px;
    font-size: 16px;
    border-left: 3px solid var(--el-color-primary);
    padding-left: 8px;
  }

  .dialog-circle {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;

    .statistic {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }
}

.prompt {
  h4 {
    margin-bottom: 8px;
  }

  p {
    line-height: 1.2;
    color: var(--N500);
    font-size: 14px;
    margin-bottom: 8px;
  }
}

</style>
