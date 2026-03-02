/**
 * Free shipping bar (CORE-Plus)
 * threshold: data-threshold (JPY)
 * text: data-text-before / data-text-after
 */
(() => {
    if (customElements.get('shipping-bar')) return;

    // fetch hook (cart系が呼ばれたらイベントを飛ばす)
    const HOOK_KEY = '__coreplus_shipbar_hooked__';
    if (!window[HOOK_KEY]) {
        window[HOOK_KEY] = true;
        const originalFetch = window.fetch;

        window.fetch = (...args) =>
            originalFetch(...args).then((res) => {
                try {
                    const url = String(args[0]);
                    const hit =
                        url.includes('/cart/add') || url.includes('/cart/add.js') ||
                        url.includes('/cart/change') || url.includes('/cart/change.js') ||
                        url.includes('/cart/update') || url.includes('/cart/update.js') ||
                        url.includes('/cart/clear') || url.includes('/cart/clear.js');

                    if (hit) setTimeout(() => document.dispatchEvent(new CustomEvent('coreplus:cart-updated')), 300);
                } catch (e) { }
                return res;
            });
    }

    class ShippingBar extends HTMLElement {
        connectedCallback() {
            this.threshold = Number(this.dataset.threshold || 0);
            this.textBefore = this.dataset.textBefore || 'あと';
            this.textAfter = this.dataset.textAfter || 'のお買い上げで、送料無料になります。';

            this._onUpdate = () => this.update();
            document.addEventListener('coreplus:cart-updated', this._onUpdate);

            // 子要素が揃ってから動かす
            setTimeout(() => this.update(), 0);
        }

        disconnectedCallback() {
            document.removeEventListener('coreplus:cart-updated', this._onUpdate);
        }

        async update() {
            if (!this.textEl) this.textEl = this.querySelector('.c-shipping-bar__text');
            if (!this.innerEl) this.innerEl = this.querySelector('.c-shipping-bar__inner') || this;

            if (!this.textEl || !this.threshold) return;

            const root = window.Shopify?.routes?.root || '/';
            const cart = await fetch(`${root}cart.js`, { headers: { Accept: 'application/json' } }).then(r => r.json());

            // total_price は最小通貨単位（多くのケースで100倍）なので /100
            const totalJPY = Number(cart.total_price || 0) / 100;
            const remaining = this.threshold - totalJPY;

            if (remaining <= 0) {
                this.textEl.innerHTML = '<strong>送料が無料になりました！</strong>';
                this.innerEl.style.backgroundColor = '#3b823e';
                return;
            }

            const formatted = new Intl.NumberFormat('ja-JP', {
                style: 'currency', currency: 'JPY', maximumFractionDigits: 0
            }).format(Math.ceil(remaining));

            this.textEl.innerHTML = `${this.textBefore} <span id="shipping-delta">${formatted}</span> ${this.textAfter}`;
            this.innerEl.style.backgroundColor = '';
        }
    }

    customElements.define('shipping-bar', ShippingBar);
})();