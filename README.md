# expo-alipay

Expo 支付宝 SDK 集成模块,支持 iOS 和 Android 平台。

## 功能特性

- ✅ 支付宝支付
- ✅ 手机网站转 APP 支付（H5 支付）
- ✅ 支付宝授权
- ✅ 检查支付宝是否已安装
- ✅ 沙箱/生产环境切换（Android）
- ✅ 自动配置(通过 Config Plugin)
- ✅ TypeScript 支持
- ✅ iOS & Android 原生支持

## 安装

```bash
npm install @jayming/expo-alipay
# 或
yarn add @jayming/expo-alipay
# 或
pnpm add @jayming/expo-alipay
```

## 配置

### 1. 在 `app.json` 中添加 Config Plugin

```json
{
  "expo": {
    "plugins": [
      [
        "@jayming/expo-alipay",
        {
          "scheme": "your-app-scheme"
        }
      ]
    ]
  }
}
```

> **注意**: Config Plugin 会自动配置 iOS 的 AppDelegate 和 Android 的 Manifest,无需手动修改原生代码。

### 2. Android 权限配置

如果您使用的是 **裸 React Native** 项目或需要手动配置，请在 `android/app/src/main/AndroidManifest.xml` 中添加以下权限：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
```

如果需要读取设备信息（可选），还可以添加：

```xml
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

> **注意**:
>
> - 对于 **Expo 项目**，Config Plugin 会自动处理基础权限，无需手动添加
> - `READ_PHONE_STATE` 和 `WRITE_EXTERNAL_STORAGE` 在 Android 6.0+ 需要动态申请权限

### 3. 重新构建应用

```bash
npx expo prebuild
npx expo run:ios
# 或
npx expo run:android
```

## 使用方法

### 基本使用

```typescript
import * as ExpoAlipay from '@jayming/expo-alipay';

// 1. 设置 URL Scheme (iOS 必需)
ExpoAlipay.setAlipayScheme('your-app-scheme');

// 2. 设置 App ID
ExpoAlipay.setAppId('your-alipay-app-id');

// 2.1 沙箱联调时需要切换到沙箱环境（仅 Android 生效，必须在 pay()/auth() 之前调用；
//     不调用则 Android 端默认使用生产环境，即使 orderString 是沙箱私钥签发的也一样）
ExpoAlipay.setSandboxEnabled(true);

// 3. 检查支付宝是否已安装
const isInstalled = await ExpoAlipay.isAlipayInstalled();
console.log('支付宝已安装:', isInstalled);

// 4. 发起支付
try {
  const orderString = 'order_string_from_server'; // 从服务器获取
  const result = await ExpoAlipay.pay(orderString);

  console.log('支付结果:', result);

  if (result.resultStatus === '9000') {
    console.log('支付成功');
  } else if (result.resultStatus === '6001') {
    console.log('用户取消支付');
  } else {
    console.log('支付失败:', result.memo);
  }
} catch (error) {
  console.error('支付错误:', error);
}

// 5. 发起授权
try {
  const authInfo = 'auth_info_from_server'; // 从服务器获取
  const result = await ExpoAlipay.auth(authInfo);

  console.log('授权结果:', result);

  if (result.resultStatus === '9000') {
    console.log('授权成功');
    console.log('授权码:', result.authCode);
  } else {
    console.log('授权失败:', result.memo);
  }
} catch (error) {
  console.error('授权错误:', error);
}
```

### 完整示例

```typescript
import React, { useState, useEffect } from 'react';
import { View, Button, Text, Alert } from 'react-native';
import * as ExpoAlipay from '@jayming/expo-alipay';

export default function PaymentScreen() {
  const [isAlipayInstalled, setIsAlipayInstalled] = useState(false);

  useEffect(() => {
    // 初始化
    ExpoAlipay.setAlipayScheme('myapp'); // 替换为你的 scheme
    ExpoAlipay.setAppId('2021001234567890'); // 替换为你的 App ID

    // 检查支付宝是否已安装
    checkAlipayInstalled();
  }, []);

  const checkAlipayInstalled = async () => {
    const installed = await ExpoAlipay.isAlipayInstalled();
    setIsAlipayInstalled(installed);
  };

  const handlePay = async () => {
    try {
      // 1. 从服务器获取订单信息
      const orderString = await fetchOrderFromServer();

      // 2. 调用支付
      const result = await ExpoAlipay.pay(orderString);

      // 3. 处理支付结果
      if (result.resultStatus === '9000') {
        Alert.alert('成功', '支付成功');
      } else if (result.resultStatus === '6001') {
        Alert.alert('取消', '用户取消支付');
      } else {
        Alert.alert('失败', result.memo || '支付失败');
      }
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  const handleAuth = async () => {
    try {
      // 1. 从服务器获取授权信息
      const authInfo = await fetchAuthInfoFromServer();

      // 2. 调用授权
      const result = await ExpoAlipay.auth(authInfo);

      // 3. 处理授权结果
      if (result.resultStatus === '9000') {
        Alert.alert('成功', `授权成功\n授权码: ${result.authCode}`);
        // 将 authCode 发送到服务器换取用户信息
      } else {
        Alert.alert('失败', result.memo || '授权失败');
      }
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>支付宝状态: {isAlipayInstalled ? '已安装' : '未安装'}</Text>
      <Button title="发起支付" onPress={handlePay} />
      <Button title="发起授权" onPress={handleAuth} />
    </View>
  );
}

// 模拟从服务器获取订单信息
async function fetchOrderFromServer() {
  // 实际项目中应该从服务器获取
  // 订单信息格式参考: https://opendocs.alipay.com/open/204/105465
  const response = await fetch('https://your-api.com/alipay/order', {
    method: 'POST',
    // ... 其他参数
  });
  const data = await response.json();
  return data.orderString;
}

// 模拟从服务器获取授权信息
async function fetchAuthInfoFromServer() {
  // 实际项目中应该从服务器获取
  // 授权信息格式参考: https://opendocs.alipay.com/open/218/105327
  const response = await fetch('https://your-api.com/alipay/auth', {
    method: 'POST',
    // ... 其他参数
  });
  const data = await response.json();
  return data.authInfo;
}
```

## API 文档

### Web 平台说明

- 在浏览器环境中，无法调用原生支付宝 SDK，因此 `pay` 和 `auth` 方法在 Web 平台上不可用，会返回 rejected Promise。请在服务端/前端采用 H5 支付的跳转流程。
- `payInterceptorWithUrl` 在 Web 上是同步的，尝试在浏览器中打开传入的支付宝 H5 链接（或 Scheme），并返回一个布尔值表示是否已拦截/处理该 URL（true=已处理，false=未处理）。
- `isAlipayInstalled` 在浏览器上无法可靠判断客户端 App 是否安装，函数会返回 `false`。

### `setAlipayScheme(scheme: string): void`

设置支付宝的 URL Scheme (iOS 必需)。

**参数:**

- `scheme`: URL Scheme,需要与 `app.json` 中配置的一致

### `setAppId(appId: string): void`

设置支付宝的 App ID。

**参数:**

- `appId`: 支付宝开放平台申请的 App ID

### `setSandboxEnabled(enabled: boolean): void`

切换支付宝 SDK 使用的沙箱/生产环境。**仅 Android 生效**——iOS 的 `AlipaySDK` 没有对应的环境切换接口，App 支付沙箱环境目前只支持 Android 客户端接入（参考支付宝官方文档《APP 支付如何使用沙箱环境联调》），iOS 端调用此方法为 no-op。

必须在调用 `pay()`/`auth()` 之前调用。**如果不调用，Android 端默认使用生产环境**——即使服务端签发的 `orderString` 是用沙箱私钥（PKCS1）生成的，Android 原生 SDK 仍会按生产环境处理该请求，可能导致沙箱联调时出现签名正确但支付流程报错的情况。

**参数:**

- `enabled`: `true` 切换到沙箱环境，`false` 切换到生产环境

**示例:**

```typescript
// 沙箱联调
if (__DEV__) {
  ExpoAlipay.setSandboxEnabled(true);
}

const result = await ExpoAlipay.pay(orderString);
```

### `pay(orderString: string): Promise<AlipayPaymentResult>`

发起支付宝支付。

**参数:**

- `orderString`: 订单信息字符串(从服务端获取)

**返回值:**

```typescript
interface AlipayPaymentResult {
  resultStatus: string; // 结果状态码
  result?: string; // 结果详情
  memo?: string; // 结果描述
}
```

**常见状态码:**

- `9000`: 支付成功
- `8000`: 正在处理中
- `4000`: 订单支付失败
- `5000`: 重复请求
- `6001`: 用户中途取消
- `6002`: 网络连接出错
- `6004`: 支付结果未知

### `payInterceptorWithUrl(url: string): boolean`

手机网站转 APP 支付（H5 支付）拦截方法（同步）。用于在 WebView 或浏览器中处理支付宝 H5 支付链接，或在浏览器中触发 App Scheme。

**参数:**

- `url`: H5 支付 URL 字符串(从服务端获取，使用 `alipay.trade.wap.pay` 接口生成) 或 支付宝 App Scheme

**返回值:**

- `boolean`: 是否已拦截/处理该 URL（true=已拦截，通常不会继续在 WebView 中加载；false=未拦截）

**示例（浏览器 / WebView 拦截使用）:**

```typescript
// 从服务端获取H5支付URL
const response = await fetch('https://your-api.com/alipay/create-h5-order');
const { payUrl } = await response.json();

// Web 平台：直接在浏览器中打开 URL，函数返回是否已拦截
const isIntercepted = ExpoAlipay.payInterceptorWithUrl(payUrl);

// 在 WebView 中的示例：
// onShouldStartLoadWithRequest={(request) => {
//   const intercepted = ExpoAlipay.payInterceptorWithUrl(request.url);
//   return !intercepted; // true=继续加载, false=拦截
// }}
```

**详细文档:** 参见 [H5 支付使用指南](./docs/H5_PAYMENT.md)

### `auth(authInfo: string): Promise<AlipayAuthResult>`

发起支付宝授权。

**参数:**

- `authInfo`: 授权信息字符串(从服务端获取)

**返回值:**

```typescript
interface AlipayAuthResult {
  resultStatus: string; // 结果状态码
  result?: string; // 结果详情
  memo?: string; // 结果描述
  resultCode?: string; // 结果码
  authCode?: string; // 授权码
  alipayOpenId?: string; // 支付宝用户 ID
}
```

### `isAlipayInstalled(): Promise<boolean>`

检查支付宝是否已安装。

Android 同时支持正式版和沙箱版支付宝：

- 正式版包名：`com.eg.android.AlipayGphone`
- 沙箱版包名：`com.eg.android.AlipayGphoneRC`
- 两个版本可以共存；任意一个版本已安装时均返回 `true`
- 两个版本均未安装时返回 `false`

**返回值:**

- `Promise<boolean>`: 是否安装了正式版或沙箱版支付宝

## 常见问题

### 1. iOS 支付后没有回调?

确保 `app.json` 中配置的 scheme 与代码中 `setAlipayScheme()` 设置的一致,并在修改配置后重新运行 `npx expo prebuild`。

### 2. Android 找不到支付宝应用?

Config Plugin 会自动在 `AndroidManifest.xml` 的 `queries` 中添加正式版和沙箱版支付宝包名，以确保 Android 11 及以上系统能够检测安装状态。添加或升级 plugin 后需要重新运行 `npx expo prebuild`。

### 3. 订单信息从哪里获取?

订单信息和授权信息都必须从服务器生成,不能在客户端生成。参考:

- 支付订单: https://opendocs.alipay.com/open/204/105465
- 授权信息: https://opendocs.alipay.com/open/218/105327

### 4. 如何测试?

支付宝提供了沙箱环境用于测试。申请沙箱账号:
https://opendocs.alipay.com/open/200/105311

## 许可证

MIT

## 相关链接

- [支付宝开放平台](https://open.alipay.com/)
- [Android SDK 集成文档](https://opendocs.alipay.com/open/00dn75)
- [iOS SDK 集成文档](https://opendocs.alipay.com/open/00dn76)
- [App 支付接口文档](https://opendocs.alipay.com/open/204/105465)
- [App 授权接口文档](https://opendocs.alipay.com/open/218/105327)
