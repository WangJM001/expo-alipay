import { NativeModule } from 'expo-modules-core';

export interface AlipayPaymentResult {
  resultStatus: string;
  result?: string;
  memo?: string;
}

export interface AlipayH5PaymentResult {
  resultStatus: string;
  memo?: string;
  returnUrl?: string;
}

export interface AlipayAuthResult {
  resultStatus: string;
  result?: string;
  memo?: string;
  resultCode?: string;
  authCode?: string;
  alipayOpenId?: string;
}

export type AlipayEvents = {
  onH5PayResult(event: AlipayH5PaymentResult): void;
};

export interface ExpoAlipayModule extends NativeModule<AlipayEvents> {
  /**
   * 设置支付宝的 URL Scheme (iOS only)
   * @param scheme URL Scheme, 例如 "alipay" 或你的 app scheme
   */
  setAlipayScheme(scheme: string): void;

  /**
   * 设置支付宝的 App ID
   * @param appId 支付宝开放平台申请的 App ID
   */
  setAppId(appId: string): void;

  /**
   * 切换支付宝 SDK 的沙箱/生产环境（仅 Android 生效，iOS 无此能力）。
   * 必须在 pay()/auth() 之前调用，否则 Android 端默认使用生产环境。
   *
   * @param enabled true 切换到沙箱环境，false 切换到生产环境
   */
  setSandboxEnabled(enabled: boolean): void;

  /**
   * 发起支付宝支付
   * @param orderString 订单信息字符串(从服务端获取)
   * @returns Promise<AlipayPaymentResult> 支付结果
   */
  pay(orderString: string): Promise<AlipayPaymentResult>;

  /**
   * H5支付URL拦截方法（同步）
   * 用于在 WebView 的 URL 变化时拦截支付宝H5支付URL
   *
   * @param url 需要拦截的URL
   * @returns boolean 是否被拦截（true=已拦截,WebView不应继续加载；false=未拦截,WebView应继续加载）
   *
   * 使用方式：
   * 1. 在 WebView 的 onShouldStartLoadWithRequest (iOS) 或 onNavigationStateChange (Android) 中调用
   * 2. 监听 onH5PayResult 事件获取支付结果
   *
   * @example
   * ```typescript
   * // 监听支付结果事件
   * ExpoAlipay.addListener('onH5PayResult', (result) => {
   *   if (result.returnUrl) {
   *     webviewRef.current.injectJavaScript(`window.location.href = "${result.returnUrl}"`);
   *   }
   * });
   *
   * // WebView URL 拦截
   * <WebView
   *   onShouldStartLoadWithRequest={(request) => {
   *     const isIntercepted = ExpoAlipay.payInterceptorWithUrl(request.url);
   *     return !isIntercepted; // true=继续加载, false=拦截
   *   }}
   * />
   * ```
   */
  payInterceptorWithUrl(url: string): boolean;

  /**
   * 发起支付宝授权
   * @param authInfo 授权信息字符串(从服务端获取)
   * @returns Promise<AlipayAuthResult> 授权结果
   */
  auth(authInfo: string): Promise<AlipayAuthResult>;

  /**
   * 检查支付宝是否已安装
   * @returns Promise<boolean> 是否已安装支付宝
   */
  isAlipayInstalled(): Promise<boolean>;
}
