package com.mshell.mobile;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "MshellSecurity")
public class SecurityBridge extends Plugin {
    private static final int AUTHENTICATORS =
        BiometricManager.Authenticators.BIOMETRIC_STRONG |
        BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    @PluginMethod
    public void isBiometricAvailable(PluginCall call) {
        BiometricManager manager = BiometricManager.from(getContext());
        int result = manager.canAuthenticate(AUTHENTICATORS);
        JSObject response = new JSObject().put("available", result == BiometricManager.BIOMETRIC_SUCCESS);
        if (result != BiometricManager.BIOMETRIC_SUCCESS) {
            response.put("error", availabilityMessage(result));
        }
        call.resolve(response);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Executor executor = ContextCompat.getMainExecutor(getContext());
            BiometricPrompt prompt = new BiometricPrompt(
                getActivity(),
                executor,
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(
                        @NonNull BiometricPrompt.AuthenticationResult result
                    ) {
                        call.resolve(new JSObject().put("success", true));
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        call.resolve(
                            new JSObject()
                                .put("success", false)
                                .put("error", errString.toString())
                        );
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        call.resolve(
                            new JSObject()
                                .put("success", false)
                                .put("error", "身份验证失败")
                        );
                    }
                }
            );

            BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(call.getString("title", "解锁 MShell"))
                .setSubtitle(call.getString("subtitle", "使用系统指纹或设备凭据验证身份"))
                .setAllowedAuthenticators(AUTHENTICATORS)
                .build();

            prompt.authenticate(promptInfo);
        });
    }

    private String availabilityMessage(int result) {
        switch (result) {
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                return "设备没有生物识别硬件";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                return "生物识别硬件暂不可用";
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                return "系统没有录入指纹或设备凭据";
            case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                return "系统需要安全更新后才能使用生物识别";
            case BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED:
                return "当前设备不支持该认证方式";
            case BiometricManager.BIOMETRIC_STATUS_UNKNOWN:
            default:
                return "无法确认生物识别状态";
        }
    }
}
