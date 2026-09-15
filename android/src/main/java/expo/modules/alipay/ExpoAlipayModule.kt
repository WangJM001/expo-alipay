package expo.modules.alipay

import android.app.Activity
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.text.TextUtils
import android.util.Log
import com.alipay.sdk.app.PayTask
import com.alipay.sdk.app.AuthTask
import com.alipay.sdk.app.EnvUtils
import com.alipay.sdk.app.H5PayCallback
import com.alipay.sdk.util.H5PayResultModel
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.util.concurrent.Executors

class ExpoAlipayModule : Module() {
  private val executor = Executors.newSingleThreadExecutor()
  private val mainHandler = Handler(Looper.getMainLooper())
  private var appId: String? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoAlipay")

    // 支付结果事件，用于H5支付回调
    Events("onH5PayResult")

    Function("setAlipayScheme") { scheme: String ->
      // Android 不需要设置 scheme，但保留此方法以保持API一致性
      Log.d("ExpoAlipay", "setAlipayScheme called (Android doesn't require scheme)")
    }

    Function("setAppId") { appId: String ->
      this@ExpoAlipayModule.appId = appId
      Log.d("ExpoAlipay", "App ID set: $appId")
    }

    // 沙箱/生产环境切换，必须在 pay()/auth() 之前调用，否则默认使用生产环境。
    Function("setSandboxEnabled") { enabled: Boolean ->
      EnvUtils.setEnv(if (enabled) EnvUtils.EnvEnum.SANDBOX else EnvUtils.EnvEnum.ONLINE)
      Log.d("ExpoAlipay", "Alipay env set: ${if (enabled) "SANDBOX" else "ONLINE"}")
    }

    AsyncFunction("pay") { orderString: String, promise: Promise ->
      val activity = appContext.activityProvider?.currentActivity
      if (activity == null) {
        promise.reject("E_ACTIVITY_DOES_NOT_EXIST", "Activity doesn't exist", null)
        return@AsyncFunction
      }

      executor.execute {
        try {
          val payTask = PayTask(activity)
          // payV2 必须在子线程中调用，第二个参数 true 表示显示加载框
          val result: Map<String, String> = payTask.payV2(orderString, true)
          
          Log.i("ExpoAlipay", "Payment result: $result")
          
          mainHandler.post {
            // 将 Map<String, String> 转换为适合 Promise 的格式
            val resultMap = mutableMapOf<String, Any?>()
            resultMap["resultStatus"] = result["resultStatus"] ?: ""
            resultMap["result"] = result["result"] ?: ""
            resultMap["memo"] = result["memo"] ?: ""
            
            Log.i("ExpoAlipay", "Resolving payment promise with: $resultMap")
            promise.resolve(resultMap)
          }
        } catch (e: Exception) {
          Log.e("ExpoAlipay", "Payment error: ${e.message}", e)
          mainHandler.post {
            promise.reject("E_ALIPAY_ERROR", e.message ?: "Payment failed", e)
          }
        }
      }
    }

    AsyncFunction("auth") { authInfo: String, promise: Promise ->
      val activity = appContext.activityProvider?.currentActivity
      if (activity == null) {
        promise.reject("E_ACTIVITY_DOES_NOT_EXIST", "Activity doesn't exist", null)
        return@AsyncFunction
      }

      executor.execute {
        try {
          val authTask = AuthTask(activity)
          // authV2 必须在子线程中调用，第二个参数 true 表示显示加载框
          val result: Map<String, String> = authTask.authV2(authInfo, true)
          
          Log.i("ExpoAlipay", "Auth result: $result")
          
          mainHandler.post {
            // 将 Map<String, String> 转换为适合 Promise 的格式
            val resultMap = mutableMapOf<String, Any?>()
            resultMap["resultStatus"] = result["resultStatus"] ?: ""
            resultMap["result"] = result["result"] ?: ""
            resultMap["memo"] = result["memo"] ?: ""
            resultMap["resultCode"] = result["resultCode"] ?: ""
            resultMap["authCode"] = result["authCode"] ?: ""
            resultMap["alipayOpenId"] = result["alipayOpenId"] ?: ""
            
            Log.i("ExpoAlipay", "Resolving auth promise with: $resultMap")
            promise.resolve(resultMap)
          }
        } catch (e: Exception) {
          Log.e("ExpoAlipay", "Auth error: ${e.message}", e)
          mainHandler.post {
            promise.reject("E_ALIPAY_ERROR", e.message ?: "Auth failed", e)
          }
        }
      }
    }

    Function("payInterceptorWithUrl") { url: String ->
      val activity = appContext.activityProvider?.currentActivity
      if (activity == null) {
        Log.e("ExpoAlipay", "Activity doesn't exist")
        return@Function false
      }

      try {
        val payTask = PayTask(activity)
        
        /**
         * 推荐采用的新的二合一接口(payInterceptorWithUrl)，只需调用一次
         * 参考官方WebViewClient实现
         */
        val isIntercepted = payTask.payInterceptorWithUrl(
          url,
          true,  // 显示loading
          object : H5PayCallback {
            override fun onPayResult(result: H5PayResultModel?) {
              Log.i("ExpoAlipay", "H5 Payment callback - resultCode: ${result?.resultCode}, returnUrl: ${result?.returnUrl}")
              
              val resultMap = mutableMapOf<String, Any?>()
              
              if (result != null) {
                // resultCode: 9000-成功, 8000-处理中, 4000-失败, 6001-取消, 6002-网络错误
                resultMap["resultStatus"] = result.resultCode ?: ""
                resultMap["memo"] = result.resultCode ?: ""
                
                // returnUrl: 支付完成后需要WebView加载的URL
                // 参考官方示例：if(!TextUtils.isEmpty(url)) { view.loadUrl(url); }
                val returnUrl = result.returnUrl
                if (!TextUtils.isEmpty(returnUrl)) {
                  resultMap["returnUrl"] = returnUrl
                  Log.i("ExpoAlipay", "Payment completed, should load returnUrl: $returnUrl")
                }
              } else {
                resultMap["resultStatus"] = "error"
                resultMap["memo"] = "Payment result is null"
              }
              
              // 通过事件发送支付结果
              Log.i("ExpoAlipay", "Sending H5 payment result event: $resultMap")
              sendEvent("onH5PayResult", resultMap)
            }
          }
        )
        
        Log.i("ExpoAlipay", "H5 Payment URL intercepted: $isIntercepted")
        
        return@Function isIntercepted
      } catch (e: Exception) {
        Log.e("ExpoAlipay", "H5 Payment error: ${e.message}", e)
        return@Function false
      }
    }

    AsyncFunction("isAlipayInstalled") { promise: Promise ->
      try {
        val context = appContext.reactContext
        val packageManager = context?.packageManager
        var isInstalled = false
        
        try {
          packageManager?.getPackageInfo("com.eg.android.AlipayGphone", 0)
          isInstalled = true
        } catch (e: Exception) {
          isInstalled = false
        }
        
        promise.resolve(isInstalled)
      } catch (e: Exception) {
        promise.reject("E_ALIPAY_ERROR", e.message, e)
      }
    }
  }
}
