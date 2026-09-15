import { AlipayPaymentResult, AlipayAuthResult } from './ExpoAlipay.types';

class ExpoAlipayWeb {
  private alipayScheme: string | null = null;
  private appId: string | null = null;

  private isAlipayUrl(url: string) {
    if (!url) return false;
    const u = url.trim().toLowerCase();

    return u.startsWith('https://openapi.alipay.com/') || u.includes('alipay.com');
  }

  setAlipayScheme(scheme: string): void {
    this.alipayScheme = scheme;
  }

  setAppId(appId: string): void {
    this.appId = appId;
  }

  setSandboxEnabled(_enabled: boolean): void {
    // no-op：Web 端没有沙箱/生产环境概念
  }

  async pay(_orderString: string): Promise<AlipayPaymentResult> {
    return Promise.reject(
      new Error('ExpoAlipay: `pay` is not supported on web. Use H5 redirect flow from your server.')
    );
  }

  payInterceptorWithUrl(url: string): boolean {
    if (!url) return false;

    if (this.isAlipayUrl(url)) {
      try {
        if (typeof globalThis !== 'undefined') {
          // @ts-ignore allow dynamic access in non-browser envs
          (globalThis as any).location.href = url;
        }
      } catch (e) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (globalThis as any).open(url, '_self');
        } catch {}
      }

      return true;
    }

    return false;
  }

  async auth(_authInfo: string): Promise<AlipayAuthResult> {
    return Promise.reject(new Error('ExpoAlipay: `auth` is not supported on web.'));
  }

  async isAlipayInstalled(): Promise<boolean> {
    if (this.alipayScheme && this.appId) {
      // noop
    }
    return Promise.resolve(false);
  }
}

export default new ExpoAlipayWeb();
