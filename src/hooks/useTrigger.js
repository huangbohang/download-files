import { formItemContextKey } from 'element-plus';
import { inject } from 'vue';

export function useTrigger() {
  const elFormItem = inject(formItemContextKey);
  const emitTrigger = (trigger = 'change') => {
    if (elFormItem?.validate) {
      elFormItem.validate(trigger);
    }
  };
  return { emitTrigger };
}
