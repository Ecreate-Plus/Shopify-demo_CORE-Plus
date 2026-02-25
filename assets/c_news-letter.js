document.addEventListener(
    'submit',
    async function (e) {
        const form = e.target.closest('form[data-newsletter-form="true"]');
        if (!form) return;

        console.log('[newsletter] submit intercepted');

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (form.dataset.submitting === 'true') return;
        form.dataset.submitting = 'true';

        const formData = new FormData(form);
        const action = form.getAttribute('action');
        const messageContainer = form.querySelector('.c-form__message-container');

        if (messageContainer) {
            messageContainer.style.display = 'none';
            messageContainer.innerHTML = '';
        }

        try {
            const response = await fetch(action, {
                method: 'POST',
                body: formData,
                headers: {
                    Accept: 'text/html',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            const responseText = await response.text();

            console.log('[newsletter] action:', action);
            console.log('[newsletter] response status:', response.status);
            console.log('[newsletter] response url:', response.url);
            console.log('[newsletter] response length:', responseText.length);
            console.log('[newsletter] response preview:', responseText.slice(0, 500));

            const parser = new DOMParser();
            const doc = parser.parseFromString(responseText, 'text/html');

            const hcaptchaDetected =
                responseText.includes('hCaptcha') ||
                responseText.includes('captcha') ||
                doc.querySelector('iframe[src*="hcaptcha"]') ||
                doc.querySelector('[data-hcaptcha-response]');

            if (hcaptchaDetected) {
                console.warn('[newsletter] hCaptcha page detected');
                if (messageContainer) {
                    messageContainer.innerHTML = `
            <div class="form__message c-form__message">
              <h2 class="form-status caption-large text-body" role="alert" tabindex="-1">
                セキュリティ確認が必要なため、このフォームは非同期送信できません。通常送信で確認画面を表示します。
              </h2>
            </div>
          `;
                    messageContainer.style.display = 'block';
                }
                return;
            }

            const returnedForm =
                doc.querySelector('form[data-newsletter-form="true"]') ||
                doc.querySelector('form[action*="/contact"]');

            if (!returnedForm) {
                console.error('[newsletter] returned form not found');
                return;
            }

            const successMessage = returnedForm.querySelector('.form-status.form__message, .form-status');
            const errorMessage = returnedForm.querySelector('.c-form__message, .form__message');

            if (successMessage) {
                form.innerHTML = `
          <h2 class="form-status form-status-list form__message" tabindex="-1">
            ${successMessage.innerHTML}
          </h2>
        `;
                return;
            }

            if (errorMessage && messageContainer) {
                messageContainer.innerHTML = errorMessage.innerHTML;
                messageContainer.style.display = 'block';
                return;
            }

            console.warn('[newsletter] no success/error message found');
        } catch (err) {
            console.error('[newsletter] network error:', err);
        } finally {
            form.dataset.submitting = 'false';
        }
    },
    true
);