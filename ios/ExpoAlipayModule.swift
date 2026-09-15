import ExpoModulesCore
import AlipaySDK

public class ExpoAlipayModule: Module {
  private var alipayScheme: String = ""
  private var appId: String = ""
  
  private func log(_ message: String) {
    NSLog("[ExpoAlipay] %@", message)
  }
  
  public func definition() -> ModuleDefinition {
    Name("ExpoAlipay")

    // 支付结果事件，用于H5支付回调
    Events("onH5PayResult")

    Function("setAlipayScheme") { (scheme: String) in
      self.alipayScheme = scheme
    }

    Function("setAppId") { (appId: String) in
      self.appId = appId
    }

    // iOS AlipaySDK 无沙箱切换接口，保留方法仅为与 Android 端 API 对齐，no-op。
    Function("setSandboxEnabled") { (_ enabled: Bool) in
      self.log("setSandboxEnabled called but iOS AlipaySDK has no sandbox switch, ignored")
    }

    AsyncFunction("pay") { (orderString: String, promise: Promise) in
      self.log("Starting payment with scheme: \(self.alipayScheme)")
      
      DispatchQueue.main.async {
        AlipaySDK.defaultService()?.payOrder(orderString, fromScheme: self.alipayScheme) { result in
          self.log("Payment result received: \(String(describing: result))")
          
          guard let result = result as? [String: Any] else {
            self.log("ERROR: Invalid payment result type")
            promise.reject("E_ALIPAY_ERROR", "Invalid result from Alipay")
            return
          }
          
          var resultMap: [String: Any] = [:]
          resultMap["resultStatus"] = result["resultStatus"] ?? ""
          resultMap["result"] = result["result"] ?? ""
          resultMap["memo"] = result["memo"] ?? ""
          
          self.log("Resolving payment promise with: \(resultMap)")
          promise.resolve(resultMap)
        }
      }
    }

    AsyncFunction("auth") { (authInfo: String, promise: Promise) in
      self.log("Starting auth with scheme: \(self.alipayScheme)")
      
      DispatchQueue.main.async {
        AlipaySDK.defaultService()?.auth_V2(withInfo: authInfo, fromScheme: self.alipayScheme) { result in
          self.log("Auth result received: \(String(describing: result))")
          
          guard let result = result as? [String: Any] else {
            self.log("ERROR: Invalid auth result type")
            promise.reject("E_ALIPAY_ERROR", "Invalid result from Alipay")
            return
          }
          
          var resultMap: [String: Any] = [:]
          resultMap["resultStatus"] = result["resultStatus"] ?? ""
          resultMap["result"] = result["result"] ?? ""
          resultMap["memo"] = result["memo"] ?? ""
          resultMap["resultCode"] = result["resultCode"] ?? ""
          resultMap["authCode"] = result["authCode"] ?? ""
          resultMap["alipayOpenId"] = result["alipayOpenId"] ?? ""
          
          self.log("Resolving auth promise with: \(resultMap)")
          promise.resolve(resultMap)
        }
      }
    }

    Function("payInterceptorWithUrl") { (url: String) -> Bool in
      self.log("Starting H5 payment with scheme: \(self.alipayScheme)")
      
      // 使用payInterceptor方法处理手机网站转APP支付（官方API）
      let isIntercepted = AlipaySDK.defaultService()?.payInterceptor(withUrl: url, fromScheme: self.alipayScheme) { result in
        self.log("H5 Payment callback - result: \(String(describing: result))")
        
        var resultMap: [String: Any] = [:]
        
        if let result = result as? [String: Any] {
          resultMap["resultStatus"] = result["resultStatus"] ?? ""
          resultMap["result"] = result["result"] ?? ""
          resultMap["memo"] = result["memo"] ?? ""
          
          // returnUrl: 支付完成后需要WebView加载的URL
          // 参考官方示例：if(!TextUtils.isEmpty(url)) { view.loadUrl(url); }
          if let returnUrl = result["returnUrl"] as? String, !returnUrl.isEmpty {
            resultMap["returnUrl"] = returnUrl
            self.log("Payment completed, should load returnUrl: \(returnUrl)")
          }
        } else {
          self.log("ERROR: Invalid H5 payment result type")
          resultMap["resultStatus"] = "error"
          resultMap["memo"] = "Payment result is null"
        }
        
        // 通过事件发送支付结果
        self.log("Sending H5 payment result event: \(resultMap)")
        self.sendEvent("onH5PayResult", resultMap)
      }
      
      let intercepted = isIntercepted ?? false
      self.log("H5 Payment URL intercepted: \(intercepted)")
      
      return intercepted
    }

    AsyncFunction("isAlipayInstalled") { (promise: Promise) in
      let isInstalled = UIApplication.shared.canOpenURL(URL(string: "alipay://")!)
      promise.resolve(isInstalled)
    }
  }
}
