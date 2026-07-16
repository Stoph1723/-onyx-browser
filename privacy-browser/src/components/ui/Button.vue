<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
  target?: string;
  icon?: string;
  iconRight?: string;
  'onClick'?: (event: MouseEvent) => void;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  fullWidth: false,
  type: 'button',
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const isLink = computed(() => !!props.href);
const tag = computed(() => isLink.value ? 'a' : 'button');

const buttonClasses = computed(() => [
  'btn',
  `btn-${props.variant}`,
  `btn-${props.size}`,
  { 'btn-full': props.fullWidth },
  { 'btn-loading': props.loading },
  { 'btn-disabled': props.disabled || props.loading },
  { 'btn-has-icon': props.icon || props.iconRight },
]);

const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  emit('click', event);
};
</script>

<template>
  <component
    :is="tag"
    :class="buttonClasses"
    :type="isLink ? undefined : props.type"
    :href="props.href"
    :target="props.target"
    :disabled="props.disabled || props.loading"
    :aria-busy="props.loading"
    :aria-disabled="props.disabled || props.loading"
    @click="handleClick"
  >
    <span v-if="props.loading" class="btn-spinner" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinner-icon">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" />
      </svg>
    </span>

    <span v-if="props.icon && !props.loading" class="btn-icon btn-icon-left" v-html="props.icon" aria-hidden="true" />

    <span class="btn-content">
      <slot />
    </span>

    <span v-if="props.iconRight && !props.loading" class="btn-icon btn-icon-right" v-html="props.iconRight" aria-hidden="true" />
  </component>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--btn-gap);
  font-family: var(--font-sans);
  font-weight: var(--btn-font-weight);
  border: 1px solid transparent;
  border-radius: var(--radius-button);
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: var(--transition-colors), transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
  outline: none;
  position: relative;
  user-select: none;
}

.btn:focus-visible {
  box-shadow: var(--focus-ring);
}

.btn:active:not(.btn-disabled):not(.btn-loading) {
  transform: scale(0.98);
}

.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-full {
  width: 100%;
}

/* Sizes */
.btn-sm {
  height: var(--btn-height-sm);
  padding: 0 var(--btn-padding-x-sm);
  font-size: var(--btn-font-size-sm);
  gap: 6px;
}

.btn-md {
  height: var(--btn-height-md);
  padding: 0 var(--btn-padding-x-md);
  font-size: var(--btn-font-size-md);
}

.btn-lg {
  height: var(--btn-height-lg);
  padding: 0 var(--btn-padding-x-lg);
  font-size: var(--btn-font-size-lg);
}

.btn-icon {
  width: var(--btn-height-md);
  height: var(--btn-height-md);
  padding: 0;
}

.btn-icon.btn-sm {
  width: var(--btn-height-sm);
  height: var(--btn-height-sm);
}

.btn-icon.btn-lg {
  width: var(--btn-height-lg);
  height: var(--btn-height-lg);
}

/* Variants */
.btn-primary {
  background-color: var(--interactive-primary);
  color: var(--interactive-primary-fg);
  border-color: var(--interactive-primary);
}

.btn-primary:hover:not(.btn-disabled):not(.btn-loading) {
  background-color: var(--interactive-primary-hover);
  border-color: var(--interactive-primary-hover);
}

.btn-primary:active:not(.btn-disabled):not(.btn-loading) {
  background-color: var(--interactive-primary-active);
  border-color: var(--interactive-primary-active);
}

.btn-secondary {
  background-color: var(--interactive-secondary);
  color: var(--interactive-secondary-fg);
  border-color: var(--border-primary);
}

.btn-secondary:hover:not(.btn-disabled):not(.btn-loading) {
  background-color: var(--interactive-secondary-hover);
  border-color: var(--border-secondary);
}

.btn-secondary:active:not(.btn-disabled):not(.btn-loading) {
  background-color: var(--interactive-secondary-active);
}

.btn-ghost {
  background-color: var(--interactive-ghost);
  color: var(--interactive-ghost-fg);
  border-color: transparent;
}

.btn-ghost:hover:not(.btn-disabled):not(.btn-loading) {
  background-color: var(--interactive-ghost-hover);
}

.btn-ghost:active:not(.btn-disabled):not(.btn-loading) {
  background-color: var(--interactive-ghost-active);
}

.btn-danger {
  background-color: var(--interactive-danger);
  color: var(--interactive-danger-fg);
  border-color: var(--interactive-danger);
}

.btn-danger:hover:not(.btn-disabled):not(.btn-loading) {
  background-color: var(--interactive-danger-hover);
  border-color: var(--interactive-danger-hover);
}

.btn-danger:active:not(.btn-disabled):not(.btn-loading) {
  background-color: var(--interactive-danger-active);
  border-color: var(--interactive-danger-active);
}

.btn-outline {
  background-color: transparent;
  color: var(--interactive-primary);
  border-color: var(--interactive-primary);
}

.btn-outline:hover:not(.btn-disabled):not(.btn-loading) {
  background-color: var(--accent-muted);
}

.btn-outline:active:not(.btn-disabled):not(.btn-loading) {
  background-color: var(--color-brand-100);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    .btn-outline:hover:not(.btn-disabled):not(.btn-loading) {
      background-color: var(--color-brand-900);
    }
    .btn-outline:active:not(.btn-disabled):not(.btn-loading) {
      background-color: var(--color-brand-800);
    }
  }
}

/* Loading state */
.btn-loading {
  color: transparent !important;
  pointer-events: none;
}

.btn-spinner {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  inset: 0;
}

.spinner-icon {
  width: 1em;
  height: 1em;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Icons */
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-icon svg {
  width: 1em;
  height: 1em;
}

.btn-has-icon .btn-content {
  display: flex;
  align-items: center;
}

/* Content */
.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
</style>