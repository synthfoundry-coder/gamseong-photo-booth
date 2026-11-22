import { useEffect, type RefObject } from 'react';

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function linkError(el: FormControl, shown: boolean) {
  const errorId = el.dataset.error;
  if (!errorId) return;
  const ids = (el.getAttribute('aria-describedby') || '')
    .split(/\s+/)
    .filter((id) => id && id !== errorId);
  if (shown) ids.push(errorId);
  if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
  else el.removeAttribute('aria-describedby');
}

// Synchronizes aria-invalid and aria-describedby with :user-invalid (with fallback when :user-invalid is unsupported).
export function useFormValidationSync(
  formRef: RefObject<HTMLFormElement | null>,
  onAnnounce?: (msg: string) => void
) {
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const supportsUserInvalid =
      typeof CSS !== 'undefined' && CSS.supports('selector(:user-invalid)');
    const dirty = new WeakMap<FormControl, { interacted: boolean; blurred: boolean }>();
    const announced = new WeakSet<FormControl>();
    let announceTimer: number | undefined;

    const syncControl = (el: FormControl, shouldAnnounce = false) => {
      let invalid = false;
      if (supportsUserInvalid) {
        invalid = el.matches(':user-invalid');
      } else {
        const state = dirty.get(el);
        invalid = Boolean(state?.interacted && state?.blurred && !el.validity.valid);
        el.classList.toggle('user-invalid-fallback', invalid);
      }

      if (invalid) {
        el.setAttribute('aria-invalid', 'true');
        linkError(el, true);
        if (shouldAnnounce && !announced.has(el) && onAnnounce) {
          const errorEl = el.dataset.error ? document.getElementById(el.dataset.error) : null;
          if (errorEl?.textContent) {
            const labelText = el.labels?.[0]?.textContent?.trim();
            const spoken = labelText
              ? `${labelText}: ${errorEl.textContent.trim()}`
              : errorEl.textContent.trim();
            window.clearTimeout(announceTimer);
            announceTimer = window.setTimeout(() => onAnnounce(spoken), 400);
            announced.add(el);
          }
        }
      } else {
        el.setAttribute('aria-invalid', 'false');
        linkError(el, false);
        announced.delete(el);
      }
    };

    // Start all fields at aria-invalid="false" so Firefox/Safari do not announce empty required fields on load.
    form.querySelectorAll<FormControl>('input, select, textarea').forEach((el) => {
      if (!el.hasAttribute('aria-invalid')) el.setAttribute('aria-invalid', 'false');
    });

    const isControl = (target: EventTarget | null): target is FormControl =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement;

    const onBlur = (e: Event) => {
      if (!isControl(e.target)) return;
      const state = dirty.get(e.target) ?? { interacted: false, blurred: false };
      state.blurred = true;
      dirty.set(e.target, state);
      syncControl(e.target, true);
    };

    const onInput = (e: Event) => {
      if (!isControl(e.target)) return;
      const state = dirty.get(e.target) ?? { interacted: false, blurred: false };
      state.interacted = true;
      dirty.set(e.target, state);
      syncControl(e.target, false);
    };

    const onChange = (e: Event) => {
      if (!isControl(e.target)) return;
      const state = dirty.get(e.target) ?? { interacted: false, blurred: false };
      state.interacted = true;
      dirty.set(e.target, state);
      syncControl(e.target, true);
    };

    const onInvalid = (e: Event) => {
      if (!isControl(e.target)) return;
      dirty.set(e.target, { interacted: true, blurred: true });
      announced.add(e.target);
      syncControl(e.target, false);
    };

    const onReset = () => {
      window.setTimeout(() => {
        form.querySelectorAll<FormControl>('input, select, textarea').forEach((el) => {
          dirty.delete(el);
          el.classList.remove('user-invalid-fallback');
          syncControl(el, false);
        });
      });
    };

    form.addEventListener('blur', onBlur, true);
    form.addEventListener('input', onInput);
    form.addEventListener('change', onChange, true);
    form.addEventListener('invalid', onInvalid, true);
    form.addEventListener('reset', onReset);

    return () => {
      window.clearTimeout(announceTimer);
      form.removeEventListener('blur', onBlur, true);
      form.removeEventListener('input', onInput);
      form.removeEventListener('change', onChange, true);
      form.removeEventListener('invalid', onInvalid, true);
      form.removeEventListener('reset', onReset);
    };
  }, [formRef, onAnnounce]);
}
