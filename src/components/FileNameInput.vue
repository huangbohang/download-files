<template>
  <div class='fileNameInput'>

    <draggable :list="dynamicTags" animation="300" class="drag-list" v-if="dynamicTags.length > 0" :itemKey="'id'">
      <template #item="{ element }">
        <div class="drag-item">
          <el-tag closable :disable-transitions="false" @close="handleClose(element)"
            :type="FILE_NAME_TYPE_COLOR_MAP[element.type] || 'primary'">
            <el-icon>
              <Tickets />
            </el-icon> {{ element.name }}
          </el-tag>
        </div>
      </template>
    </draggable>

    <el-select v-model="inputValue" filterable v-if="inputVisible" ref="InputRef" allow-create
      @change="handleInputConfirm" value-key="id" placeholder="可输入自定义文字" @keyup.enter="handleInputConfirm">
      <el-option-group :label="'字段'">
        <el-option v-for="item in props.options" :key="item.value" :label="item.name" :value="item" />
      </el-option-group>
      <el-option-group :label="'其他'">
        <el-option :label="'附件对应表头'" :value="{
          name: '附件对应表头',
          id: 'HEADER_NAME',
          type: 'HEADER_NAME'
        }" />
        <el-option :label="'附件原始名称'" :value="{
          name: '附件原始名称',
          id: 'FILE_NAME',
          type: 'FILE_NAME'
        }" />
      </el-option-group>

    </el-select>
    <el-button v-else class="button-new-tag" @click="showInput" :icon="CirclePlusFilled" size="small">
      添加
    </el-button>

  </div>
</template>

<script setup>
import { isEmpty } from 'lodash'
import { nextTick, ref } from 'vue'
import draggable from 'vuedraggable'
import { Tickets, CirclePlusFilled } from '@element-plus/icons-vue'
import { FILE_NAME_TYPE, FILE_NAME_TYPE_COLOR_MAP } from '@/utils/index'
import { useVModel } from '@vueuse/core'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  options: {
    type: Array,
    default: () => []
  }
})
const emit = defineEmits(['update:modelValue'])
const dynamicTags = useVModel(props, 'modelValue', emit)

const InputRef = ref(null)
const inputValue = ref({})
const inputVisible = ref(false)

const handleClose = ({ id }) => {
  const dex = dynamicTags.value.findIndex(item => item.id === id)
  if (dex >= 0) {
    dynamicTags.value.splice(dex, 1)
  }
}

const showInput = () => {
  inputVisible.value = true
  nextTick(() => {
    InputRef?.value?.focus()
    InputRef?.value?.toggleMenu()
  })
}

const handleInputConfirm = () => {
  console.log(isEmpty(inputValue.value))
  if (!isEmpty(inputValue.value)) {
    if (typeof inputValue.value == 'object') {
      let type = FILE_NAME_TYPE.FIELD
      if (['HEADER_NAME', 'FILE_NAME'].includes(inputValue.value.type)) {
        type = FILE_NAME_TYPE[inputValue.value.type]
      }
      dynamicTags.value.push({
        id: inputValue.value.id,
        name: inputValue.value.name,
        type
      })
    } else {
      dynamicTags.value.push({
        id: inputValue.value,
        name: inputValue.value,
        type: FILE_NAME_TYPE.CUSTOM_TEXT
      })
    }
    inputValue.value = null
    inputVisible.value = false
  }
}

</script>
<style scoped lang='scss'>
.fileNameInput {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  .drag-list {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 10px;

    .drag-item {
      cursor: move;
      display: inline-flex;
      gap: 10px;
      align-items: center;
      color: var(--N900);

      &:hover {
        opacity: 0.8;
      }

    }
  }

}
</style>
