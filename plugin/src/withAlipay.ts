import {
  ConfigPlugin,
  withInfoPlist,
  withAndroidManifest,
  withAppDelegate,
} from '@expo/config-plugins';

/**
 * Plugin 配置选项
 */
export interface AlipayPluginProps {
  /**
   * URL Scheme for iOS
   * @default "alipay"
   */
  scheme?: string;
}

/**
 * 添加 iOS Info.plist 配置
 */
const withAlipayIOS: ConfigPlugin<AlipayPluginProps> = (config, { scheme = 'alipay' }) => {
  return withInfoPlist(config, (config) => {
    const infoPlist = config.modResults;

    // 添加 URL Scheme
    if (!infoPlist.CFBundleURLTypes) {
      infoPlist.CFBundleURLTypes = [];
    }

    const alipayScheme = {
      CFBundleTypeRole: 'Editor',
      CFBundleURLName: 'alipay',
      CFBundleURLSchemes: [scheme],
    };

    const existingSchemeIndex = infoPlist.CFBundleURLTypes.findIndex(
      (type: any) => type.CFBundleURLName === 'alipay'
    );

    if (existingSchemeIndex !== -1) {
      infoPlist.CFBundleURLTypes[existingSchemeIndex] = alipayScheme;
    } else {
      infoPlist.CFBundleURLTypes.push(alipayScheme);
    }

    // 添加 LSApplicationQueriesSchemes
    if (!infoPlist.LSApplicationQueriesSchemes) {
      infoPlist.LSApplicationQueriesSchemes = [];
    }

    if (!infoPlist.LSApplicationQueriesSchemes.includes('alipay')) {
      infoPlist.LSApplicationQueriesSchemes.push('alipay');
    }

    if (!infoPlist.LSApplicationQueriesSchemes.includes('alipays')) {
      infoPlist.LSApplicationQueriesSchemes.push('alipays');
    }

    return config;
  });
};

/**
 * 添加 iOS AppDelegate 配置
 */
const withAlipayAppDelegate: ConfigPlugin = (config) => {
  return withAppDelegate(config, (config) => {
    const appDelegate = config.modResults;
    let contents = appDelegate.contents;

    // 检测是否是 Swift 文件
    const isSwift = appDelegate.language === 'swift' || contents.includes('import UIKit');

    if (isSwift) {
      // Swift 文件处理
      // 1. 添加 AlipaySDK 导入
      if (!contents.includes('import AlipaySDK')) {
        // 在其他 import 后添加
        const importMatch = contents.match(/import\s+\w+/);
        if (importMatch) {
          const firstImport = importMatch[0];
          contents = contents.replace(firstImport, `${firstImport}\nimport AlipaySDK`);
        }
      }

      // 2. 在现有的 application:open:options: 方法中添加支付宝处理
      const openURLPattern =
        /public override func application\(\s*_\s+app:\s+UIApplication,\s*open\s+url:\s+URL,\s*options:[^{]+\{([^}]*return[^}]*)\}/s;

      if (openURLPattern.test(contents)) {
        // 方法已存在，在 return 语句前添加支付宝处理
        contents = contents.replace(openURLPattern, (match) => {
          if (match.includes('AlipaySDK.defaultService')) {
            return match; // 已经添加过了
          }
          const alipayCode = `
    // 处理支付宝回调
    if url.host == "safepay" {
      AlipaySDK.defaultService()?.processOrder(withPaymentResult: url, standbyCallback: { resultDic in
        // 支付结果处理已在模块内部完成
      })
      return true
    }
`;
          return match.replace(
            /return\s+super\.application/,
            `${alipayCode}\n    return super.application`
          );
        });
      }
    } else {
      // Objective-C 文件处理
      // 1. 添加 AlipaySDK 导入
      if (!contents.includes('#import <AlipaySDK/AlipaySDK.h>')) {
        const importMatch = contents.match(/#import\s+["<][^">]+[">]/);
        if (importMatch) {
          const firstImport = importMatch[0];
          contents = contents.replace(
            firstImport,
            `${firstImport}\n#import <AlipaySDK/AlipaySDK.h>`
          );
        }
      }

      // 2. 处理 openURL 方法
      const objcOpenURLPattern =
        /-\s*\(BOOL\)\s*application:\s*\(UIApplication\s*\*\)\s*application\s+openURL:\s*\(NSURL\s*\*\)\s*url\s+options:[^{]+\{[^}]*\}/s;

      if (objcOpenURLPattern.test(contents)) {
        // 方法已存在，在 return 前添加
        contents = contents.replace(objcOpenURLPattern, (match) => {
          if (match.includes('AlipaySDK defaultService')) {
            return match;
          }
          const alipayCode = `
  if ([url.host isEqualToString:@"safepay"]) {
    [[AlipaySDK defaultService] processOrderWithPaymentResult:url standbyCallback:^(NSDictionary *resultDic) {
      // 支付结果处理已在模块内部完成
    }];
    return YES;
  }
`;
          return match.replace(/return\s+/, `${alipayCode}\n  return `);
        });
      } else {
        // 方法不存在，添加新方法
        const openURLMethod = `
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  if ([url.host isEqualToString:@"safepay"]) {
    [[AlipaySDK defaultService] processOrderWithPaymentResult:url standbyCallback:^(NSDictionary *resultDic) {
      // 支付结果处理已在模块内部完成
    }];
    return YES;
  }
  return [super application:application openURL:url options:options];
}
`;
        const lastEndMatch = contents.lastIndexOf('@end');
        if (lastEndMatch !== -1) {
          contents =
            contents.slice(0, lastEndMatch) + openURLMethod + '\n' + contents.slice(lastEndMatch);
        }
      }
    }

    appDelegate.contents = contents;
    return config;
  });
};

/**
 * 添加 Android Manifest 配置
 */
const withAlipayAndroid: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;
    if (!androidManifest.queries || androidManifest.queries.length === 0) {
      androidManifest.queries = [{ package: [] }];
    }

    const queries = androidManifest.queries[0];
    if (!queries.package) {
      queries.package = [];
    }

    // Android 11+ 需要在 queries 中声明目标包，否则无法通过 PackageManager 检测安装状态。
    const packageNames = ['com.eg.android.AlipayGphone', 'com.eg.android.AlipayGphoneRC'];
    for (const packageName of packageNames) {
      // 保持插件幂等，多次执行 prebuild 时不重复添加包名。
      const exists = queries.package.some(
        (pkg: any) => pkg.$?.['android:name'] === packageName
      );
      if (!exists) {
        queries.package.push({ $: { 'android:name': packageName } });
      }
    }

    return config;
  });
};

/**
 * Expo Config Plugin for Alipay
 */
const withAlipay: ConfigPlugin<AlipayPluginProps> = (config, props = {}) => {
  const { scheme = 'alipay' } = props;

  config = withAlipayIOS(config, { scheme });
  config = withAlipayAppDelegate(config);
  config = withAlipayAndroid(config);

  return config;
};

export default withAlipay;
